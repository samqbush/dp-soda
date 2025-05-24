import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { WindDataPoint } from '@/services/windService';
import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface WindChartProps {
  data: WindDataPoint[];
  title?: string;
}

export function WindChart({ data, title = 'Wind Speed Trend' }: WindChartProps) {
  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');

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

  // Filter data to last 12 hours for better visualization
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const recentData = data
    .filter(point => new Date(point.time) >= twelveHoursAgo)
    .slice(-20); // Limit to 20 points for better chart readability

  if (recentData.length < 2) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
        <View style={styles.noDataContainer}>
          <ThemedText style={styles.noDataText}>
            Not enough recent data to display chart
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Prepare chart data
  const speeds = recentData.map(point => parseFloat(point.windSpeed) || 0);
  const gusts = recentData.map(point => parseFloat(point.windGust) || 0);
  const labels = recentData.map((point, index) => {
    if (index % Math.ceil(recentData.length / 4) === 0) {
      const time = new Date(point.time);
      return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '';
  });

  const chartData = {
    labels,
    datasets: [
      {
        data: speeds,
        color: (opacity = 1) => tintColor + Math.round(opacity * 255).toString(16).padStart(2, '0'),
        strokeWidth: 2,
      },
      {
        data: gusts,
        color: (opacity = 1) => '#FF6B6B' + Math.round(opacity * 255).toString(16).padStart(2, '0'),
        strokeWidth: 1,
        withDots: false,
      }
    ],
    legend: ['Wind Speed', 'Gusts']
  };

  const chartConfig = {
    backgroundGradientFrom: backgroundColor,
    backgroundGradientTo: backgroundColor,
    color: (opacity = 1) => textColor + Math.round(opacity * 255).toString(16).padStart(2, '0'),
    labelColor: (opacity = 1) => textColor + Math.round(opacity * 255).toString(16).padStart(2, '0'),
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
      stroke: textColor + '20',
    },
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>{title}</ThemedText>
      <View style={styles.chartContainer}>
        <LineChart
          data={chartData}
          width={screenWidth - 40}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLabels={true}
          withHorizontalLabels={true}
          fromZero={true}
        />
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
    </ThemedView>
  );
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
});
