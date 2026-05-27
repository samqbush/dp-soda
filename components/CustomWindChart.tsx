import React, { useMemo } from 'react';
import { View, ScrollView, Dimensions, StyleSheet, PixelRatio } from 'react-native';
import Svg, { Line, Circle, Text, Path } from 'react-native-svg';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { AlarmCriteria, WindDataPoint } from '@/services/windService';
import { filterWindDataByTimeWindow, type TimeWindow } from '@/utils/timeWindowUtils';
import { assessWindDirection } from '@/utils/windDirectionUtils';

interface CustomWindChartProps {
  data: WindDataPoint[];
  title?: string;
  highlightGoodPoints?: boolean;
  criteria?: AlarmCriteria;
  timeWindow?: TimeWindow;
  idealWindSpeed?: number;
  showIdealLine?: boolean;
  idealWindDirection?: {
    range: { min: number; max: number };
    perfect: number;
    perfectTolerance?: number;
  };
}

export function CustomWindChart({ 
  data, 
  title = 'Wind Speed Trend', 
  highlightGoodPoints = false, 
  criteria, 
  timeWindow, 
  idealWindSpeed = 15, 
  showIdealLine = true,
  idealWindDirection
}: CustomWindChartProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

  // Font scale detection for responsive layout
  const fontScale = PixelRatio.getFontScale();

  // Filter data based on time window
  const recentData = useMemo(() => {
    if (!data || data.length < 2) return [];
    
    const defaultWindow: TimeWindow = { startHour: 3, endHour: 5 };
    const activeWindow = timeWindow || defaultWindow;
    
    let filtered: WindDataPoint[];
    if (timeWindow) {
      filtered = filterWindDataByTimeWindow(data, activeWindow);
    } else {
      filtered = data.filter(point => {
        const date = new Date(point.time);
        const hours = date.getHours();
        return hours >= activeWindow.startHour && hours <= activeWindow.endHour;
      }).slice(-48);
    }
    return filtered;
  }, [data, timeWindow]);

  // Memoize all expensive SVG calculations
  const chartCalcs = useMemo(() => {
    if (recentData.length < 2) return null;

    // Chart dimensions with responsive Y-axis width
    const screenWidth = Dimensions.get('window').width;
    const _chartHeight = 360;
    
    const baseYAxisWidth = 50;
    const _yAxisWidth = Math.max(baseYAxisWidth, baseYAxisWidth * fontScale * 1.2);
    
    const _padding = { top: 20, bottom: 60, left: _yAxisWidth, right: 20 };
    
    // Calculate chart width based on time span for proper label spacing
    const timeSpanMs = new Date(recentData[recentData.length - 1].time).getTime() - new Date(recentData[0].time).getTime();
    const timeSpanHours = timeSpanMs / (1000 * 60 * 60);
    
    const minChartWidth = screenWidth - 32;
    let targetLabels: number;
    let pixelsPerLabel: number;
    
    if (timeSpanHours <= 1) {
      targetLabels = 4;
      pixelsPerLabel = 90;
    } else if (timeSpanHours <= 3) {
      targetLabels = 6;
      pixelsPerLabel = 80;
    } else {
      targetLabels = Math.min(8, Math.ceil(timeSpanHours));
      pixelsPerLabel = 70;
    }
    
    const _chartWidth = Math.max(minChartWidth, targetLabels * pixelsPerLabel);
    const _plotWidth = _chartWidth - _padding.left - _padding.right;
    const _plotHeight = _chartHeight - _padding.top - _padding.bottom;

    // Process data and get values
    const _speeds = recentData.map(point => {
      const speed = typeof point.windSpeed === 'string' ? parseFloat(point.windSpeed) : point.windSpeed;
      return isNaN(speed) ? 0 : Math.max(0, speed);
    });
    
    const _gusts = recentData.map(point => {
      const gust = typeof point.windGust === 'string' ? parseFloat(point.windGust) : point.windGust;
      return isNaN(gust) ? 0 : Math.max(0, gust);
    });

    // Calculate scale
    const maxValue = Math.max(..._speeds, ..._gusts, idealWindSpeed);
    const _yMax = Math.ceil(maxValue / 5) * 5;
    const _yScale = _plotHeight / _yMax;
    const _xScale = _plotWidth / (recentData.length - 1);

    // Format time labels
    const formatTimeLabel = (time: Date) => {
      const hour = time.getHours();
      const minute = time.getMinutes();
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      if (minute === 0) {
        return `${displayHour}${ampm}`;
      }
      return '';
    };

    // Generate label positions with smart spacing
    const minLabelSpacing = 60;
    const allPotentialLabels = recentData
      .map((point, index) => {
        const time = new Date(point.time);
        const label = formatTimeLabel(time);
        return {
          x: _padding.left + index * _xScale,
          y: _chartHeight - _padding.bottom + 20,
          label: label || time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          index,
          isHourMark: time.getMinutes() === 0 && label !== ''
        };
      });

    // Smart label selection
    const _labelData: {x: number, y: number, label: string, index: number}[] = [];
    
    allPotentialLabels.forEach((potential, i) => {
      if (i === 0) {
        _labelData.push(potential);
        return;
      }
      if (potential.isHourMark) {
        const lastLabel = _labelData[_labelData.length - 1];
        if (potential.x - lastLabel.x >= minLabelSpacing) {
          _labelData.push(potential);
          return;
        }
      }
      if (i === allPotentialLabels.length - 1) {
        const lastLabel = _labelData[_labelData.length - 1];
        if (potential.x - lastLabel.x >= minLabelSpacing && !potential.isHourMark) {
          _labelData.push(potential);
        }
      }
    });

    // Helper function to create wind direction arrow path
    const createArrowPath = (centerX: number, centerY: number, direction: number, size = 8): string => {
      const windGoesDirection = (direction + 180) % 360;
      const screenAngle = (90 - windGoesDirection) * Math.PI / 180;
      
      const cos = Math.cos(screenAngle);
      const sin = Math.sin(screenAngle);
      
      const tipX = centerX + cos * size;
      const tipY = centerY - sin * size;
      
      const leftX = centerX + cos * (-size * 0.6) + sin * (size * 0.4);
      const leftY = centerY - sin * (-size * 0.6) + cos * (size * 0.4);
      
      const rightX = centerX + cos * (-size * 0.6) + sin * (-size * 0.4);
      const rightY = centerY - sin * (-size * 0.6) + cos * (-size * 0.4);
      
      return `M ${tipX} ${tipY} L ${leftX} ${leftY} M ${tipX} ${tipY} L ${rightX} ${rightY}`;
    };

    // Process wind direction data and calculate arrows
    const _windArrows = recentData
      .map((point, index) => {
        const direction = typeof point.windDirection === 'string' ? parseFloat(point.windDirection) : point.windDirection;
        if (isNaN(direction) || index % 3 !== 0) return null;
        
        const x = _padding.left + index * _xScale;
        const speed = _speeds[index];
        const y = Math.max(_padding.top + (_yMax - speed) * _yScale - 20, _padding.top + 10);
        
        return {
          x,
          y,
          direction,
          index,
          arrowPath: createArrowPath(x, y, direction)
        };
      })
      .filter(Boolean) as {x: number, y: number, direction: number, index: number, arrowPath: string}[];

    // Helper function to detect significant time gaps
    const hasSignificantGap = (currentTime: string, nextTime: string): boolean => {
      const current = new Date(currentTime).getTime();
      const next = new Date(nextTime).getTime();
      const gapMs = next - current;
      const gapHours = gapMs / (1000 * 60 * 60);
      return gapHours > 1;
    };

    // Generate path segments for wind speed line (breaking on gaps)
    const _windPathSegments: string[] = [];
    let currentSegment = '';
    
    _speeds.forEach((speed, index) => {
      const x = _padding.left + index * _xScale;
      const y = _padding.top + (_yMax - speed) * _yScale;
      
      if (index === 0) {
        currentSegment = `M ${x} ${y}`;
      } else {
        if (hasSignificantGap(recentData[index - 1].time, recentData[index].time)) {
          if (currentSegment) {
            _windPathSegments.push(currentSegment);
          }
          currentSegment = `M ${x} ${y}`;
        } else {
          currentSegment += ` L ${x} ${y}`;
        }
      }
      
      if (index === _speeds.length - 1 && currentSegment) {
        _windPathSegments.push(currentSegment);
      }
    });

    // Generate path segments for wind gust area (breaking on gaps)
    const _gustPathSegments: string[] = [];
    let currentGustSegment = '';
    
    _gusts.forEach((gust, index) => {
      const x = _padding.left + index * _xScale;
      const y = _padding.top + (_yMax - gust) * _yScale;
      const baseY = _padding.top + _plotHeight;
      
      if (index === 0) {
        currentGustSegment = `M ${x} ${baseY} L ${x} ${y}`;
      } else {
        if (hasSignificantGap(recentData[index - 1].time, recentData[index].time)) {
          if (currentGustSegment) {
            const prevX = _padding.left + (index - 1) * _xScale;
            currentGustSegment += ` L ${prevX} ${baseY} Z`;
            _gustPathSegments.push(currentGustSegment);
          }
          currentGustSegment = `M ${x} ${baseY} L ${x} ${y}`;
        } else {
          currentGustSegment += ` L ${x} ${y}`;
        }
      }
      
      if (index === _gusts.length - 1 && currentGustSegment) {
        currentGustSegment += ` L ${x} ${baseY} Z`;
        _gustPathSegments.push(currentGustSegment);
      }
    });

    // Y-axis labels
    const _yLabels = [];
    for (let i = 0; i <= _yMax; i += 5) {
      _yLabels.push({
        value: i,
        y: _padding.top + (_yMax - i) * _yScale
      });
    }

    return {
      chartWidth: _chartWidth,
      chartHeight: _chartHeight,
      yAxisWidth: _yAxisWidth,
      padding: _padding,
      yMax: _yMax,
      yScale: _yScale,
      xScale: _xScale,
      speeds: _speeds,
      labelData: _labelData,
      windArrows: _windArrows,
      windPathSegments: _windPathSegments,
      gustPathSegments: _gustPathSegments,
      yLabels: _yLabels,
    };
  }, [recentData, fontScale, idealWindSpeed]);

  if (!data || data.length < 2) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            📊 No wind data available to display chart
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!chartCalcs) {
    const defaultWindow: TimeWindow = { startHour: 3, endHour: 5 };
    const activeWindow = timeWindow || defaultWindow;
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            📊 No data available for {activeWindow.startHour}am-{activeWindow.endHour > 12 ? `${activeWindow.endHour - 12}pm` : `${activeWindow.endHour}am`} window
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const {
    chartWidth,
    chartHeight,
    yAxisWidth,
    padding,
    yMax,
    yScale,
    xScale,
    speeds,
    labelData,
    windArrows,
    windPathSegments,
    gustPathSegments,
    yLabels,
  } = chartCalcs;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      
      <View style={styles.chartWrapper}>
        {/* Fixed Y-axis labels */}
        <View style={[styles.yAxisContainer, { height: chartHeight, width: yAxisWidth }]}>
          {yLabels.map((label, index) => (
            <View
              key={`y-label-${index}`}
              style={[
                styles.yLabel,
                { 
                  top: label.y - 8 * fontScale, // Center text on grid line, adjusted for font scale
                }
              ]}
            >
              <ThemedText style={[styles.yLabelText, { 
                fontSize: Math.min(14 / fontScale, 14), // Scale down text when font scale is large
                lineHeight: Math.min(18 / fontScale, 18) * fontScale // Ensure proper line height
              }]}>
                {label.value}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Scrollable chart area */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.chartScrollView}
        >
          <View style={[styles.chartContainer, { width: chartWidth }]}>
            <Svg width={chartWidth} height={chartHeight}>
              {/* Grid lines */}
              {yLabels.map((label, index) => (
                <Line
                  key={`grid-${index}`}
                  x1={padding.left}
                  y1={label.y}
                  x2={chartWidth - padding.right}
                  y2={label.y}
                  stroke={textColor}
                  strokeWidth={0.5}
                  opacity={0.3}
                />
              ))}

              {/* Ideal wind speed line */}
              {showIdealLine && (
                <Line
                  x1={padding.left}
                  y1={padding.top + (yMax - idealWindSpeed) * yScale}
                  x2={chartWidth - padding.right}
                  y2={padding.top + (yMax - idealWindSpeed) * yScale}
                  stroke="#FF9500"
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  opacity={0.8}
                />
              )}

              {/* Wind gust area segments */}
              {gustPathSegments.map((pathSegment, segmentIndex) => (
                <Path
                  key={`gust-segment-${segmentIndex}`}
                  d={pathSegment}
                  fill="#FF6B6B"
                  fillOpacity={0.2}
                  stroke="#FF6B6B"
                  strokeWidth={1}
                />
              ))}

              {/* Wind speed line segments */}
              {windPathSegments.map((pathSegment, segmentIndex) => (
                <Path
                  key={`wind-segment-${segmentIndex}`}
                  d={pathSegment}
                  fill="none"
                  stroke={tintColor}
                  strokeWidth={3}
                />
              ))}

              {/* Wind speed data points */}
              {speeds.map((speed, index) => (
                <Circle
                  key={`point-${index}`}
                  cx={padding.left + index * xScale}
                  cy={padding.top + (yMax - speed) * yScale}
                  r={3}
                  fill={tintColor}
                  stroke={backgroundColor}
                  strokeWidth={1}
                />
              ))}

              {/* Wind direction arrows */}
              {windArrows.map((arrow, index) => {
                // Determine arrow color based on ideal wind direction
                let arrowColor = textColor;
                let opacity = 0.7;
                
                if (idealWindDirection && arrow) {
                  const windStatus = assessWindDirection(arrow.direction, idealWindDirection);
                  if (windStatus === 'perfect') {
                    arrowColor = '#FFD700';
                    opacity = 0.9;
                  } else if (windStatus === 'good') {
                    arrowColor = '#4CAF50';
                    opacity = 0.8;
                  }
                }
                
                return (
                  <Path
                    key={`arrow-${index}`}
                    d={arrow.arrowPath}
                    stroke={arrowColor}
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="none"
                    opacity={opacity}
                  />
                );
              })}

              {/* X-axis labels - Major labels (hours only) */}
              {labelData.map((label, index) => (
                <Text
                  key={`x-label-${index}`}
                  x={label!.x}
                  y={label!.y}
                  fontSize={14}
                  fill={textColor}
                  textAnchor="middle"
                  fontWeight="bold"
                >
                  {label!.label}
                </Text>
              ))}

              {/* Hierarchical tick marks - Tape measure style 
                  📏 Major ticks (16px): Hour marks (0 min) - with labels
                  📐 Medium ticks (12px): Half-hour marks (30 min)
                  📌 Minor ticks (8px): Quarter-hour marks (15, 45 min) */}
              {recentData.map((point, index) => {
                const time = new Date(point.time);
                const minute = time.getMinutes();
                const x = padding.left + index * xScale;
                const baseY = chartHeight - padding.bottom;
                
                // Major ticks: Hour marks (biggest) - 16px tall
                if (minute === 0) {
                  return (
                    <Line
                      key={`major-tick-${index}`}
                      x1={x}
                      y1={baseY}
                      x2={x}
                      y2={baseY + 16}
                      stroke={textColor}
                      strokeWidth={2}
                      opacity={0.8}
                    />
                  );
                }
                
                // Medium ticks: 30-minute marks - 12px tall  
                if (minute === 30) {
                  return (
                    <Line
                      key={`medium-tick-${index}`}
                      x1={x}
                      y1={baseY}
                      x2={x}
                      y2={baseY + 12}
                      stroke={textColor}
                      strokeWidth={1.5}
                      opacity={0.6}
                    />
                  );
                }
                
                // Minor ticks: 15 and 45-minute marks - 8px tall
                if (minute === 15 || minute === 45) {
                  return (
                    <Line
                      key={`minor-tick-${index}`}
                      x1={x}
                      y1={baseY}
                      x2={x}
                      y2={baseY + 8}
                      stroke={textColor}
                      strokeWidth={1}
                      opacity={0.4}
                    />
                  );
                }
                
                return null;
              }).filter(Boolean)}

              {/* Axes */}
              <Line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={chartHeight - padding.bottom}
                stroke={textColor}
                strokeWidth={1}
              />
              <Line
                x1={padding.left}
                y1={chartHeight - padding.bottom}
                x2={chartWidth - padding.right}
                y2={chartHeight - padding.bottom}
                stroke={textColor}
                strokeWidth={1}
              />
            </Svg>
          </View>
        </ScrollView>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: tintColor }]} />
          <ThemedText style={styles.legendText}>Wind Speed</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: '#FF6B6B' }]} />
          <ThemedText style={styles.legendText}>Gusts</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendArrow}>
            <Svg width={16} height={12}>
              <Path
                d="M 12 6 L 6 3 M 12 6 L 6 9"
                stroke={textColor}
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
                opacity={0.7}
              />
            </Svg>
          </View>
          <ThemedText style={styles.legendText}>Wind Direction</ThemedText>
        </View>
        {idealWindDirection && (
          <>
            <View style={styles.legendItem}>
              <View style={styles.legendArrow}>
                <Svg width={16} height={12}>
                  <Path
                    d="M 12 6 L 6 3 M 12 6 L 6 9"
                    stroke="#FFD700"
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.9}
                  />
                </Svg>
              </View>
              <ThemedText style={styles.legendText}>🎯 Perfect Direction</ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.legendArrow}>
                <Svg width={16} height={12}>
                  <Path
                    d="M 12 6 L 6 3 M 12 6 L 6 9"
                    stroke="#4CAF50"
                    strokeWidth={2}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.8}
                  />
                </Svg>
              </View>
              <ThemedText style={styles.legendText}>✅ Good Direction</ThemedText>
            </View>
          </>
        )}
        {showIdealLine && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDashed, { borderColor: '#FF9500' }]} />
            <ThemedText style={styles.legendText}>Your Wind Threshold ({idealWindSpeed}mph)</ThemedText>
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
  },
  noDataContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noDataText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 16,
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  yAxisContainer: {
    position: 'relative',
    paddingRight: 10,
  },
  yLabel: {
    position: 'absolute',
    right: 0,
    alignItems: 'flex-end',
  },
  yLabelText: {
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'right',
  },
  chartScrollView: {
    flex: 1,
  },
  chartContainer: {
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendLine: {
    width: 16,
    height: 3,
    marginRight: 6,
  },
  legendDashed: {
    width: 16,
    height: 2,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginRight: 6,
  },
  legendArrow: {
    width: 16,
    height: 12,
    marginRight: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    fontSize: 14,
    opacity: 0.8,
  },
});
