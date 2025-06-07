import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface PressureTrendData {
  change: number;
  trend: 'rising' | 'falling' | 'stable';
  pressures: number[];
  timespan: number;
}

interface PressureChartProps {
  pressureTrend: PressureTrendData | null;
  title?: string;
  location?: string;
}

export function PressureChart({ 
  pressureTrend, 
  title = 'Pressure Trend (24h)', 
  location = 'Morrison' 
}: PressureChartProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

  if (!pressureTrend || !pressureTrend.pressures || pressureTrend.pressures.length < 2) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={[styles.noDataContainer, { borderColor: textColor }]}>
          <ThemedText style={[styles.noDataText, { color: textColor }]}>
            {!pressureTrend ? 'Loading pressure data...' : 'Not enough pressure data points'}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 48; // Account for padding

  // Prepare chart data
  const pressures = pressureTrend.pressures;
  const minPressure = Math.min(...pressures);
  const maxPressure = Math.max(...pressures);
  const pressureRange = maxPressure - minPressure;
  
  // Create labels for time periods (e.g., "6h ago", "4h ago", etc.)
  const labels = pressures.map((_, index) => {
    const hoursAgo = pressureTrend.timespan - (index * (pressureTrend.timespan / (pressures.length - 1)));
    if (hoursAgo < 1) return 'Now';
    if (hoursAgo < 2) return '1h';
    return `${Math.round(hoursAgo)}h`;
  });

  const chartData = {
    labels: labels,
    datasets: [
      {
        data: pressures,
        color: (opacity = 1) => {
          // Color based on trend with error handling
          try {
            if (pressureTrend.trend === 'rising') return `rgba(76, 175, 80, ${opacity})`; // Green
            if (pressureTrend.trend === 'falling') return `rgba(244, 67, 54, ${opacity})`; // Red
            return `rgba(158, 158, 158, ${opacity})`; // Gray for stable
          } catch (error) {
            console.warn('Error in pressure chart color function:', error);
            return `rgba(158, 158, 158, ${opacity})`;
          }
        },
        strokeWidth: 3,
      },
    ],
  };

  const chartConfig = {
    backgroundColor: backgroundColor,
    backgroundGradientFrom: backgroundColor,
    backgroundGradientTo: backgroundColor,
    decimalPlaces: 1,
    color: (opacity = 1) => {
      // Use a simpler color approach similar to WindChart
      try {
        return textColor === '#000000' ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
      } catch (error) {
        console.warn('Error in chart color function:', error);
        return `rgba(0, 0, 0, ${opacity})`;
      }
    },
    labelColor: (opacity = 1) => {
      try {
        return textColor === '#000000' ? `rgba(0, 0, 0, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
      } catch (error) {
        console.warn('Error in label color function:', error);
        return `rgba(0, 0, 0, ${opacity})`;
      }
    },
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: tintColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: '',
      strokeOpacity: 0.2,
    },
    formatYLabel: (value: string) => `${parseFloat(value).toFixed(1)}`,
    segments: 4, // Number of horizontal grid lines
  };

  // Calculate trend indicators
  const getTrendIcon = () => {
    switch (pressureTrend.trend) {
      case 'rising': return '📈';
      case 'falling': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getTrendColor = () => {
    switch (pressureTrend.trend) {
      case 'rising': return '#4CAF50';
      case 'falling': return '#F44336';
      case 'stable': return '#9E9E9E';
      default: return textColor;
    }
  };

  const getTrendDescription = () => {
    const absChange = Math.abs(pressureTrend.change);
    switch (pressureTrend.trend) {
      case 'rising': 
        return `Rising ${absChange.toFixed(1)} hPa over ${pressureTrend.timespan}h`;
      case 'falling': 
        return `Falling ${absChange.toFixed(1)} hPa over ${pressureTrend.timespan}h`;
      case 'stable': 
        return `Stable (±${absChange.toFixed(1)} hPa over ${pressureTrend.timespan}h)`;
      default: 
        return `Change: ${pressureTrend.change.toFixed(1)} hPa`;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      
      {/* Trend Summary */}
      <ThemedView style={styles.trendSummary}>
        <ThemedView style={styles.trendRow}>
          <ThemedText style={[styles.trendIcon, { color: getTrendColor() }]}>
            {getTrendIcon()}
          </ThemedText>
          <ThemedView style={styles.trendInfo}>
            <ThemedText style={[styles.trendText, { color: getTrendColor() }]}>
              {getTrendDescription()}
            </ThemedText>
            <ThemedText style={[styles.locationText, { color: textColor, opacity: 0.7 }]}>
              {location} • {pressures.length} data points
            </ThemedText>
          </ThemedView>
        </ThemedView>
        
        {/* Pressure range info */}
        <ThemedView style={styles.pressureRangeInfo}>
          <ThemedText style={[styles.rangeText, { color: textColor, opacity: 0.8 }]}>
            Range: {minPressure.toFixed(1)} - {maxPressure.toFixed(1)} hPa
          </ThemedText>
          <ThemedText style={[styles.currentPressure, { color: tintColor }]}>
            Current: {pressures[pressures.length - 1].toFixed(1)} hPa
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          yAxisSuffix=" hPa"
          yAxisInterval={1}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={true}
          withHorizontalLines={true}
          fromZero={false}
          yLabelsOffset={10}
          xLabelsOffset={-5}
        />
      </View>

      {/* Katabatic Wind Context */}
      <ThemedView style={[styles.contextBox, { borderColor: tintColor }]}>
        <ThemedText style={[styles.contextTitle, { color: tintColor }]}>
          🌪️ Katabatic Wind Context
        </ThemedText>
        <ThemedText style={[styles.contextText, { color: textColor, opacity: 0.8 }]}>
          {pressureTrend.change >= 2.0 
            ? `✅ Strong pressure change (${pressureTrend.change > 0 ? '+' : ''}${pressureTrend.change.toFixed(1)} hPa) indicates good air movement for katabatic winds.`
            : pressureTrend.change >= 1.0
            ? `⚠️ Moderate pressure change (${pressureTrend.change > 0 ? '+' : ''}${pressureTrend.change.toFixed(1)} hPa) may support weaker katabatic conditions.`
            : `❌ Low pressure change (${pressureTrend.change > 0 ? '+' : ''}${pressureTrend.change.toFixed(1)} hPa) indicates stable conditions - less favorable for katabatic winds.`
          }
        </ThemedText>
        <ThemedText style={[styles.contextSubtext, { color: textColor, opacity: 0.6 }]}>
          Katabatic winds typically require ≥2.0 hPa pressure change for optimal conditions.
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  title: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '600',
  },
  trendSummary: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 8,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  trendInfo: {
    flex: 1,
  },
  trendText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 12,
  },
  pressureRangeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rangeText: {
    fontSize: 12,
  },
  currentPressure: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  noDataContainer: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  noDataText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  contextBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  contextText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  contextSubtext: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 14,
  },
});
