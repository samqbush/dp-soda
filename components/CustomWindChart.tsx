import React from 'react';
import { View, ScrollView, Dimensions, StyleSheet } from 'react-native';
import Svg, { Line, Circle, Text, Path } from 'react-native-svg';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { AlarmCriteria, WindDataPoint } from '@/services/windService';
import { filterWindDataByTimeWindow, type TimeWindow } from '@/utils/timeWindowUtils';

interface CustomWindChartProps {
  data: WindDataPoint[];
  title?: string;
  highlightGoodPoints?: boolean;
  criteria?: AlarmCriteria;
  timeWindow?: TimeWindow;
  idealWindSpeed?: number;
  showIdealLine?: boolean;
}

export function CustomWindChart({ 
  data, 
  title = 'Wind Speed Trend', 
  highlightGoodPoints = false, 
  criteria, 
  timeWindow, 
  idealWindSpeed = 15, 
  showIdealLine = true 
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

  // Calculate scale
  const maxValue = Math.max(...speeds, ...gusts, idealWindSpeed);
  const yMax = Math.ceil(maxValue / 5) * 5; // Round up to nearest 5
  const yScale = plotHeight / yMax;
  const xScale = plotWidth / (recentData.length - 1);

  // Format time labels with better control
  const formatTimeLabel = (time: Date, index: number) => {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    
    if (timeSpanHours <= 1) {
      // 1 hour or less: show every 15 minutes
      if (minute % 15 === 0) {
        return minute === 0 ? `${displayHour}${ampm}` : `${displayHour}:${minute.toString().padStart(2, '0')}`;
      }
    } else if (timeSpanHours <= 3) {
      // 1-3 hours: show every 30 minutes
      if (minute === 0 || minute === 30) {
        return minute === 0 ? `${displayHour}${ampm}` : `${displayHour}:30`;
      }
    } else {
      // 3+ hours: show every hour
      if (minute === 0) {
        return `${displayHour}${ampm}`;
      }
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
    // Convert meteorological direction (where wind comes from) to mathematical angle
    // Meteorological: 0° = North (wind from north), 90° = East (wind from east)
    // Mathematical: 0° = East, 90° = North
    // We need to rotate 90° and flip because arrows point TO direction wind goes
    const angleRad = ((direction + 180) * Math.PI) / 180; // +180 to show where wind goes, not where it comes from
    
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    // Arrow points: tip, left wing, right wing
    const tipX = centerX + cos * size;
    const tipY = centerY + sin * size;
    
    const leftX = centerX + cos * (-size * 0.6) + sin * (-size * 0.4);
    const leftY = centerY + sin * (-size * 0.6) - cos * (-size * 0.4);
    
    const rightX = centerX + cos * (-size * 0.6) + sin * (size * 0.4);
    const rightY = centerY + sin * (-size * 0.6) - cos * (size * 0.4);
    
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
              {windArrows.map((arrow, index) => (
                <Path
                  key={`arrow-${index}`}
                  d={createArrowPath(arrow!.x, arrow!.y, arrow!.direction)}
                  stroke={textColor}
                  strokeWidth={2}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.7}
                />
              ))}

              {/* X-axis labels */}
              {labelData.map((label, index) => (
                <Text
                  key={`x-label-${index}`}
                  x={label!.x}
                  y={label!.y}
                  fontSize={11}
                  fill={textColor}
                  textAnchor="middle"
                >
                  {label!.label}
                </Text>
              ))}

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
