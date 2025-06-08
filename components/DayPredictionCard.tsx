import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface DayPredictionProps {
  dayOffset: number;
  targetDate: Date;
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
  dataQuality: string;
  isPreliminary: boolean;
  onPress?: () => void;
  isExpanded?: boolean;
}

export function DayPredictionCard({ 
  dayOffset, 
  targetDate, 
  prediction, 
  dataQuality, 
  isPreliminary,
  onPress,
  isExpanded = false
}: DayPredictionProps) {
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  // Helper functions
  const getProbabilityColor = (probability: number): string => {
    if (probability >= 75) return '#4CAF50'; // Green
    if (probability >= 50) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getConfidenceColor = (confidence: 'low' | 'medium' | 'high'): string => {
    switch (confidence) {
      case 'high': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'low': return '#F44336';
    }
  };

  const getRecommendationText = (recommendation: 'go' | 'maybe' | 'skip'): string => {
    switch (recommendation) {
      case 'go': return 'GO! 🎯';
      case 'maybe': return 'MAYBE 🤔';
      case 'skip': return 'SKIP ❌';
    }
  };

  const getDayLabel = (dayOffset: number): string => {
    if (dayOffset === 0) return 'Today';
    if (dayOffset === 1) return 'Tomorrow';
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };

  const formatTempDiffF = (celsius: number): string => {
    const fahrenheit = celsius * 9/5;
    return `${fahrenheit.toFixed(1)}°F`;
  };

  const formatFactorCount = () => {
    const factors = prediction.factors;
    const metCount = [
      factors.precipitation.meets,
      factors.skyConditions.meets,
      factors.pressureChange.meets,
      factors.temperatureDifferential.meets
    ].filter(Boolean).length;
    
    return `${metCount}/4`;
  };

  const CardContent = () => (
    <>
      {/* Day Header */}
      <ThemedView style={styles.dayHeader}>
        <ThemedView style={styles.dayInfo}>
          <ThemedText style={[styles.dayLabel, { color: textColor }]}>
            {getDayLabel(dayOffset)}
          </ThemedText>
          <ThemedText style={[styles.dateLabel, { color: textColor, opacity: 0.7 }]}>
            {targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.statusBadges}>
          {isPreliminary && (
            <ThemedText style={[styles.preliminaryBadge, { 
              color: '#2196F3', 
              backgroundColor: 'rgba(33, 150, 243, 0.1)' 
            }]}>
              Preliminary
            </ThemedText>
          )}
          <ThemedText style={[styles.dataQualityBadge, { 
            color: dataQuality === 'good' ? '#4CAF50' : '#FF9800',
            backgroundColor: dataQuality === 'good' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)'
          }]}>
            {dataQuality === 'good' ? 'Good Data' : 'Limited Data'}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Prediction Display */}
      <ThemedView style={styles.predictionDisplay}>
        <ThemedView style={[styles.probabilityBar, { backgroundColor: tintColor, opacity: 0.3 }]}>
          <ThemedView style={[
            styles.probabilityFill, 
            { 
              backgroundColor: getProbabilityColor(prediction.probability),
              width: `${prediction.probability}%` 
            }
          ]} />
        </ThemedView>
        <ThemedText style={[styles.probabilityText, { color: textColor }]}>
          {prediction.probability}% Probability
        </ThemedText>
        <ThemedText style={[
          styles.recommendationText,
          { color: getConfidenceColor(prediction.confidence) }
        ]}>
          {prediction.confidence.charAt(0).toUpperCase() + prediction.confidence.slice(1)} Confidence - {getRecommendationText(prediction.recommendation)}
        </ThemedText>
      </ThemedView>

      {/* Quick Factors Summary */}
      <ThemedView style={styles.factorsSummary}>
        <ThemedText style={[styles.factorsLabel, { color: textColor, opacity: 0.8 }]}>
          Key Factors: {formatFactorCount()} favorable
        </ThemedText>
        <ThemedView style={styles.factorsRow}>
          <ThemedText style={{ color: prediction.factors.precipitation.meets ? '#4CAF50' : '#F44336' }}>
            {prediction.factors.precipitation.meets ? '✅' : '❌'} Rain
          </ThemedText>
          <ThemedText style={{ color: prediction.factors.skyConditions.meets ? '#4CAF50' : '#F44336' }}>
            {prediction.factors.skyConditions.meets ? '✅' : '❌'} Sky
          </ThemedText>
          <ThemedText style={{ color: prediction.factors.pressureChange.meets ? '#4CAF50' : '#F44336' }}>
            {prediction.factors.pressureChange.meets ? '✅' : '❌'} Pressure
          </ThemedText>
          <ThemedText style={{ color: prediction.factors.temperatureDifferential.meets ? '#4CAF50' : '#F44336' }}>
            {prediction.factors.temperatureDifferential.meets ? '✅' : '❌'} Temp
          </ThemedText>
        </ThemedView>
      </ThemedView>

      {/* Expanded Details */}
      {isExpanded && (
        <ThemedView style={styles.expandedDetails}>
          <ThemedText style={[styles.explanationText, { color: textColor, opacity: 0.8 }]}>
            {prediction.explanation}
          </ThemedText>
          
          {/* Detailed Factors */}
          <ThemedView style={styles.detailedFactors}>
            <ThemedView style={styles.factorRow}>
              <ThemedText style={[styles.factorLabel, { color: textColor }]}>
                {prediction.factors.precipitation.meets ? '✅' : '❌'} Rain:
              </ThemedText>
              <ThemedText style={[styles.factorValue, { color: textColor }]}>
                {prediction.factors.precipitation.value.toFixed(1)}%
              </ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.factorRow}>
              <ThemedText style={[styles.factorLabel, { color: textColor }]}>
                {prediction.factors.skyConditions.meets ? '✅' : '❌'} Clear Sky:
              </ThemedText>
              <ThemedText style={[styles.factorValue, { color: textColor }]}>
                {prediction.factors.skyConditions.clearPeriodCoverage.toFixed(0)}%
              </ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.factorRow}>
              <ThemedText style={[styles.factorLabel, { color: textColor }]}>
                {prediction.factors.pressureChange.meets ? '✅' : '❌'} Pressure:
              </ThemedText>
              <ThemedText style={[styles.factorValue, { color: textColor }]}>
                {prediction.factors.pressureChange.change > 0 ? '+' : ''}
                {prediction.factors.pressureChange.change.toFixed(1)} hPa
              </ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.factorRow}>
              <ThemedText style={[styles.factorLabel, { color: textColor }]}>
                {prediction.factors.temperatureDifferential.meets ? '✅' : '❌'} Temp Diff:
              </ThemedText>
              <ThemedText style={[styles.factorValue, { color: textColor }]}>
                {formatTempDiffF(prediction.factors.temperatureDifferential.differential)}
              </ThemedText>
            </ThemedView>
          </ThemedView>
        </ThemedView>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <ThemedView style={[styles.container, { backgroundColor: cardColor }]}>
          <CardContent />
        </ThemedView>
      </TouchableOpacity>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: cardColor }]}>
      <CardContent />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayInfo: {
    flex: 1,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  dateLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  preliminaryBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  dataQualityBadge: {
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  predictionDisplay: {
    marginBottom: 12,
  },
  probabilityBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  probabilityFill: {
    height: '100%',
    borderRadius: 4,
  },
  probabilityText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  factorsSummary: {
    marginBottom: 8,
  },
  factorsLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  factorsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  expandedDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
    paddingTop: 12,
    marginTop: 8,
  },
  explanationText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailedFactors: {
    gap: 6,
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  factorLabel: {
    fontSize: 12,
    flex: 1,
  },
  factorValue: {
    fontSize: 12,
    fontWeight: '500',
  },
});
