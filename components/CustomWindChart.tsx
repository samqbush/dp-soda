import React from 'react';
import { View, ScrollView, Dimensions, StyleSheet } from 'react-native';
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

  // Filter data based on time window
  const defaultWindow: TimeWindow = { startHour: 3, endHour: 5 };
  const activeWindow = timeWindow || defaultWindow;
  
  let recentData: WindDataPoint[];
  if (timeWindow) {
    recentData = filterWindDataByTimeWindow(data, activeWindow);
  } else {
    recentData = data.filter(point => {
      const date = new Date(point.time);
      const hours = date.getHours();
      return hours >= activeWindow.startHour && hours <= activeWindow.endHour;
    }).slice(-48);
  }

  if (recentData.length < 2) {
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

  console.log('📊 Chart sizing data points:', recentData.length);

  // Chart dimensions
  const screenWidth = Dimensions.get('window').width;
  const chartHeight = 240;
  const padding = { top: 20, bottom: 60, left: 50, right: 20 };
  
  // Calculate chart width based on time span for proper label spacing
  const timeSpanMs = new Date(recentData[recentData.length - 1].time).getTime() - new Date(recentData[0].time).getTime();
  const timeSpanHours = timeSpanMs / (1000 * 60 * 60);
  
  // Dynamic width calculation for proper label spacing
  const minChartWidth = screenWidth - 32;
  let targetLabels: number;
  let pixelsPerLabel: number;
  
  if (timeSpanHours <= 1) {
    targetLabels = 4; // 15-min intervals
    pixelsPerLabel = 90;
  } else if (timeSpanHours <= 3) {
    targetLabels = 6; // 30-min intervals
    pixelsPerLabel = 80;
  } else {
    targetLabels = Math.min(8, Math.ceil(timeSpanHours)); // 1-hour intervals max
    pixelsPerLabel = 70;
  }
  
  const calculatedWidth = Math.max(minChartWidth, targetLabels * pixelsPerLabel);
  const chartWidth = calculatedWidth;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Process data and get values
  const speeds = recentData.map(point => {
    const speed = typeof point.windSpeed === 'string' ? parseFloat(point.windSpeed) : point.windSpeed;
    return isNaN(speed) ? 0 : Math.max(0, speed);
  });
  
  const gusts = recentData.map(point => {
    const gust = typeof point.windGust === 'string' ? parseFloat(point.windGust) : point.windGust;
    return isNaN(gust) ? 0 : Math.max(0, gust);
  });

  // Process wind direction data
  const directions = recentData.map(point => {
    const direction = typeof point.windDirection === 'string' ? parseFloat(point.windDirection) : point.windDirection;
    return isNaN(direction) ? null : direction;
  });

  console.log('🧭 Wind directions sample:', directions.slice(0, 5).map(d => d?.toFixed(0) + '°').join(', '));
  
  // Debug wind direction calculations for first few points
  directions.slice(0, 3).forEach((dir, idx) => {
    if (dir !== null) {
      const windGoesDirection = (dir + 180) % 360;
      console.log(`🧭 Point ${idx}: Wind from ${dir.toFixed(0)}° → Wind goes to ${windGoesDirection.toFixed(0)}°`);
    }
  });

  // Calculate scale
  const maxValue = Math.max(...speeds, ...gusts, idealWindSpeed);
  const yMax = Math.ceil(maxValue / 5) * 5; // Round up to nearest 5
  const yScale = plotHeight / yMax;
  const xScale = plotWidth / (recentData.length - 1);

  // Format time labels - Two-tier system: only show hour labels
  const formatTimeLabel = (time: Date, index: number) => {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

    // Only show hour labels (minute = 0) for cleaner display
    // The 30-minute marks will be shown as small tick marks below
    if (minute === 0) {
      return `${displayHour}${ampm}`;
    }
    return '';
  };

  // Generate label positions
  const labelData = recentData
    .map((point, index) => {
      const time = new Date(point.time);
      const label = formatTimeLabel(time, index);
      if (label) {
        return {
          x: padding.left + index * xScale,
          y: chartHeight - padding.bottom + 20,
          label,
          index
        };
      }
      return null;
    })
    .filter(Boolean);

  // Always include first and last labels if not already included
  if (labelData.length > 0) {
    const firstTime = new Date(recentData[0].time);
    const lastTime = new Date(recentData[recentData.length - 1].time);
    
    // Add first label if not present
    if (labelData[0]?.index !== 0) {
      const firstLabel = formatTimeLabel(firstTime, 0) || firstTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      labelData.unshift({
        x: padding.left,
        y: chartHeight - padding.bottom + 20,
        label: firstLabel,
        index: 0
      });
    }
    
    // Add last label if not present
    if (labelData[labelData.length - 1]?.index !== recentData.length - 1) {
      const lastLabel = formatTimeLabel(lastTime, recentData.length - 1) || lastTime.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      labelData.push({
        x: padding.left + (recentData.length - 1) * xScale,
        y: chartHeight - padding.bottom + 20,
        label: lastLabel,
        index: recentData.length - 1
      });
    }
  }

  console.log('📊 Chart labels:', labelData.map(l => l?.label).join(', '));

  // Helper function to create wind direction arrow path
  const createArrowPath = (centerX: number, centerY: number, direction: number, size = 8): string => {
    // Convert meteorological direction (where wind comes from) to screen coordinates
    // Meteorological: 0° = North (wind from north), 90° = East (wind from east), 180° = South, 270° = West
    // Screen coordinates: 0° = right, 90° = down, 180° = left, 270° = up
    // Arrow should point TO where wind is going (opposite of where it comes from)
    
    // Convert: meteorological direction → direction wind goes → screen angle
    const windGoesDirection = (direction + 180) % 360; // Where wind goes (opposite of where it comes from)
    const screenAngle = (90 - windGoesDirection) * Math.PI / 180; // Convert to screen coordinates (90° - angle because screen Y is inverted)
    
    const cos = Math.cos(screenAngle);
    const sin = Math.sin(screenAngle);
    
    // Arrow points: tip, left wing, right wing
    const tipX = centerX + cos * size;
    const tipY = centerY - sin * size; // Negative sin because screen Y is inverted
    
    const leftX = centerX + cos * (-size * 0.6) + sin * (size * 0.4);
    const leftY = centerY - sin * (-size * 0.6) + cos * (size * 0.4);
    
    const rightX = centerX + cos * (-size * 0.6) + sin * (-size * 0.4);
    const rightY = centerY - sin * (-size * 0.6) + cos * (-size * 0.4);
    
    return `M ${tipX} ${tipY} L ${leftX} ${leftY} M ${tipX} ${tipY} L ${rightX} ${rightY}`;
  };

  // Calculate wind direction arrow positions (show every 3rd point to avoid crowding)
  const windArrows = directions
    .map((direction, index) => {
      if (direction === null || index % 3 !== 0) return null; // Show every 3rd arrow
      
      const x = padding.left + index * xScale;
      const speed = speeds[index];
      const y = padding.top + (yMax - speed) * yScale - 20; // Position above the speed line
      
      return {
        x,
        y: Math.max(y, padding.top + 10), // Ensure arrows don't go above chart area
        direction,
        index
      };
    })
    .filter(Boolean);

  // Helper function to detect significant time gaps
  const hasSignificantGap = (currentTime: string, nextTime: string): boolean => {
    const current = new Date(currentTime).getTime();
    const next = new Date(nextTime).getTime();
    const gapMs = next - current;
    const gapHours = gapMs / (1000 * 60 * 60);
    return gapHours > 1; // Gap larger than 1 hour (more sensitive)
  };

  // Generate path segments for wind speed line (breaking on gaps)
  const windPathSegments: string[] = [];
  let currentSegment = '';
  
  speeds.forEach((speed, index) => {
    const x = padding.left + index * xScale;
    const y = padding.top + (yMax - speed) * yScale;
    
    if (index === 0) {
      currentSegment = `M ${x} ${y}`;
    } else {
      // Check for significant gap
      if (hasSignificantGap(recentData[index - 1].time, recentData[index].time)) {
        // End current segment and start new one
        if (currentSegment) {
          windPathSegments.push(currentSegment);
        }
        currentSegment = `M ${x} ${y}`;
      } else {
        currentSegment += ` L ${x} ${y}`;
      }
    }
    
    // Add the last segment
    if (index === speeds.length - 1 && currentSegment) {
      windPathSegments.push(currentSegment);
    }
  });

  // Generate path segments for wind gust area (breaking on gaps)
  const gustPathSegments: string[] = [];
  let currentGustSegment = '';
  
  gusts.forEach((gust, index) => {
    const x = padding.left + index * xScale;
    const y = padding.top + (yMax - gust) * yScale;
    const baseY = padding.top + plotHeight;
    
    if (index === 0) {
      currentGustSegment = `M ${x} ${baseY} L ${x} ${y}`;
    } else {
      // Check for significant gap
      if (hasSignificantGap(recentData[index - 1].time, recentData[index].time)) {
        // Close current segment
        if (currentGustSegment) {
          const prevX = padding.left + (index - 1) * xScale;
          currentGustSegment += ` L ${prevX} ${baseY} Z`;
          gustPathSegments.push(currentGustSegment);
        }
        // Start new segment
        currentGustSegment = `M ${x} ${baseY} L ${x} ${y}`;
      } else {
        currentGustSegment += ` L ${x} ${y}`;
      }
    }
    
    // Close the last segment
    if (index === gusts.length - 1 && currentGustSegment) {
      currentGustSegment += ` L ${x} ${baseY} Z`;
      gustPathSegments.push(currentGustSegment);
    }
  });

  // Y-axis labels
  const yLabels = [];
  for (let i = 0; i <= yMax; i += 5) {
    yLabels.push({
      value: i,
      y: padding.top + (yMax - i) * yScale
    });
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      
      <View style={styles.chartWrapper}>
        {/* Fixed Y-axis labels */}
        <View style={[styles.yAxisContainer, { height: chartHeight }]}>
          {yLabels.map((label, index) => (
            <View
              key={`y-label-${index}`}
              style={[
                styles.yLabel,
                { 
                  top: label.y - 8, // Center text on grid line
                }
              ]}
            >
              <ThemedText style={styles.yLabelText}>
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
                    arrowColor = '#FFD700'; // Gold for perfect
                    opacity = 0.9;
                  } else if (windStatus === 'good') {
                    arrowColor = '#4CAF50'; // Green for good
                    opacity = 0.8;
                  }
                }
                
                return (
                  <Path
                    key={`arrow-${index}`}
                    d={createArrowPath(arrow!.x, arrow!.y, arrow!.direction)}
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
                  fontSize={12}
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
    width: 50,
    position: 'relative',
    paddingRight: 10,
  },
  yLabel: {
    position: 'absolute',
    right: 0,
    alignItems: 'flex-end',
  },
  yLabelText: {
    fontSize: 12,
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
    fontSize: 12,
    opacity: 0.8,
  },
});
