import { DataCrashDetector } from '@/components/DataCrashDetector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { AlarmCriteria, WindDataPoint } from '@/services/windService';
import { filterWindDataByTimeWindow, type TimeWindow } from '@/utils/timeWindowUtils';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle, G, Line, Path, Text } from 'react-native-svg';

interface WindChartProps {
  data: WindDataPoint[];
  title?: string;
  highlightGoodPoints?: boolean; // New prop to highlight consecutive good points
  criteria?: AlarmCriteria; // Optional criteria for determining good points
  timeWindow?: TimeWindow; // Optional time window filter using new TimeWindow type
  idealWindSpeed?: number; // Optional reference line for ideal wind speed (default: 15 mph)
  showIdealLine?: boolean; // Whether to show the ideal wind speed reference line (default: true)
}

export function WindChart({ data, title = 'Wind Speed Trend', highlightGoodPoints = false, criteria, timeWindow, idealWindSpeed = 15, showIdealLine = true }: WindChartProps) {
  const handleChartCrash = (error: Error, info: any) => {
    console.error('🚨 WindChart crashed:', error);
    console.error('🚨 Chart data that caused crash:', data);
  };

  return (
    <DataCrashDetector componentName="WindChart" onCrash={handleChartCrash}>
      <WindChartContent data={data} title={title} highlightGoodPoints={highlightGoodPoints} criteria={criteria} timeWindow={timeWindow} idealWindSpeed={idealWindSpeed} showIdealLine={showIdealLine} />
    </DataCrashDetector>
  );
}

// Component for rendering fixed Y-axis labels
interface YAxisLabelsProps {
  maxSpeed: number;
  height: number;
  textColor: string;
}

const YAxisLabels = ({ maxSpeed, height, textColor }: YAxisLabelsProps) => {
  // Calculate the maximum Y value in increments of 5
  const maxYValue = Math.ceil(maxSpeed / 5) * 5;
  const labels = [];
  
  // Create labels from 0 to maxYValue in increments of 5
  for (let value = 0; value <= maxYValue; value += 5) {
    // Calculate position to match the chart's internal scaling
    // The chart scales from 0 to actual maxSpeed, so we need to position based on that
    const relativePosition = value / maxSpeed; // Use actual maxSpeed, not maxYValue
    const yPosition = height - 50 - (relativePosition * (height - 70)) - 6; // Align with chart grid
    
    labels.push(
      <View key={value} style={[styles.yAxisLabel, { position: 'absolute', top: yPosition }]}>
        <ThemedText style={[styles.yAxisLabelText, { color: textColor }]}>
          {value}
        </ThemedText>
      </View>
    );
  }
  
  return <View style={styles.yAxisLabels}>{labels}</View>;
};

// Helper function to render wind direction arrow
interface DirectionArrowProps {
  direction: string | number | null;
  x: number;
  y: number;
  size?: number;
  color?: string;
}

const DirectionArrow = ({ direction, x, y, size = 14, color = '#000' }: DirectionArrowProps) => {
  if (!direction || isNaN(parseFloat(String(direction)))) return null;
  
  // Convert direction from meteorological (where wind is coming from) to mathematical
  // Meteorological: 0° = North, 90° = East, 180° = South, 270° = West
  // We need to rotate 180° because arrows point where the wind is going to (opposite of where it's coming from)
  const directionRad = ((parseFloat(String(direction)) + 180) * Math.PI) / 180;
  
  // Calculate arrow points
  const headLength = size / 2;
  const x2 = x + Math.sin(directionRad) * size;
  const y2 = y - Math.cos(directionRad) * size;
  
  // Calculate arrow head points
  const angle1 = directionRad - Math.PI / 7;
  const angle2 = directionRad + Math.PI / 7;
  const head1x = x2 - headLength * Math.sin(angle1);
  const head1y = y2 + headLength * Math.cos(angle1);
  const head2x = x2 - headLength * Math.sin(angle2);
  const head2y = y2 + headLength * Math.cos(angle2);
  
  return (
    <G>
      <Path
        d={`M${x},${y} L${x2},${y2} M${x2},${y2} L${head1x},${head1y} M${x2},${y2} L${head2x},${head2y}`}
        stroke={color}
        strokeWidth={2}
        opacity={0.75}
      />
      <Circle cx={x} cy={y} r={3} fill={color} opacity={0.75} />
    </G>
  );
};

function WindChartContent({ data, title, highlightGoodPoints = false, criteria, timeWindow, idealWindSpeed = 15, showIdealLine = true }: WindChartProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const directionColor = '#4A90E2'; // Bright blue for better visibility of direction arrows

  if (!data || data.length < 2) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            📊 No wind data available to display chart
          </ThemedText>
          <ThemedText style={[styles.noDataText, { fontSize: 14, marginTop: 8 }]}>
            This may occur when the weather station is offline or not reporting data. Please try refreshing in a few minutes.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Filter data based on provided time window or default to 3am-5am alarm window
  const defaultWindow: TimeWindow = { startHour: 3, endHour: 5 };
  const activeWindow = timeWindow || defaultWindow;
  
  // Use the new filtering logic that handles multi-day scenarios
  let recentData: WindDataPoint[];
  if (timeWindow) {
    // Use smart filtering for time windows (handles day boundaries correctly)
    const timeFilteredData = filterWindDataByTimeWindow(data, activeWindow);
    
    // IMPORTANT: To reduce whitespace gaps, only show data from the first actual data point
    // instead of trying to show the entire time window when there are gaps
    if (timeFilteredData.length > 0) {
      // Find the first data point with meaningful wind data to eliminate leading whitespace
      // We'll consider any data point with wind speed >= 0.1 mph as meaningful (to handle near-zero but valid readings)
      const firstValidIndex = timeFilteredData.findIndex(point => {
        const speed = typeof point.windSpeed === 'string' ? parseFloat(point.windSpeed) : point.windSpeed;
        return !isNaN(speed) && speed >= 0.1;
      });
      
      // If we found valid data, start from there, but ensure we don't cut off too much data
      // If no meaningful wind data found, or if the first valid point is more than 25% into the data,
      // just use all the filtered data to avoid cutting off potentially important information
      if (firstValidIndex >= 0 && firstValidIndex < timeFilteredData.length * 0.25) {
        recentData = timeFilteredData.slice(firstValidIndex);
        console.log('🎯 Gap reduction applied:', {
          originalFiltered: timeFilteredData.length,
          afterGapReduction: recentData.length,
          firstValidIndex: firstValidIndex,
          firstPointTime: new Date(recentData[0].time).toISOString(),
          firstPointSpeed: typeof recentData[0].windSpeed === 'string' ? parseFloat(recentData[0].windSpeed) : recentData[0].windSpeed
        });
      } else {
        recentData = timeFilteredData;
        console.log('🎯 Gap reduction skipped - no early valid data found or would cut too much data:', {
          originalFiltered: timeFilteredData.length,
          firstValidIndex: firstValidIndex
        });
      }
    } else {
      recentData = timeFilteredData;
    }
  } else {
    // Keep original simple filtering for default 3am-5am alarm window
    recentData = data
      .filter(point => {
        const date = new Date(point.time);
        const hours = date.getHours();
        return hours >= activeWindow.startHour && hours <= activeWindow.endHour;
      });
    // Show more data points for scrollable chart (last 4 hours by default, or all filtered data)
    recentData = recentData.slice(-48); // 48 points = 4 hours of 5-minute intervals
  }

  if (recentData.length < 2) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            📊 No data available for {activeWindow.startHour}am-{activeWindow.endHour > 12 ? `${activeWindow.endHour - 12}pm` : `${activeWindow.endHour}am`} window
          </ThemedText>
          <ThemedText style={[styles.noDataText, { fontSize: 14, marginTop: 8 }]}>
            Station may be offline or not reporting data during this time period.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Prepare chart data with better error handling
  const speeds = recentData.map(point => {
    // Handle both string and number types for windSpeed
    const speed = typeof point.windSpeed === 'string' 
      ? parseFloat(point.windSpeed) 
      : point.windSpeed;
    return isNaN(speed) ? 0 : Math.max(0, speed);
  });
  
  const gusts = recentData.map(point => {
    // Handle both string and number types for windGust
    const gust = typeof point.windGust === 'string' 
      ? parseFloat(point.windGust) 
      : point.windGust;
    return isNaN(gust) ? 0 : Math.max(0, gust);
  });

  const directions = recentData.map(point => {
    // Handle both string and number types for windDirection
    const dir = typeof point.windDirection === 'string' 
      ? parseFloat(point.windDirection) 
      : point.windDirection;
    return isNaN(dir) ? null : dir;
  });

  // Ensure we have valid data before proceeding
  if (speeds.length === 0 || gusts.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            Invalid data for chart rendering
          </ThemedText>
        </View>
      </ThemedView>
    );
  }
  
  const labels = recentData.map((point, index) => {
    try {
      // Show labels more frequently, but ensure we have at least a few
      const labelInterval = Math.max(1, Math.ceil(recentData.length / 6)); // Show 6 labels max
      if (index % labelInterval === 0 || index === recentData.length - 1) {
        const time = new Date(point.time);
        if (isNaN(time.getTime())) {
          return '';
        }
        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return '';
    } catch (error) {
      console.warn('Error formatting time label:', error);
      return '';
    }
  });

  // Ensure we have at least some labels for the chart
  const hasValidLabels = labels.some(label => label !== '');
  if (!hasValidLabels && recentData.length > 0) {
    console.warn('⚠️ No valid labels generated, creating fallback labels');
    // Create simple index-based labels as fallback
    for (let i = 0; i < labels.length; i++) {
      if (i % Math.max(1, Math.ceil(labels.length / 4)) === 0) {
        try {
          const time = new Date(recentData[i].time);
          labels[i] = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
          labels[i] = `T${i}`;
        }
      }
    }
  }

  const chartData = {
    labels,
    datasets: [
      {
        data: speeds.length > 0 ? speeds : [0],
        color: (opacity = 1) => {
          try {
            return tintColor + Math.round(opacity * 255).toString(16).padStart(2, '0');
          } catch (error) {
            console.warn('Error in speed color function:', error);
            return '#3366CC80';
          }
        },
        strokeWidth: 2,
      },
      {
        data: gusts.length > 0 ? gusts : [0],
        color: (opacity = 1) => {
          try {
            return '#FF6B6B' + Math.round(opacity * 255).toString(16).padStart(2, '0');
          } catch (error) {
            console.warn('Error in gust color function:', error);
            return '#FF6B6B80';
          }
        },
        strokeWidth: 1,
        withDots: false,
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: backgroundColor || '#ffffff',
    backgroundGradientTo: backgroundColor || '#ffffff',
    color: (opacity = 1) => {
      try {
        return (textColor || '#000000') + Math.round(opacity * 255).toString(16).padStart(2, '0');
      } catch (error) {
        console.warn('Error in chart color function:', error);
        return '#00000080';
      }
    },
    labelColor: (opacity = 1) => {
      try {
        return (textColor || '#000000') + Math.round(opacity * 255).toString(16).padStart(2, '0');
      } catch (error) {
        console.warn('Error in label color function:', error);
        return '#00000080';
      }
    },
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 1,
    propsForDots: {
      r: '3',
      strokeWidth: '2',
    },
    propsForBackgroundLines: {
      strokeWidth: 1,
      stroke: (textColor || '#000000') + '20',
    },
    propsForLabels: {
      fontSize: 12,
      fontFamily: 'System',
    },
  };

  const screenWidth = Dimensions.get('window').width;
  const chartHeight = 220; // Increased height to accommodate x-axis labels
  // Calculate chart width based on data points for scrollable experience
  // Minimum width of screen, but expand based on data points for better readability
  const minChartWidth = screenWidth - 40;
  const pointWidth = 20; // Width per data point for comfortable spacing
  const calculatedWidth = Math.max(minChartWidth, recentData.length * pointWidth);
  const chartWidth = calculatedWidth;

  // Calculate where the direction arrows should be placed
  const chartInnerWidth = chartWidth - 60; // Adjusted for better positioning
  const chartInnerHeight = chartHeight - 50; // Adjusted for better positioning
  const chartLeft = 50; // Left padding of the chart
  const chartTop = 20; // Top padding of the chart
  const dataMaxSpeed = Math.max(...speeds, ...gusts) || 1;
  // Round up to nearest 5 to match Y-axis labels
  const maxSpeed = Math.ceil(dataMaxSpeed / 5) * 5;
  
  // Calculate positions for direction arrows with proper typing
  const arrowPositions = recentData
    .map((point, i) => {
      // Only place arrows at certain intervals to avoid overcrowding
      if (i % Math.ceil(recentData.length / 7) !== 0 && i !== recentData.length - 1) {
        return null;
      }
      
      const x = chartLeft + (i / (recentData.length - 1)) * chartInnerWidth;
      // Handle both string and number types for windSpeed
      const speedValue = typeof point.windSpeed === 'string' 
        ? parseFloat(point.windSpeed) 
        : point.windSpeed;
      // Move arrows up by 25 pixels from the data point to make them more visible
      const y = chartTop + (1 - (speedValue / maxSpeed)) * chartInnerHeight - 25;
      
      return {
        x,
        y,
        direction: point.windDirection
      };
    })
    .filter((pos): pos is { x: number; y: number; direction: string } => pos !== null);

  // Calculate positions for highlighting "good points" (points that meet alarm criteria)
  const goodPointPositions = highlightGoodPoints ? recentData
    .map((point, i) => {
      // Use actual criteria if provided, otherwise fallback to default
      const speedValue = typeof point.windSpeed === 'string' 
        ? parseFloat(point.windSpeed) 
        : point.windSpeed;
      
      const minSpeed = criteria?.minimumAverageSpeed || 10;
      const isGoodPoint = speedValue >= minSpeed;
      
      if (!isGoodPoint) return null;
      
      const x = chartLeft + (i / (recentData.length - 1)) * chartInnerWidth;
      const y = chartTop + (1 - (speedValue / maxSpeed)) * chartInnerHeight;
      
      return { x, y, speed: speedValue };
    })
    .filter((pos): pos is { x: number; y: number; speed: number } => pos !== null) : [];

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      
      <View style={styles.chartAreaContainer}>
        <YAxisLabels 
          maxSpeed={maxSpeed} 
          height={chartHeight} 
          textColor={textColor} 
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={true}
          style={styles.chartScrollContainer}
          contentContainerStyle={styles.chartScrollContent}
        >
          <View style={styles.chartContainer}>
            {(() => {
              try {
                return (
                  <View style={styles.chartWithOverlay}>
                    <LineChart
                      data={chartData}
                      width={chartWidth}
                      height={chartHeight}
                      chartConfig={chartConfig}
                      bezier
                      style={styles.chart}
                      withInnerLines={true}
                      withOuterLines={true}
                      withVerticalLabels={true}
                      withHorizontalLabels={false}
                      fromZero={true}
                      yAxisInterval={1}
                      segments={4}
                      horizontalLabelRotation={0}
                      verticalLabelRotation={0}
                    />
                    <View style={styles.windDirectionOverlay}>
                      <Svg width={chartWidth} height={chartHeight - 30}>
                        {/* Ideal wind speed reference line */}
                        {showIdealLine && idealWindSpeed <= maxSpeed && (
                          <G>
                            <Line
                              x1={chartLeft}
                              y1={chartTop + (1 - (idealWindSpeed / maxSpeed)) * chartInnerHeight}
                              x2={chartLeft + chartInnerWidth}
                              y2={chartTop + (1 - (idealWindSpeed / maxSpeed)) * chartInnerHeight}
                              stroke="#FF8C00"
                              strokeWidth={2}
                              strokeDasharray="8,4"
                              opacity={0.8}
                            />
                            <Text
                              x={chartLeft + chartInnerWidth - 5}
                              y={chartTop + (1 - (idealWindSpeed / maxSpeed)) * chartInnerHeight - 5}
                              fill="#FF8C00"
                              fontSize="10"
                              textAnchor="end"
                              opacity={0.9}
                            >
                              {idealWindSpeed}mph
                            </Text>
                          </G>
                        )}
                        {goodPointPositions.map((pos, i) => (
                          <Circle 
                            key={`good-${i}`}
                            cx={pos.x}
                            cy={pos.y}
                            r={6}
                            fill="rgba(76, 175, 80, 0.3)"
                            stroke="#4CAF50"
                            strokeWidth={2}
                          />
                        ))}
                        {arrowPositions.map((pos, i) => (
                          <DirectionArrow 
                            key={`dir-${i}`}
                            x={pos.x}
                            y={pos.y}
                            direction={pos.direction}
                            color={directionColor}
                            size={16}
                          />
                        ))}
                      </Svg>
                    </View>
                  </View>
                );
              } catch (error) {
                console.error('🚨 LineChart rendering error:', error);
                return (
                  <View style={styles.noDataContainer}>
                    <ThemedText style={styles.noDataText}>
                      Chart rendering failed. Please try refreshing.
                    </ThemedText>
                  </View>
                );
              }
            })()}
          </View>
        </ScrollView>
      </View>
      
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: tintColor }]} />
          <ThemedText style={styles.legendText}>Wind Speed</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF6B6B' }]} />
          <ThemedText style={styles.legendText}>Gusts</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendArrow}>
            <ThemedText style={{color: directionColor}}>↑</ThemedText>
          </View>
          <ThemedText style={styles.legendText}>Wind Direction</ThemedText>
        </View>
        {showIdealLine && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDashedLine]} />
            <ThemedText style={styles.legendText}>Ideal for Wind Sports ({idealWindSpeed}mph)</ThemedText>
          </View>
        )}
        {highlightGoodPoints && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: 'rgba(76, 175, 80, 0.3)', borderWidth: 1, borderColor: '#4CAF50' }]} />
            <ThemedText style={styles.legendText}>Good Points (≥{criteria?.minimumAverageSpeed || 10}mph)</ThemedText>
          </View>
        )}
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <ThemedText style={styles.statValue}>
            {Math.max(...speeds).toFixed(1)}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Max Speed</ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={styles.statValue}>
            {(speeds.reduce((a, b) => a + b, 0) / speeds.length).toFixed(1)}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Avg Speed</ThemedText>
        </View>
        <View style={styles.stat}>
          <ThemedText style={styles.statValue}>
            {Math.max(...gusts).toFixed(1)}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Max Gust</ThemedText>
        </View>
      </View>
      
      <View style={styles.directionContainer}>
        <ThemedText style={styles.directionTitle}>Wind Direction</ThemedText>
        <View style={styles.directionInfo}>
          {directions.some(dir => dir !== null) ? (
            <>
              <View style={styles.compass}>
                <ThemedText style={styles.compassN}>N</ThemedText>
                <ThemedText style={styles.compassE}>E</ThemedText>
                <ThemedText style={styles.compassS}>S</ThemedText>
                <ThemedText style={styles.compassW}>W</ThemedText>
                {(() => {
                  const validDirections = directions.filter(dir => dir !== null) as number[];
                  if (validDirections.length === 0) return null;
                  
                  let sumSin = 0;
                  let sumCos = 0;
                  validDirections.forEach(dir => {
                    const rad = (dir * Math.PI) / 180;
                    sumSin += Math.sin(rad);
                    sumCos += Math.cos(rad);
                  });
                  
                  const avgDirection = ((Math.atan2(sumSin, sumCos) * 180 / Math.PI) + 360) % 360;
                  const rotation = avgDirection;
                  
                  return (
                    <View style={[styles.directionArrow, { transform: [{ rotate: `${rotation}deg` }] }]}>
                      <ThemedText style={styles.directionArrowText}>↑</ThemedText>
                    </View>
                  );
                })()}
              </View>
              <View style={styles.directionStats}>
                <ThemedText style={styles.directionAvg}>
                  {(() => {
                    const validDirections = directions.filter(dir => dir !== null) as number[];
                    if (validDirections.length === 0) return "N/A";
                    
                    let sumSin = 0;
                    let sumCos = 0;
                    validDirections.forEach(dir => {
                      const rad = (dir * Math.PI) / 180;
                      sumSin += Math.sin(rad);
                      sumCos += Math.cos(rad);
                    });
                    
                    const avgDirection = ((Math.atan2(sumSin, sumCos) * 180 / Math.PI) + 360) % 360;
                    const directionName = getDirectionName(avgDirection);
                    
                    return `${Math.round(avgDirection)}° (${directionName})`;
                  })()}
                </ThemedText>
                <ThemedText style={styles.directionLabel}>Avg Direction</ThemedText>
              </View>
            </>
          ) : (
            <ThemedText style={styles.noDataText}>No direction data available</ThemedText>
          )}
        </View>
      </View>
    </ThemedView>
  );
}

// Helper to convert direction degrees to cardinal direction name
function getDirectionName(degrees: number): string {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    marginBottom: 12,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  chartWithOverlay: {
    position: 'relative',
    width: '100%',
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8, // Add vertical margin for label space
  },
  noDataContainer: {
    height: 220, // Match the updated chart height
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  noDataText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendArrow: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  legendDashedLine: {
    width: 16,
    height: 2,
    backgroundColor: '#FF8C00',
    opacity: 0.8,
  },
  legendText: {
    fontSize: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  directionContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  directionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  directionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compass: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,
    position: 'relative',
  },
  compassN: {
    position: 'absolute',
    top: 2,
    fontSize: 12,
  },
  compassE: {
    position: 'absolute',
    right: 2,
    fontSize: 12,
  },
  compassS: {
    position: 'absolute',
    bottom: 2,
    fontSize: 12,
  },
  compassW: {
    position: 'absolute',
    left: 2,
    fontSize: 12,
  },
  directionArrow: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    position: 'absolute',
  },
  directionArrowText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  directionStats: {
    alignItems: 'center',
  },
  directionAvg: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  directionLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  windDirectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 30, // Leave space for x-axis labels
    zIndex: 10,
    pointerEvents: 'none'  // Makes sure this layer doesn't block touch events
  },
  chartScrollContainer: {
    flex: 1,
    marginLeft: 50, // Leave space for the fixed Y-axis labels
  },
  chartScrollContent: {
    alignItems: 'center',
  },
  yAxisContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
    zIndex: 5,
  },
  yAxisLabel: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'right',
  },
  yAxisLabels: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 50,
    justifyContent: 'space-between',
    paddingRight: 8,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  yAxisLabelText: {
    fontSize: 10,
    opacity: 0.7,
    textAlign: 'right',
  },
  chartAreaContainer: {
    flexDirection: 'row',
    position: 'relative',
    height: 220, // Accommodate chart height + padding
    backgroundColor: 'transparent',
  },
});
