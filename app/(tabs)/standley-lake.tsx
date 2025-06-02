import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindChart } from '@/components/WindChart';
import { useStandleyLakeWind } from '@/hooks/useStandleyLakeWind';
import { useThemeColor } from '@/hooks/useThemeColor';
import type { EcowittApiConfig } from '@/services/ecowittService';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function StandleyLakeScreen() {
  const {
    windData,
    chartData,
    analysis,
    config,
    isConfigured,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    setApiConfig,
    clearCache
  } = useStandleyLakeWind();

  const [showConfig, setShowConfig] = useState(!isConfigured);
  const [configForm, setConfigForm] = useState<EcowittApiConfig>({
    applicationKey: config?.applicationKey || '',
    apiKey: config?.apiKey || '',
    macAddress: config?.macAddress || ''
  });

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'background');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');

  const handleSaveConfig = async () => {
    if (!configForm.applicationKey || !configForm.apiKey || !configForm.macAddress) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      await setApiConfig(configForm);
      setShowConfig(false);
      Alert.alert('Success', 'API configuration saved successfully!');
    } catch {
      Alert.alert('Error', 'Failed to save configuration. Please try again.');
    }
  };

  const handleRefresh = async () => {
    if (!isConfigured) {
      setShowConfig(true);
      return;
    }
    await refreshData();
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCurrentWindSpeed = () => {
    if (windData.length === 0) return null;
    const latest = windData[windData.length - 1];
    return latest.windSpeedMph;
  };

  const getCurrentWindDirection = () => {
    if (windData.length === 0) return null;
    const latest = windData[windData.length - 1];
    return latest.windDirection;
  };

  const getWindDirectionText = (degrees: number | null) => {
    if (degrees === null) return 'N/A';
    
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  if (showConfig) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <View style={styles.header}>
            <ThemedText type="title">Standley Lake Wind Monitor</ThemedText>
            <ThemedText style={styles.subtitle}>Configure your Ecowitt API access</ThemedText>
          </View>

          <View style={[styles.configCard, { backgroundColor: cardColor }]}>
            <ThemedText type="subtitle" style={styles.configTitle}>API Configuration</ThemedText>
            
            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Application Key</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: tintColor }]}
                value={configForm.applicationKey}
                onChangeText={(text) => setConfigForm(prev => ({ ...prev, applicationKey: text }))}
                placeholder="Enter your Ecowitt application key"
                placeholderTextColor={textColor + '80'}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>API Key</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: tintColor }]}
                value={configForm.apiKey}
                onChangeText={(text) => setConfigForm(prev => ({ ...prev, apiKey: text }))}
                placeholder="Enter your Ecowitt API key"
                placeholderTextColor={textColor + '80'}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={styles.inputLabel}>Device MAC Address</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor: tintColor }]}
                value={configForm.macAddress}
                onChangeText={(text) => setConfigForm(prev => ({ ...prev, macAddress: text }))}
                placeholder="Enter your weather station MAC address"
                placeholderTextColor={textColor + '80'}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: tintColor }]}
              onPress={handleSaveConfig}
            >
              <ThemedText style={[styles.saveButtonText, { color: backgroundColor }]}>
                Save Configuration
              </ThemedText>
            </TouchableOpacity>

            {isConfigured && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfig(false)}
              >
                <ThemedText style={[styles.cancelButtonText, { color: tintColor }]}>
                  Cancel
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.infoCard}>
            <ThemedText type="subtitle" style={styles.infoTitle}>Setup Instructions</ThemedText>
            <ThemedText style={styles.infoText}>
              1. Log into your Ecowitt account at ecowitt.net{'\n'}
              2. Go to Account → API Management{'\n'}
              3. Generate an Application Key and API Key{'\n'}
              4. Find your device MAC address in Device Management{'\n'}
              5. Enter the credentials above
            </ThemedText>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={tintColor}
          />
        }
      >
        <View style={styles.header}>
          <ThemedText type="title">Standley Lake</ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.configIconButton, { borderColor: tintColor }]}
              onPress={() => setShowConfig(true)}
            >
              <ThemedText style={[styles.configIconText, { color: tintColor }]}>⚙️</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <ThemedText style={[styles.retryButtonText, { color: tintColor }]}>
                Retry
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
            <ThemedText style={styles.loadingText}>Fetching wind data...</ThemedText>
          </View>
        )}

        {/* Current Conditions */}
        <View style={[styles.currentConditionsCard, { backgroundColor: cardColor }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>Current Conditions</ThemedText>
          <View style={styles.currentConditionsGrid}>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Wind Speed</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {getCurrentWindSpeed()?.toFixed(1) || '--'} mph
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Direction</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {getWindDirectionText(getCurrentWindDirection())} ({getCurrentWindDirection()?.toFixed(0) || '--'}°)
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Data Points</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {windData.length}
              </ThemedText>
            </View>
            <View style={styles.conditionItem}>
              <ThemedText style={styles.conditionLabel}>Last Updated</ThemedText>
              <ThemedText style={styles.conditionValue}>
                {formatLastUpdated()}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Wind Chart */}
        {chartData.length > 0 ? (
          <View style={[styles.chartCard, { backgroundColor: cardColor }]}>
            <WindChart
              data={chartData}
              title="Today's Wind Speed"
              timeWindow={{ startHour: 0, endHour: 23 }} // Show full day
            />
          </View>
        ) : (
          <View style={[styles.noDataCard, { backgroundColor: cardColor }]}>
            <ThemedText style={styles.noDataText}>
              {isConfigured ? 'No wind data available for today' : 'Configure API to view wind data'}
            </ThemedText>
          </View>
        )}

        {/* Analysis */}
        {analysis && (
          <View style={[styles.analysisCard, { backgroundColor: cardColor }]}>
            <ThemedText type="subtitle" style={styles.cardTitle}>Wind Analysis</ThemedText>
            <ThemedText style={styles.analysisText}>
              Average Speed: {analysis.averageSpeed.toFixed(1)} mph{'\n'}
              Direction Consistency: {analysis.directionConsistency.toFixed(0)}%{'\n'}
              Consecutive Good Points: {analysis.consecutiveGoodPoints}{'\n'}
              {analysis.analysis}
            </ThemedText>
          </View>
        )}

        {/* Debug Actions */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <TouchableOpacity
              style={[styles.debugButton, { borderColor: tintColor }]}
              onPress={clearCache}
            >
              <ThemedText style={[styles.debugButtonText, { color: tintColor }]}>
                Clear Cache
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerActions: {
    flexDirection: 'row',
  },
  configIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configIconText: {
    fontSize: 18,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  configCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  configTitle: {
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  infoTitle: {
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  errorContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    flex: 1,
  },
  retryButton: {
    marginLeft: 12,
  },
  retryButtonText: {
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  currentConditionsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  cardTitle: {
    marginBottom: 12,
  },
  currentConditionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  conditionItem: {
    width: '48%',
    marginBottom: 12,
  },
  conditionLabel: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  conditionValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  chartCard: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  noDataCard: {
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  noDataText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  analysisCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  analysisText: {
    fontSize: 14,
    lineHeight: 20,
  },
  debugContainer: {
    margin: 16,
    paddingBottom: 32,
  },
  debugButton: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 14,
  },
});
