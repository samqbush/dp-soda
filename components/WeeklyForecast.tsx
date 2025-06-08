import React, { useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DayPredictionCard } from '@/components/DayPredictionCard';
import { useThemeColor } from '@/hooks/useThemeColor';

interface WeeklyForecastProps {
  predictions: {
    prediction: {
      probability: number;
      confidence: 'low' | 'medium' | 'high';
      recommendation: 'go' | 'maybe' | 'skip';
      explanation: string;
      factors: {
        precipitation: { meets: boolean; value: number };
        skyConditions: { meets: boolean; clearPeriodCoverage: number };
        pressureChange: { meets: boolean; change: number };
        temperatureDifferential: { meets: boolean; differential: number };
      };
    };
    dayOffset: number;
    targetDate: Date;
    dataQuality: string;
    isPreliminary: boolean;
  }[];
  forecastAvailability: {
    totalHours: number;
    daysAvailable: number;
    lastForecastTime: Date;
    dataSource: string;
    isComplete: boolean;
  } | null;
  isLoading?: boolean;
}

export function WeeklyForecast({ predictions, forecastAvailability, isLoading }: WeeklyForecastProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  const handleDayPress = (dayOffset: number) => {
    setExpandedDay(expandedDay === dayOffset ? null : dayOffset);
  };

  const getRecommendationSummary = () => {
    if (predictions.length === 0) return null;
    
    const goCount = predictions.filter(p => p.prediction.recommendation === 'go').length;
    const maybeCount = predictions.filter(p => p.prediction.recommendation === 'maybe').length;
    const skipCount = predictions.filter(p => p.prediction.recommendation === 'skip').length;
    
    return { goCount, maybeCount, skipCount };
  };

  const getBestDays = () => {
    return predictions
      .filter(p => p.prediction.recommendation === 'go' || 
                  (p.prediction.recommendation === 'maybe' && p.prediction.probability >= 60))
      .sort((a, b) => b.prediction.probability - a.prediction.probability)
      .slice(0, 3);
  };

  const summary = getRecommendationSummary();
  const bestDays = getBestDays();

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: cardColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          📅 5-Day Forecast
        </ThemedText>
        <ThemedView style={styles.loadingContainer}>
          <ThemedText style={[styles.loadingText, { color: textColor, opacity: 0.7 }]}>
            Loading extended forecast...
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  if (predictions.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: cardColor }]}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          📅 5-Day Forecast
        </ThemedText>
        <ThemedView style={styles.noDataContainer}>
          <ThemedText style={[styles.noDataText, { color: textColor, opacity: 0.7 }]}>
            Extended forecast data not available
          </ThemedText>
          <ThemedText style={[styles.noDataSubtext, { color: textColor, opacity: 0.5 }]}>
            Check your internet connection or try refreshing
          </ThemedText>
        </ThemedView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardColor }]}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          📅 5-Day Forecast
        </ThemedText>
        {forecastAvailability && (
          <ThemedText style={[styles.subtitle, { color: textColor, opacity: 0.7 }]}>
            {forecastAvailability.daysAvailable} days available • {forecastAvailability.totalHours}h data
          </ThemedText>
        )}
      </ThemedView>

      {/* Quick Summary */}
      {summary && (
        <ThemedView style={[styles.summaryCard, { backgroundColor: 'rgba(0, 0, 0, 0.05)' }]}>
          <ThemedText style={[styles.summaryTitle, { color: textColor }]}>
            🎯 Week Overview
          </ThemedText>
          <ThemedView style={styles.summaryStats}>
            <ThemedView style={styles.summaryItem}>
              <ThemedText style={[styles.summaryNumber, { color: '#4CAF50' }]}>
                {summary.goCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textColor, opacity: 0.8 }]}>
                GO days
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.summaryItem}>
              <ThemedText style={[styles.summaryNumber, { color: '#FF9800' }]}>
                {summary.maybeCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textColor, opacity: 0.8 }]}>
                MAYBE days
              </ThemedText>
            </ThemedView>
            <ThemedView style={styles.summaryItem}>
              <ThemedText style={[styles.summaryNumber, { color: '#F44336' }]}>
                {summary.skipCount}
              </ThemedText>
              <ThemedText style={[styles.summaryLabel, { color: textColor, opacity: 0.8 }]}>
                SKIP days
              </ThemedText>
            </ThemedView>
          </ThemedView>
          
          {/* Best Days Recommendation */}
          {bestDays.length > 0 && (
            <ThemedView style={styles.bestDaysSection}>
              <ThemedText style={[styles.bestDaysTitle, { color: tintColor }]}>
                ⭐ Best Opportunities:
              </ThemedText>
              <ThemedText style={[styles.bestDaysText, { color: textColor, opacity: 0.8 }]}>
                {bestDays.map(day => {
                  const dayLabel = day.dayOffset === 0 ? 'Today' : 
                                  day.dayOffset === 1 ? 'Tomorrow' :
                                  day.targetDate.toLocaleDateString('en-US', { weekday: 'short' });
                  return `${dayLabel} (${day.prediction.probability}%)`;
                }).join(', ')}
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      )}

      {/* Day-by-Day Predictions */}
      <ThemedView style={styles.forecastList}>
        <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
          📊 Daily Breakdown
        </ThemedText>
        <ThemedText style={[styles.sectionSubtitle, { color: textColor, opacity: 0.7 }]}>
          Tap any day for detailed analysis
        </ThemedText>
        
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {predictions.map((prediction) => (
            <DayPredictionCard
              key={prediction.dayOffset}
              dayOffset={prediction.dayOffset}
              targetDate={prediction.targetDate}
              prediction={prediction.prediction}
              dataQuality={prediction.dataQuality}
              isPreliminary={prediction.isPreliminary}
              onPress={() => handleDayPress(prediction.dayOffset)}
              isExpanded={expandedDay === prediction.dayOffset}
            />
          ))}
        </ScrollView>
      </ThemedView>

      {/* Data Source Info */}
      {forecastAvailability && (
        <ThemedView style={[styles.dataSourceInfo, { 
          backgroundColor: 'rgba(128, 128, 128, 0.1)',
          borderColor: 'rgba(128, 128, 128, 0.3)'
        }]}>
          <ThemedText style={[styles.dataSourceTitle, { color: textColor, opacity: 0.8 }]}>
            📡 Forecast Data Status
          </ThemedText>
          <ThemedText style={[styles.dataSourceText, { color: textColor, opacity: 0.7 }]}>
            Source: {forecastAvailability.dataSource === 'api' ? 'OpenWeatherMap API' : 'Cached Data'} • 
            Last update: {forecastAvailability.lastForecastTime.toLocaleTimeString()}
          </ThemedText>
          {!forecastAvailability.isComplete && (
            <ThemedText style={[styles.dataWarning, { color: '#FF9800' }]}>
              ⚠️ Limited forecast data - some days may have reduced accuracy
            </ThemedText>
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  summaryCard: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
  },
  bestDaysSection: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    paddingTop: 12,
  },
  bestDaysTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  bestDaysText: {
    fontSize: 12,
    lineHeight: 16,
  },
  forecastList: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  scrollView: {
    maxHeight: 400, // Limit height to prevent excessive scrolling
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  noDataContainer: {
    padding: 24,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  dataSourceInfo: {
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
  },
  dataSourceTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dataSourceText: {
    fontSize: 11,
    lineHeight: 14,
  },
  dataWarning: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
});
