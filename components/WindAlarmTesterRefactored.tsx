import { Collapsible } from '@/components/Collapsible';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useCallback, useEffect, useReducer, useRef } from 'react';
import {
    AccessibilityInfo,
    Alert,
    Animated,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Import our new hooks
import { useAlarmAudio } from '@/hooks/useAlarmAudio';
import {
    WindAlarmState,
    initialWindAlarmState,
    windAlarmReducer
} from '@/hooks/useWindAlarmReducer';
import { useWindAnalyzer } from '@/hooks/useWindAnalyzer';

// Import test wind data generators

// Import for logging
import { AlarmLogger } from '@/services/alarmDebugLogger';

// Import styles
import { emergencyStyles } from './styles';

/**
 * WindAlarmTester - Enhanced Component
 * 
 * Tests wind alarm functionality with various scenarios.
 * Refactored to use specialized hooks for better separation of concerns:
 * - useAlarmAudio: Manages all alarm audio functionality
 * - useWindAnalyzer: Handles wind data analysis logic
 * - useWindAlarmReducer: Centralizes component state management
 */
export function WindAlarmTesterRefactored() {
  // Use the reducer for state management
  const [state, dispatch] = useReducer(windAlarmReducer, initialWindAlarmState);
  
  // Use specialized hooks
  const { 
    isPlaying, 
    isSoundEnabled, 
    isSnoozing,
    volume, 
    playAlarm, 
    stopAlarm,
    turnOffAlarm,
    setVolume,
    setSoundEnabled,
    setSnoozing
  } = useAlarmAudio();
  
  const {
    analyzeWindData,
    analyzeTestScenario,
    testScenarios,
    windData,
    isLoading,
    error: windDataError,
    // settings property omitted since it's not used
    updateSettings
  } = useWindAnalyzer();
  
  // References
  const snoozeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isScreenReaderEnabled = useRef(false);
  
  // Animation for pulsing alarm border
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Dynamic border color based on animation
  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FF4040', '#FF9000']
  });
  
  // Colors
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  // const cardColor = useThemeColor({}, 'card'); // Removed unused variable

  // Screen reader detection
  useEffect(() => {
    const checkScreenReader = async () => {
      try {
        const enabled = await AccessibilityInfo.isScreenReaderEnabled();
        isScreenReaderEnabled.current = enabled;
      } catch (err) {
        AlarmLogger.error('Error checking screen reader status', err);
      }
    };
    
    checkScreenReader();
    
    // Set up subscription for changes
    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      (screenReaderEnabled) => {
        isScreenReaderEnabled.current = screenReaderEnabled;
      }
    );
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Start/stop animation based on alarm state
  useEffect(() => {
    if (state.isAlarmActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
    
    return () => {
      pulseAnim.setValue(0);
    };
  }, [state.isAlarmActive, pulseAnim]);
  
  // Manage sound based on alarm state
  useEffect(() => {
    if (state.isAlarmActive && !isPlaying && isSoundEnabled && !isSnoozing) {
      playAlarm(volume);
    } else if (!state.isAlarmActive && isPlaying) {
      stopAlarm();
    }
  }, [state.isAlarmActive, isPlaying, isSoundEnabled, isSnoozing, playAlarm, stopAlarm, volume]);
  

  
  // Handle snooze timer
  useEffect(() => {
    // Clear any existing timer
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
      snoozeTimerRef.current = null;
    }

    // If snooze is enabled, set up a new timer
    if (state.isSnoozeEnabled && state.snoozeEnd) {
      const timeUntilEnd = state.snoozeEnd.getTime() - Date.now();
      
      if (timeUntilEnd > 0) {
        // Make sure our alarm audio service knows about snoozing
        setSnoozing(true);
        
        // Set timer to disable snooze when time expires
        snoozeTimerRef.current = setTimeout(() => {
          dispatch({ type: 'SNOOZE_EXPIRED' });
          setSnoozing(false);
        }, timeUntilEnd);
      } else {
        // If the time is already past, expire the snooze immediately
        dispatch({ type: 'SNOOZE_EXPIRED' });
        setSnoozing(false);
      }
    } else {
      // Ensure audio service has correct snooze state
      setSnoozing(false);
    }
    
    return () => {
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
      }
    };
  }, [state.isSnoozeEnabled, state.snoozeEnd, setSnoozing]);

  // Analyze selected scenario
  const analyzeScenario = useCallback(() => {
    AlarmLogger.lifecycle.start('analyzeScenario');
    AlarmLogger.forceLog(`Starting analysis with state: isTestScenarioActive=${state.isTestScenarioActive}, selectedTestScenario=${state.selectedTestScenario}`);
    
    try {
      let result;
      
      if (state.isTestScenarioActive && state.selectedTestScenario) {
        // Use test scenario
        AlarmLogger.forceLog(`Using test scenario: ${state.selectedTestScenario}`);
        result = analyzeTestScenario(state.selectedTestScenario);
        AlarmLogger.forceLog(`Test scenario analysis result:`, result);
      } else {
        // Use real data
        AlarmLogger.forceLog('Using real wind data');
        
        // Map UI property names to analyzer property names
        const criteriaSettings = {
          minimumAverageSpeed: state.minWindSpeed,
          directionConsistencyThreshold: state.directionConsistencyThreshold,
          minimumConsecutivePoints: state.minConsecutiveDataPoints,
          directionDeviationThreshold: state.maxDirectionDeviationDegrees,
          preferredDirection: state.preferredDirection,
          preferredDirectionRange: state.preferredDirectionRange,
          useWindDirection: state.useWindDirection
        };
        
        result = analyzeWindData(windData, criteriaSettings);
        AlarmLogger.forceLog(`Real data analysis result:`, result);
      }
      
      // Update state with analysis results
      dispatch({
        type: 'UPDATE_ANALYSIS_RESULT',
        payload: {
          quality: result.quality,
          directionConsistency: result.directionConsistency,
          averageSpeed: result.averageSpeed,
          favorablePoints: result.favorablePoints,
          details: result.details,
          time: new Date()
        }
      });
      
      // Update alarm status
      dispatch({ type: 'SET_ALARM_ACTIVE', payload: result.isAlarmWorthy });
      
      AlarmLogger.lifecycle.end('analyzeScenario', true);
      return result;
    } catch (error) {
      AlarmLogger.error('Error analyzing scenario', error);
      AlarmLogger.lifecycle.end('analyzeScenario', false);
      return null;
    }
  }, [
    state.isTestScenarioActive,
    state.selectedTestScenario,
    state.minWindSpeed,
    state.directionConsistencyThreshold,
    state.minConsecutiveDataPoints,
    state.maxDirectionDeviationDegrees,
    state.preferredDirection,
    state.preferredDirectionRange,
    state.useWindDirection,
    analyzeTestScenario,
    analyzeWindData,
    windData
  ]);

  // Run analysis when the test scenario or real data state changes
  useEffect(() => {
    if (state.isTestScenarioActive && state.selectedTestScenario) {
      AlarmLogger.forceLog(`Running analysis for newly selected scenario: ${state.selectedTestScenario}`);
      analyzeScenario();
    } else if (!state.isTestScenarioActive) {
      AlarmLogger.forceLog('Running analysis with real data after deactivating test scenario');
      // Add detailed debug information
      AlarmLogger.forceLog('Wind data analysis context:', {
        dataLength: windData?.length || 0,
        settings: {
          uiSettings: {
            minWindSpeed: state.minWindSpeed,
            directionConsistencyThreshold: state.directionConsistencyThreshold,
            minConsecutiveDataPoints: state.minConsecutiveDataPoints,
            maxDirectionDeviationDegrees: state.maxDirectionDeviationDegrees
          },
          mappedSettings: {
            minimumAverageSpeed: state.minWindSpeed,
            directionConsistencyThreshold: state.directionConsistencyThreshold,
            minimumConsecutivePoints: state.minConsecutiveDataPoints,
            directionDeviationThreshold: state.maxDirectionDeviationDegrees,
            preferredDirection: state.preferredDirection,
            preferredDirectionRange: state.preferredDirectionRange
          }
        }
      });
      analyzeScenario();
    }
  }, [
    state.isTestScenarioActive, 
    state.selectedTestScenario, 
    state.minWindSpeed,
    state.directionConsistencyThreshold,
    state.minConsecutiveDataPoints,
    state.maxDirectionDeviationDegrees,
    state.preferredDirection,
    state.preferredDirectionRange,
    state.useWindDirection,
    analyzeScenario, 
    windData
  ]);

  // Apply a snooze (commented out as it's currently unused)
  // const handleSnooze = useCallback((minutes: number) => {
  //   dispatch({ 
  //     type: 'SET_SNOOZE', 
  //     payload: { enabled: true, minutes } 
  //   });
    
  //   // If alarm is active, stop it
  //   if (isPlaying) {
  //     stopAlarm();
  //   }
  // }, [isPlaying, stopAlarm]);

  // Handle activation of a test scenario
  const activateTestScenario = useCallback((scenarioKey: string) => {
    AlarmLogger.forceLog(`Activating test scenario: ${scenarioKey}`);
    dispatch({ type: 'ACTIVATE_TEST_SCENARIO', payload: scenarioKey });
    // Analysis will be triggered by the useEffect that watches for scenario changes
  }, []);

  // Helper function to map UI property names to AlarmCriteria property names
  const mapPropertyName = useCallback((uiPropName: string): string => {
    const mappings: Record<string, string> = {
      'minWindSpeed': 'minimumAverageSpeed',
      'directionConsistencyThreshold': 'directionConsistencyThreshold', // no change
      'minConsecutiveDataPoints': 'minimumConsecutivePoints',
      'maxDirectionDeviationDegrees': 'directionDeviationThreshold',
      'preferredDirection': 'preferredDirection', // no change
      'preferredDirectionRange': 'preferredDirectionRange' // no change
    };
    return mappings[uiPropName] || uiPropName;
  }, []);

  // Update a setting
  const updateSetting = useCallback((setting: keyof WindAlarmState, value: any) => {
    dispatch({ 
      type: 'UPDATE_SETTING', 
      payload: { setting, value } 
    });
    
    // For analyzer settings, also update the analyzer
    if (
      setting === 'minWindSpeed' || 
      setting === 'directionConsistencyThreshold' || 
      setting === 'minConsecutiveDataPoints' || 
      setting === 'maxDirectionDeviationDegrees' ||
      setting === 'preferredDirection' ||
      setting === 'preferredDirectionRange'
    ) {
      const mappedSetting = mapPropertyName(setting);
      AlarmLogger.forceLog(`Mapping UI setting "${setting}" to AlarmCriteria property "${mappedSetting}"`);
      updateSettings({ 
        [mappedSetting]: value 
      });
    }
  }, [updateSettings, mapPropertyName]);

  // Emergency cleanup
  const handleEmergencyStop = useCallback(async () => {
    AlarmLogger.forceLog('🚨 EMERGENCY STOP REQUESTED');
    
    try {
      // Turn off alarm audio
      await turnOffAlarm();
      
      // Reset alarm state
      dispatch({ type: 'SET_ALARM_ACTIVE', payload: false });
      
      // Clear any snooze
      if (state.isSnoozeEnabled) {
        dispatch({ type: 'SET_SNOOZE', payload: { enabled: false } });
      }
      
      // Show confirmation
      Alert.alert('Emergency Stop', 'All alarm functions have been stopped.');
    } catch (error) {
      AlarmLogger.error('Error in emergency stop', error);
      Alert.alert('Error', 'Failed to stop alarm completely. Please restart the app.');
    }
  }, [turnOffAlarm, state.isSnoozeEnabled]);

  // Render scenario selection buttons  
  const renderScenarioButtons = () => {
    return (
      <View style={styles.scenarioButtonsContainer}>
        <ThemedText style={styles.sectionTitle}>Test Scenarios</ThemedText>
        <View style={styles.scenarioGrid}>
          {Object.keys(testScenarios).map((key) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.scenarioButton,
                state.selectedTestScenario === key && styles.scenarioButtonActive
              ]}
              onPress={() => activateTestScenario(key)}
            >
              <ThemedText style={styles.scenarioButtonText}>
                {testScenarios[key].name}
              </ThemedText>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={[
              styles.scenarioButton,
              !state.isTestScenarioActive && styles.scenarioButtonActive
            ]}
            onPress={() => dispatch({ type: 'DEACTIVATE_TEST_SCENARIO' })}
          >
            <ThemedText style={styles.scenarioButtonText}>
              Use Real Data
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render analysis results
  const renderAnalysisResults = () => {
    const { 
      windAnalysisQuality, 
      directionConsistencyPercentage, 
      averageSpeed,
      favorableConsecutivePoints,
      isAlarmActive
    } = state;
    
    return (
      <View style={styles.analysisResultsContainer}>
        <Animated.View
          style={[
            styles.alarmStatusContainer,
            {
              borderColor: isAlarmActive ? borderColor : 'transparent',
              backgroundColor: isAlarmActive ? 'rgba(255, 64, 64, 0.1)' : 'transparent'
            }
          ]}
        >
          <ThemedText style={styles.alarmStatusText}>
            {isAlarmActive ? 'WAKE UP! 🌊' : 'SLEEP IN 😴'}
          </ThemedText>
        </Animated.View>
        
        <View style={styles.metricsContainer}>
          <View style={styles.metricItem}>
            <ThemedText style={styles.metricLabel}>Quality</ThemedText>
            <ThemedText style={styles.metricValue}>
              {windAnalysisQuality.toFixed(0)}%
            </ThemedText>
          </View>
          
          <View style={styles.metricItem}>
            <ThemedText style={styles.metricLabel}>Direction</ThemedText>
            <ThemedText style={styles.metricValue}>
              {directionConsistencyPercentage.toFixed(0)}%
            </ThemedText>
          </View>
          
          <View style={styles.metricItem}>
            <ThemedText style={styles.metricLabel}>Speed</ThemedText>
            <ThemedText style={styles.metricValue}>
              {averageSpeed.toFixed(1)} mph
            </ThemedText>
          </View>
          
          <View style={styles.metricItem}>
            <ThemedText style={styles.metricLabel}>Consecutive</ThemedText>
            <ThemedText style={styles.metricValue}>
              {favorableConsecutivePoints}/{state.minConsecutiveDataPoints}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  };

  // Render alarm controls
  const renderAlarmControls = () => {
    return (
      <View style={styles.alarmControlsContainer}>
        <View style={styles.controlRow}>
          <ThemedText>Sound</ThemedText>
          <Switch
            value={isSoundEnabled}
            onValueChange={(value) => setSoundEnabled(value)}
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor={isSoundEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {isSoundEnabled && (
          <View style={styles.controlRow}>
            <ThemedText>Volume</ThemedText>
            <Slider
              style={styles.slider}
              value={volume}
              onValueChange={setVolume}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              minimumTrackTintColor={tintColor}
              maximumTrackTintColor="#BBBBBB"
            />
            <ThemedText>{Math.round(volume * 100)}%</ThemedText>
          </View>
        )}
        
        <View style={styles.controlRow}>
          <ThemedText>Snooze</ThemedText>
          <Switch
            value={state.isSnoozeEnabled}
            onValueChange={(value) => 
              dispatch({ 
                type: 'SET_SNOOZE', 
                payload: { enabled: value } 
              })
            }
            trackColor={{ false: '#767577', true: tintColor }}
            thumbColor={state.isSnoozeEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        
        {state.isSnoozeEnabled && (
          <View style={styles.controlRow}>
            <ThemedText>Snooze Time</ThemedText>
            <TextInput
              style={styles.textInput}
              value={state.snoozeMinutes.toString()}
              onChangeText={(text) => {
                const value = parseInt(text, 10);
                if (!isNaN(value) && value > 0) {
                  updateSetting('snoozeMinutes', value);
                }
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            <ThemedText>min</ThemedText>
          </View>
        )}
      </View>
    );
  };

  // Render settings
  const renderSettings = () => {
    return (
      <Collapsible 
        title="Analysis Settings" 
        initiallyExpanded={state.showAdvancedSettings}
      >
        <View style={styles.settingsContainer}>
          <View style={styles.settingItem}>
            <ThemedText>Minimum Wind Speed</ThemedText>
            <View style={styles.settingValueContainer}>
              <TextInput
                style={styles.textInput}
                value={state.minWindSpeed.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0) {
                    updateSetting('minWindSpeed', value);
                  }
                }}
                keyboardType="numeric"
                maxLength={4}
              />
              <ThemedText>mph</ThemedText>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <ThemedText>Direction Consistency</ThemedText>
            <View style={styles.settingValueContainer}>
              <TextInput
                style={styles.textInput}
                value={state.directionConsistencyThreshold.toString()}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  if (!isNaN(value) && value >= 0 && value <= 100) {
                    updateSetting('directionConsistencyThreshold', value);
                  }
                }}
                keyboardType="numeric"
                maxLength={3}
              />
              <ThemedText>%</ThemedText>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <ThemedText>Required Consecutive Points</ThemedText>
            <TextInput
              style={styles.textInput}
              value={state.minConsecutiveDataPoints.toString()}
              onChangeText={(text) => {
                const value = parseInt(text, 10);
                if (!isNaN(value) && value > 0) {
                  updateSetting('minConsecutiveDataPoints', value);
                }
              }}
              keyboardType="number-pad"
              maxLength={2}
            />
          </View>
          
          <View style={styles.settingItem}>
            <ThemedText>Max Direction Deviation</ThemedText>
            <View style={styles.settingValueContainer}>
              <TextInput
                style={styles.textInput}
                value={state.maxDirectionDeviationDegrees.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  if (!isNaN(value) && value >= 0 && value <= 180) {
                    updateSetting('maxDirectionDeviationDegrees', value);
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
              <ThemedText>°</ThemedText>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <ThemedText>Preferred Direction</ThemedText>
            <View style={styles.settingValueContainer}>
              <TextInput
                style={styles.textInput}
                value={state.preferredDirection.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  if (!isNaN(value) && value >= 0 && value <= 360) {
                    updateSetting('preferredDirection', value);
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
              <ThemedText>° (0-360)</ThemedText>
            </View>
          </View>
          
          <View style={styles.settingItem}>
            <ThemedText>Direction Range</ThemedText>
            <View style={styles.settingValueContainer}>
              <TextInput
                style={styles.textInput}
                value={state.preferredDirectionRange.toString()}
                onChangeText={(text) => {
                  const value = parseInt(text, 10);
                  if (!isNaN(value) && value >= 0 && value <= 180) {
                    updateSetting('preferredDirectionRange', value);
                  }
                }}
                keyboardType="number-pad"
                maxLength={3}
              />
              <ThemedText>° (±)</ThemedText>
            </View>
          </View>
        </View>
      </Collapsible>
    );
  };

  // Render debug information
  const renderDebugInfo = () => {
    if (!state.showDebugInfo) {
      return null;
    }
    
    return (
      <View style={styles.debugContainer}>
        <ThemedText style={styles.debugTitle}>Debug Information</ThemedText>
        
        <View style={styles.debugItem}>
          <ThemedText>Alarm Active: </ThemedText>
          <ThemedText style={state.isAlarmActive ? styles.debugActive : styles.debugInactive}>
            {state.isAlarmActive ? 'Yes' : 'No'}
          </ThemedText>
        </View>
        
        <View style={styles.debugItem}>
          <ThemedText>Audio Playing: </ThemedText>
          <ThemedText style={isPlaying ? styles.debugActive : styles.debugInactive}>
            {isPlaying ? 'Yes' : 'No'}
          </ThemedText>
        </View>
        
        <View style={styles.debugItem}>
          <ThemedText>Sound Enabled: </ThemedText>
          <ThemedText style={isSoundEnabled ? styles.debugActive : styles.debugInactive}>
            {isSoundEnabled ? 'Yes' : 'No'}
          </ThemedText>
        </View>
        
        <View style={styles.debugItem}>
          <ThemedText>Snooze Active: </ThemedText>
          <ThemedText style={state.isSnoozeEnabled ? styles.debugActive : styles.debugInactive}>
            {state.isSnoozeEnabled ? 'Yes' : 'No'}
          </ThemedText>
        </View>
        
        {state.isSnoozeEnabled && state.snoozeEnd && (
          <View style={styles.debugItem}>
            <ThemedText>Snooze End: </ThemedText>
            <ThemedText>
              {state.snoozeEnd.toLocaleTimeString()}
            </ThemedText>
          </View>
        )}
        
        <View style={styles.debugItem}>
          <ThemedText>Test Scenario: </ThemedText>
          <ThemedText>
            {state.isTestScenarioActive ? state.selectedTestScenario : 'Using real data'}
          </ThemedText>
        </View>
        
        <View style={styles.debugItem}>
          <ThemedText>Screen Reader: </ThemedText>
          <ThemedText>
            {isScreenReaderEnabled.current ? 'Enabled' : 'Disabled'}
          </ThemedText>
        </View>
        
        {state.lastAnalysisTime && (
          <View style={styles.debugItem}>
            <ThemedText>Last Analysis: </ThemedText>
            <ThemedText>
              {state.lastAnalysisTime.toLocaleTimeString()}
            </ThemedText>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      <ThemedView style={styles.headerContainer}>
        <ThemedText style={styles.title}>Wind Alarm Tester</ThemedText>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            onPress={() => dispatch({ type: 'TOGGLE_DEBUG_INFO' })}
            style={styles.iconButton}
          >
            <Ionicons name="bug-outline" size={24} color={textColor} />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={analyzeScenario}
            style={styles.iconButton}
          >
            <Ionicons name="refresh-outline" size={24} color={textColor} />
          </TouchableOpacity>
        </View>
      </ThemedView>
      
      {renderScenarioButtons()}
      
      {renderAnalysisResults()}
      
      {renderAlarmControls()}
      
      {renderSettings()}
      
      {renderDebugInfo()}
      
      <View style={styles.analysisDetailsContainer}>
        <ThemedText style={styles.analysisDetailsHeader}>Analysis Details</ThemedText>
        <ThemedText style={styles.analysisDetailsText}>
          {state.analysisDetails}
        </ThemedText>
      </View>
      
      <TouchableOpacity
        style={emergencyStyles.emergencyStopButton}
        onPress={handleEmergencyStop}
      >
        <ThemedText style={emergencyStyles.emergencyStopButtonText}>
          EMERGENCY STOP
        </ThemedText>
      </TouchableOpacity>
      
      {state.isSnoozeEnabled && (
        <View style={styles.snoozeIndicator}>
          <Ionicons name="alarm" size={20} color={tintColor} />
          <ThemedText style={styles.snoozeText}>
            Snooze active until {state.snoozeEnd?.toLocaleTimeString()}
          </ThemedText>
        </View>
      )}
      
      {(isLoading || windDataError) && (
        <View style={styles.dataStatusContainer}>
          {isLoading && (
            <ThemedText>Loading wind data...</ThemedText>
          )}
          {windDataError && (
            <ThemedText style={styles.errorText}>
              Error loading wind data: {windDataError.toString()}
            </ThemedText>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  scenarioButtonsContainer: {
    marginVertical: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  scenarioButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    margin: 4,
  },
  scenarioButtonActive: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: '#007AFF',
  },
  scenarioButtonText: {
    fontSize: 14,
  },
  alarmStatusContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  alarmStatusText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  analysisResultsContainer: {
    marginVertical: 8,
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  alarmControlsContainer: {
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 6,
    marginHorizontal: 8,
    textAlign: 'center',
    width: 50,
  },
  settingsContainer: {
    marginVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  settingValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  debugContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugItem: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  debugActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  debugInactive: {
    color: '#FF5722',
  },
  analysisDetailsContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 8,
  },
  analysisDetailsHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  analysisDetailsText: {
    fontSize: 14,
  },
  snoozeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  snoozeText: {
    marginLeft: 8,
    fontSize: 16,
  },
  dataStatusContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#F44336',
  }
});
