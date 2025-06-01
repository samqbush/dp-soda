import { DataCrashDetector } from '@/components/DataCrashDetector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { AlarmCriteria, WindDataPoint } from '@/services/windService';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Svg, { Circle, G, Path } from 'react-native-svg';

interface WindChartProps {
  data: WindDataPoint[];
  title?: string;
  highlightGoodPoints?: boolean; // New prop to highlight consecutive good points
  criteria?: AlarmCriteria; // Optional criteria for determining good points
  timeWindow?: { startHour: number; endHour: number }; // Optional time window filter
}

export function WindChart({ data, title = 'Wind Speed Trend', highlightGoodPoints = false, criteria, timeWindow }: WindChartProps) {
  const handleChartCrash = (error: Error, info: any) => {
    console.error('🚨 WindChart crashed:', error);
    console.error('🚨 Chart data that caused crash:', data);
  };

  return (
    <DataCrashDetector componentName="WindChart" onCrash={handleChartCrash}>
      <WindChartContent data={data} title={title} highlightGoodPoints={highlightGoodPoints} criteria={criteria} timeWindow={timeWindow} />
    </DataCrashDetector>
  );
}

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

function WindChartContent({ data, title, highlightGoodPoints = false, criteria, timeWindow }: WindChartProps) {
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
            Not enough data points to display chart
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Filter data based on provided time window or default to 3am-5am alarm window
  const defaultWindow = { startHour: 3, endHour: 5 };
  const activeWindow = timeWindow || defaultWindow;
  
  const recentData = data
    .filter(point => {
      const date = new Date(point.time);
      const hours = date.getHours();
      return hours >= activeWindow.startHour && hours <= activeWindow.endHour;
    })
    .slice(-20); // Limit to 20 points for better chart readability

  if (recentData.length < 2) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            Not enough data points in {activeWindow.startHour}am-{activeWindow.endHour}am window to display chart
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
      if (index % Math.ceil(recentData.length / 4) === 0) {
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
    ],
    legend: ['Wind Speed', 'Gusts']
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
  };

  const screenWidth = Dimensions.get('window').width;
  const chartHeight = 200;
  const chartWidth = screenWidth - 40;

  // Calculate where the direction arrows should be placed
  const chartInnerWidth = chartWidth - 60; // Adjusted for better positioning
  const chartInnerHeight = chartHeight - 50; // Adjusted for better positioning
  const chartLeft = 50; // Left padding of the chart
  const chartTop = 20; // Top padding of the chart
  const maxSpeed = Math.max(...speeds, ...gusts) || 1;
  
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
      const y = chartTop + (1 - (speedValue / maxSpeed)) * chartInnerHeight;
      
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
      <View style={styles.chartContainer}>
        {/* Render chart with error handling */}
        {(() => {
          try {
            return (
              <View>
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
                    withHorizontalLabels={true}
                    fromZero={true}
                  />
                  
                  {/* Overlay for wind direction arrows and good point highlights */}
                  <View style={styles.windDirectionOverlay}>
                    <Svg width={chartWidth} height={chartHeight}>
                      {/* Render good point highlights */}
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
                      
                      {/* Render direction arrows */}
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
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: tintColor }]} />
          <ThemedText style={styles.legendText}>Wind Speed (mph)</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF6B6B' }]} />
          <ThemedText style={styles.legendText}>Gusts (mph)</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendArrow}>
            <ThemedText style={{color: directionColor}}>↑</ThemedText>
          </View>
          <ThemedText style={styles.legendText}>Wind Direction</ThemedText>
        </View>
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
      
      {/* Add a wind direction rose or compass section */}
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
                {/* Calculate dominant direction */}
                {(() => {
                  const validDirections = directions.filter(dir => dir !== null) as number[];
                  if (validDirections.length === 0) return null;
                  
                  // Calculate average direction using circular statistics
                  let sumSin = 0;
                  let sumCos = 0;
                  validDirections.forEach(dir => {
                    const rad = (dir * Math.PI) / 180;
                    sumSin += Math.sin(rad);
                    sumCos += Math.cos(rad);
                  });
                  
                  const avgDirection = ((Math.atan2(sumSin, sumCos) * 180 / Math.PI) + 360) % 360;
                  // In the compass, we don't rotate 180° since we want to show where wind is coming FROM
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
                    
                    // Calculate average direction
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
  },
  noDataContainer: {
    height: 200,
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
    bottom: 0,
    zIndex: 10,
    pointerEvents: 'none'  // Makes sure this layer doesn't block touch events
  }
});
