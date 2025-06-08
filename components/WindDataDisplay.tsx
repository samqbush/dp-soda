import { DataCrashDetector } from '@/components/DataCrashDetector';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { WindChart } from '@/components/WindChart';
import { useAlarmAudio } from '@/hooks/useAlarmAudio';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindData } from '@/hooks/useWindData';
import { AlarmLogger } from '@/services/alarmDebugLogger';
import { alarmNotificationService } from '@/services/alarmNotificationService';
import { crashMonitor } from '@/services/crashMonitor';
import { showDiagnosticInfo } from '@/services/diagnosticService';
import { globalCrashHandler } from '@/services/globalCrashHandler';
import { productionCrashDetector } from '@/services/productionCrashDetector';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';

export function WindDataDisplay() {
  useEffect(() => {
    console.log('🌊 WindDataDisplay mounted');
    productionCrashDetector.logUserAction('wind_data_display_loaded');
  }, []);

  const handleCrash = async (error: Error, info: any) => {
    console.error('🚨 WindDataDisplay crashed:', error);
    console.error('🚨 Crash info:', info);
    
    // Log crash details to both systems
    await crashMonitor.logCrash('WindDataDisplay', error);
    await globalCrashHandler.reportTestCrash('WindDataDisplay', error.message);
    
    // Show crash details in diagnostic
    const summary = crashMonitor.getCrashSummary();
    console.log('📊 Crash summary after WindDataDisplay crash:', summary);
  };

  return (
    <DataCrashDetector componentName="WindDataDisplay" onCrash={handleCrash}>
      <WindDataDisplayContent />
    </DataCrashDetector>
  );
}

function WindDataDisplayContent() {
  console.log('🌊 WindDataDisplayContent rendering...');
  
  // Alarm state for today
  const [alarmCheckedToday, setAlarmCheckedToday] = useState(false);
  const [nextAlarmCheckTime, setNextAlarmCheckTime] = useState<Date | null>(null);
  const alarmCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  const {
    windData,
    analysis,
    verification,
    isLoading,
    error,
    lastUpdated,
    refreshData,
    fetchRealData,
    criteria,
    setCriteria
  } = useWindData();
  
  // Use alarm audio hook
  const {
    isPlaying,
    playAlarm,
    stopAlarm,
    turnOffAlarm
  } = useAlarmAudio();

  console.log('🌊 WindDataDisplayContent - useWindData result:', {
    hasData: !!windData,
    isLoading,
    hasError: !!error,
    lastUpdated,
    alarmEnabled: criteria.alarmEnabled,
    alarmTime: criteria.alarmTime
  });

  // const textColor = useThemeColor({}, 'text'); // Removed unused variable
  const tintColor = useThemeColor({}, 'tint');
  // Remove unused backgroundColor for now
  // const backgroundColor = useThemeColor({}, 'background');

  const handleRefresh = async () => {
    try {
      productionCrashDetector.logUserAction('wind_data_refresh_requested');
      await refreshData();
      productionCrashDetector.logUserAction('wind_data_refresh_completed');
    } catch (err) {
      console.error('Refresh failed:', err);
      productionCrashDetector.logUserAction('wind_data_refresh_failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert('Error', 'Failed to refresh wind data. Please try again.');
    }
  };

  const handleFetchRealData = async () => {
    try {
      productionCrashDetector.logUserAction('real_data_fetch_requested');
      await fetchRealData();
      productionCrashDetector.logUserAction('real_data_fetch_completed');
    } catch (err) {
      console.error('Fetch real data failed:', err);
      productionCrashDetector.logUserAction('real_data_fetch_failed', { error: err instanceof Error ? err.message : String(err) });
      Alert.alert(
        'Error', 
        'Failed to fetch real data. This may be due to CORS restrictions in web environment or network issues.'
      );
    }
  };
  
  // Handle stopping the alarm
  const handleStopAlarm = useCallback(async () => {
    try {
      AlarmLogger.info('User manually stopped alarm');
      await stopAlarm();
      productionCrashDetector.logUserAction('alarm_stopped_by_user');
    } catch (err) {
      console.error('Failed to stop alarm:', err);
      
      // Try emergency turn off as fallback
      try {
        await turnOffAlarm();
      } catch (emergencyErr) {
        console.error('Emergency alarm turn off failed:', emergencyErr);
        Alert.alert('Error', 'Failed to stop alarm. Please restart the app.');
      }
    }
  }, [stopAlarm, turnOffAlarm]);
  
  // Toggle alarm enabled state
  const toggleAlarmEnabled = useCallback(async () => {
    try {
      const newState = !criteria.alarmEnabled;
      
      // If turning off and alarm is playing, stop it
      if (!newState && isPlaying) {
        await stopAlarm();
      }
      
      // Update criteria with new alarm state
      await setCriteria({ alarmEnabled: newState });
      
      // Set up or clear alarm timer based on new state
      if (newState) {
        scheduleNextAlarmCheck();
        
        // Show background alarm info on first enable
        if (alarmNotificationService.isNotificationSupported()) {
          const hasPermissions = await alarmNotificationService.requestPermissions();
          const message = hasPermissions
            ? "✅ Background alarms enabled! You'll receive notifications even when the app is closed."
            : "⚠️ For background alarms, please enable notifications in your device settings.\n\nFor now, keep the app open for alarms to work.";
          
          Alert.alert(
            hasPermissions ? "🎉 Background Alarms Ready!" : "📱 Foreground Alarms Only",
            message,
            [{ text: "Got it!", style: "default" }]
          );
        }
      } else if (alarmCheckTimerRef.current) {
        clearTimeout(alarmCheckTimerRef.current);
        alarmCheckTimerRef.current = null;
        setNextAlarmCheckTime(null);
      }
      
      productionCrashDetector.logUserAction('alarm_enabled_toggled', { newState });
    } catch (err) {
      console.error('Failed to toggle alarm:', err);
      Alert.alert('Error', 'Failed to update alarm settings.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.alarmEnabled, isPlaying, setCriteria, stopAlarm]);
  
  // Check if it's time to trigger the alarm
  const checkAlarmConditions = useCallback(async () => {
    if (!criteria.alarmEnabled) {
      console.log('Alarm is disabled, skipping check');
      return;
    }
    
    try {
      console.log('🔔 Checking alarm conditions...');
      productionCrashDetector.logUserAction('alarm_check_started');
      
      // Fetch fresh data
      await refreshData();
      
      // Check if conditions are favorable
      if (analysis?.isAlarmWorthy) {
        console.log('🔔 Alarm conditions met - triggering alarm!');
        AlarmLogger.success('Alarm conditions met - triggering alarm', {
          averageSpeed: analysis.averageSpeed,
          directionConsistency: analysis.directionConsistency,
          consecutiveGoodPoints: analysis.consecutiveGoodPoints
        });
        
        // Play alarm sound
        await playAlarm(0.7); // Start at 70% volume
        
        productionCrashDetector.logUserAction('alarm_triggered', {
          averageSpeed: analysis.averageSpeed,
          directionConsistency: analysis.directionConsistency,
          consecutiveGoodPoints: analysis.consecutiveGoodPoints
        });
      } else {
        console.log('🔔 Alarm conditions not met - no alarm');
        AlarmLogger.info('Alarm conditions not met', {
          averageSpeed: analysis?.averageSpeed || 0,
          directionConsistency: analysis?.directionConsistency || 0,
          consecutiveGoodPoints: analysis?.consecutiveGoodPoints || 0
        });
        
        productionCrashDetector.logUserAction('alarm_conditions_not_met');
      }
      
      // Mark as checked for today
      setAlarmCheckedToday(true);
      
      // Schedule for tomorrow
      scheduleNextAlarmCheck(true);
    } catch (err) {
      console.error('❌ Error checking alarm conditions:', err);
      productionCrashDetector.logUserAction('alarm_check_failed', {
        error: err instanceof Error ? err.message : String(err)
      });
      
      // Still schedule next check in case of error
      scheduleNextAlarmCheck(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteria.alarmEnabled, refreshData, analysis, playAlarm]);

  // Calculate when to check alarm conditions (5 minutes before alarm time)
  const calculateNextAlarmCheckTime = useCallback(() => {
    if (!criteria.alarmEnabled || !criteria.alarmTime) {
      return null;
    }
    
    // Parse alarm time (HH:MM format)
    const [hours, minutes] = criteria.alarmTime.split(':').map(Number);
    
    // Create a date for today with the specified time
    const now = new Date();
    const alarmTime = new Date();
    alarmTime.setHours(hours, minutes, 0, 0);
    
    // Subtract 5 minutes for the check time
    const checkTime = new Date(alarmTime);
    checkTime.setMinutes(checkTime.getMinutes() - 5);
    
    // If the check time has already passed today, schedule for tomorrow
    if (checkTime < now) {
      checkTime.setDate(checkTime.getDate() + 1);
    }
    
    return checkTime;
  }, [criteria.alarmEnabled, criteria.alarmTime]);
  
  // Schedule the next alarm check
  const scheduleNextAlarmCheck = useCallback((forceReschedule = false) => {
    // Clear any existing timer
    if (alarmCheckTimerRef.current) {
      clearTimeout(alarmCheckTimerRef.current);
      alarmCheckTimerRef.current = null;
    }
    
    if (!criteria.alarmEnabled) {
      console.log('Alarm is disabled, not scheduling check');
      setNextAlarmCheckTime(null);
      return;
    }
    
    // Calculate next check time
    const nextCheckTime = calculateNextAlarmCheckTime();
    if (!nextCheckTime) {
      return;
    }
    
    // If already checked today and not forcing reschedule, schedule for tomorrow
    if (alarmCheckedToday && !forceReschedule) {
      nextCheckTime.setDate(nextCheckTime.getDate() + 1);
    }
    
    // Calculate milliseconds until next check
    const now = new Date();
    const msUntilCheck = nextCheckTime.getTime() - now.getTime();
    
    // If we're very close to the check time (within 30 seconds) or past it slightly,
    // check immediately to avoid missing the alarm
    if (msUntilCheck < 30000 && msUntilCheck > -60000) {
      console.log('🔔 Close to alarm check time, checking now');
      checkAlarmConditions();
      return;
    }
    
    console.log(`🔔 Scheduling next alarm check at ${nextCheckTime.toLocaleString()} (in ${Math.round(msUntilCheck / 60000)} minutes)`);
    
    // Set up timer (for foreground operation)
    alarmCheckTimerRef.current = setTimeout(() => {
      checkAlarmConditions();
    }, msUntilCheck);
    
    // Also schedule background notification as backup
    if (alarmNotificationService.isNotificationSupported() && msUntilCheck > 60000) {
      alarmNotificationService.scheduleAlarmNotification(
        criteria.alarmTime,
        '🌊 Dawn Patrol Alert!',
        'Time to check wind conditions - they might be favorable for your session!'
      ).catch(error => {
        console.warn('Failed to schedule background notification:', error);
      });
    }
    
    // Update state for UI
    setNextAlarmCheckTime(nextCheckTime);
    
  }, [criteria.alarmEnabled, criteria.alarmTime, calculateNextAlarmCheckTime, alarmCheckedToday, checkAlarmConditions]);
  
  // Reset alarm checked status at midnight
  useEffect(() => {
    const resetAlarmCheckedStatus = () => {
      const now = new Date();
      // If it's a new day (after midnight), reset checked status
      if (now.getHours() === 0 && now.getMinutes() < 5) {
        console.log('🔄 Resetting alarm checked status (new day)');
        setAlarmCheckedToday(false);
      }
    };
    
    // Check every hour if alarm status should be reset
    const intervalId = setInterval(resetAlarmCheckedStatus, 60 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  // Initial setup of alarm check timer
  useEffect(() => {
    // Clean up any existing timer before setting a new one
    return () => {
      if (alarmCheckTimerRef.current) {
        clearTimeout(alarmCheckTimerRef.current);
        alarmCheckTimerRef.current = null;
      }
    };
  }, []);
  
  // Schedule alarm check whenever criteria or checked status changes
  useEffect(() => {
    scheduleNextAlarmCheck();
  }, [criteria.alarmEnabled, criteria.alarmTime, alarmCheckedToday, scheduleNextAlarmCheck]);

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAlarmStatusColor = (isAlarmWorthy: boolean) => {
    return isAlarmWorthy ? '#4CAF50' : '#FF9800';
  };

  const getAlarmStatusText = (isAlarmWorthy: boolean) => {
    return isAlarmWorthy ? 'WAKE UP! 🌊' : 'Sleep In 😴';
  };

  // Calculate 6-9am validation results
  const calculate6to9amValidation = () => {
    console.log('🔍 Calculating 6-9am validation, total wind data points:', windData.length);
    
    if (!windData.length) {
      console.log('❌ No wind data available for 6-9am validation');
      return {
        averageSpeed: 0,
        pointCount: 0,
        metThreshold: false,
        hasData: false
      };
    }

    // Filter data for 6-9am window
    const filtered6to9amData = windData.filter(point => {
      const hour = new Date(point.time).getHours();
      return hour >= 6 && hour < 9;
    });

    console.log('🔍 6-9am filtered data points:', filtered6to9amData.length);
    console.log('🔍 Sample 6-9am times:', filtered6to9amData.slice(0, 3).map(p => new Date(p.time).toLocaleTimeString()));

    if (filtered6to9amData.length === 0) {
      console.log('❌ No data points found in 6-9am window');
      return {
        averageSpeed: 0,
        pointCount: 0,
        metThreshold: false,
        hasData: false
      };
    }

    // Calculate average wind speed - convert to number if needed
    const totalSpeed = filtered6to9amData.reduce((sum, point) => {
      const speed = typeof point.windSpeed === 'string' ? parseFloat(point.windSpeed) : point.windSpeed;
      return sum + (isNaN(speed) ? 0 : speed);
    }, 0);
    const averageSpeed = totalSpeed / filtered6to9amData.length;
    
    // Check if average meets 15 mph threshold
    const metThreshold = averageSpeed >= 15;

    console.log('✅ 6-9am validation result:', {
      averageSpeed: averageSpeed.toFixed(1),
      pointCount: filtered6to9amData.length,
      metThreshold,
      hasData: true
    });

    return {
      averageSpeed,
      pointCount: filtered6to9amData.length,
      metThreshold,
      hasData: true
    };
  };

  const validation6to9am = calculate6to9amValidation();

  // Show loading screen when initially loading and no data
  if (isLoading && !windData.length && !error) {
    return <LoadingScreen message="Loading wind data..." />;
  }

  // Fallback to sample data if there's an error and no data
  if (error && !windData.length) {
    console.log('💥 Error without data, displaying error screen:', error);
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="subtitle" style={styles.title}>Wind Conditions</ThemedText>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
          <ThemedText style={styles.debugText}>
            Debug Info:{'\n'}
            • Data points: {windData.length}{'\n'}
            • Loading: {isLoading ? 'Yes' : 'No'}{'\n'}
            • Last updated: {lastUpdated ? formatTime(lastUpdated) : 'Never'}
          </ThemedText>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: tintColor }]} 
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <ThemedText style={styles.refreshButtonText}>
              {isLoading ? 'Loading...' : 'Retry'}
            </ThemedText>
          </TouchableOpacity>
          {/* Only show in development mode */}
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.refreshButton, { backgroundColor: '#4CAF50', marginTop: 8 }]} 
              onPress={handleFetchRealData}
              disabled={isLoading}
            >
              <ThemedText style={styles.refreshButtonText}>
                📡 Real Data
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>
          Soda Lake Wind
        </ThemedText>
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: tintColor }]} 
            onPress={handleRefresh}
            disabled={isLoading}
          >
            <ThemedText style={styles.refreshButtonText}>
              {isLoading ? '🔄' : '↻'}
            </ThemedText>
          </TouchableOpacity>
          {/* Real Data button only shown in development mode */}
          {__DEV__ && (
            <TouchableOpacity 
              style={[styles.realDataButton, { backgroundColor: '#4CAF50' }]} 
              onPress={handleFetchRealData}
              disabled={isLoading}
            >
              <ThemedText style={styles.realDataButtonText}>
                📡 Real Data
              </ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {lastUpdated && (
        <View style={styles.statusRow}>
          <ThemedText style={styles.lastUpdated}>
            Last updated: {formatTime(lastUpdated)}
          </ThemedText>
          <TouchableOpacity 
            style={[
              styles.alarmIndicator, 
              { backgroundColor: criteria.alarmEnabled ? '#FF9500' : '#666' }
            ]}
            onPress={toggleAlarmEnabled}
          >
            <ThemedText style={styles.alarmIndicatorText}>
              ⏰ {criteria.alarmEnabled ? criteria.alarmTime : 'OFF'}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Display next scheduled alarm check if enabled */}
      {criteria.alarmEnabled && nextAlarmCheckTime && (
        <View style={styles.alarmScheduleRow}>
          <ThemedText style={styles.alarmScheduleText}>
            Next alarm check: {formatTime(nextAlarmCheckTime)}
          </ThemedText>
        </View>
      )}

      {analysis && (
        <View style={styles.analysisContainer}>
          <View style={[
            styles.alarmStatus, 
            { backgroundColor: getAlarmStatusColor(analysis.isAlarmWorthy) }
          ]}>
            <ThemedText style={styles.alarmStatusText}>
              {getAlarmStatusText(analysis.isAlarmWorthy)}
            </ThemedText>
          </View>

          <View style={styles.metricsContainer}>
            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.averageSpeed.toFixed(1)}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>mph avg</ThemedText>
            </View>

            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.directionConsistency.toFixed(0)}%
              </ThemedText>
              <ThemedText style={styles.metricLabel}>consistent</ThemedText>
            </View>

            <View style={styles.metric}>
              <ThemedText style={styles.metricValue}>
                {analysis.consecutiveGoodPoints}
              </ThemedText>
              <ThemedText style={styles.metricLabel}>good points</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.analysisText}>
            {analysis.analysis}
          </ThemedText>
        </View>
      )}
      
      {/* Show stop button when alarm is playing */}
      {isPlaying && (
        <TouchableOpacity
          style={styles.stopAlarmButton}
          onPress={handleStopAlarm}
        >
          <ThemedText style={styles.stopAlarmButtonText}>
            🔕 STOP ALARM
          </ThemedText>
        </TouchableOpacity>
      )}

      {verification && (
        <View style={styles.verificationContainer}>
          <ThemedText type="defaultSemiBold" style={styles.verificationTitle}>
            6-8am Verification:
          </ThemedText>
          <ThemedText style={styles.verificationText}>
            Avg: {verification.averageSpeed.toFixed(1)}mph, 
            Consistency: {verification.directionConsistency.toFixed(0)}%
          </ThemedText>
          <ThemedText style={styles.verificationStatus}>
            {verification.isAlarmWorthy ? '✅ Conditions confirmed' : '❌ Conditions changed'}
          </ThemedText>
        </View>
      )}

      {windData.length > 0 && (
        <WindChart 
          data={windData} 
          title="3am-5am Alarm Window (Dawn Patrol)" 
          highlightGoodPoints={true}
          criteria={criteria}
          timeWindow={{ startHour: 3, endHour: 5 }}
        />
      )}

      {windData.length > 0 && (
        <WindChart 
          data={windData} 
          title="6am-9am Actual Conditions" 
          highlightGoodPoints={false}
          timeWindow={{ startHour: 6, endHour: 9 }}
        />
      )}

      {windData.length > 0 && validation6to9am.hasData && (
        <View style={styles.validation6to9amContainer}>
          <ThemedText type="defaultSemiBold" style={styles.validation6to9amTitle}>
            6-9am Wind Validation:
          </ThemedText>
          <ThemedText style={styles.validation6to9amText}>
            Average: {validation6to9am.averageSpeed.toFixed(1)} mph ({validation6to9am.pointCount} data points)
          </ThemedText>
          <ThemedText style={[
            styles.validation6to9amStatus,
            { color: validation6to9am.metThreshold ? '#4CAF50' : '#FF9800' }
          ]}>
            {validation6to9am.metThreshold 
              ? '✅ Met 15 mph threshold - conditions delivered!' 
              : '⚠️ Below 15 mph average - conditions did not deliver'
            }
          </ThemedText>
        </View>
      )}

      {windData.length > 0 && !validation6to9am.hasData && (
        <View style={styles.validation6to9amContainer}>
          <ThemedText style={styles.validation6to9amNoData}>
            📊 No 6-9am data available for validation yet
          </ThemedText>
        </View>
      )}

      {/* Debug info for 6-9am validation */}
      {__DEV__ && windData.length > 0 && (
        <View style={styles.devInfo}>
          <ThemedText style={styles.devInfoText}>
            Debug: 6-9am validation - hasData: {validation6to9am.hasData ? 'Yes' : 'No'}, 
            pointCount: {validation6to9am.pointCount}, 
            avg: {validation6to9am.averageSpeed.toFixed(1)}mph
          </ThemedText>
        </View>
      )}

      {windData.length > 0 && (
        <View style={styles.chartExplanation}>
          <ThemedText style={styles.chartExplanationTitle}>Chart Verification Guide:</ThemedText>
          <ThemedText style={styles.chartExplanationText}>
            • First chart: 3am-5am window used for alarm analysis{'\n'}
            • Second chart: 6am-9am actual conditions for verification{'\n'}
            • Validation above checks if 6-9am average met 15 mph threshold{'\n'}
            • Green circles highlight &ldquo;good points&rdquo; (≥{criteria.minimumAverageSpeed}mph wind speed){'\n'}
            • Need {criteria.minimumConsecutivePoints} consecutive good points for alarm{'\n'}
            • Wind direction arrows show where wind is coming FROM{'\n'}
            • Direction consistency must be ≥{criteria.directionConsistencyThreshold}%
          </ThemedText>
        </View>
      )}

      {windData.length > 0 && (
        <View style={styles.dataInfo}>
          <ThemedText style={styles.dataInfoText}>
            📊 {windData.length} data points (24h)
          </ThemedText>
        </View>
      )}

      {error && (
        <ThemedText style={styles.errorText}>
          ⚠️ {error} (showing cached data)
        </ThemedText>
      )}
      
      {/* Wind Data Quality Indicator */}
      <View style={styles.dataQualityRow}>
        <ThemedText style={[styles.dataQualityText, { 
          color: windData.length > 0 ? '#4CAF50' : '#F44336'
        }]}>
          {windData.length > 0 
            ? `🌐 Live Wind Data (${windData.length} points from Soda Lake sensors)`
            : '⚠️ No Wind Data Available - Check connection or try refresh'
          }
        </ThemedText>
      </View>

      {/* Diagnostics button - only show in development or if there are errors */}
      {(__DEV__ || error) && (
        <TouchableOpacity 
          style={styles.diagnosticButton} 
          onPress={showDiagnosticInfo}
        >
          <ThemedText style={styles.diagnosticButtonText}>
            📊 Run Diagnostics
          </ThemedText>
        </TouchableOpacity>
      )}
      
      {/* Dev info - only in development builds */}
      {__DEV__ && (
        <View style={styles.devInfo}>
          <ThemedText style={styles.devInfoText}>
            Platform: {Platform.OS} {Platform.Version}
          </ThemedText>
          <View style={styles.devInfoRow}>
            <ThemedText style={styles.devInfoText}>
              Alarm enabled: {criteria.alarmEnabled ? 'Yes' : 'No'}
            </ThemedText>
            <ThemedText style={styles.devInfoText}>
              Alarm time: {criteria.alarmTime}
            </ThemedText>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
  },
  refreshButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 40,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  realDataButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: 'center',
  },
  realDataButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lastUpdated: {
    fontSize: 12,
    opacity: 0.7,
  },
  alarmIndicator: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alarmIndicatorText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alarmScheduleRow: {
    marginBottom: 12,
  },
  alarmScheduleText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'right',
  },
  stopAlarmButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  stopAlarmButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  analysisContainer: {
    marginVertical: 8,
  },
  alarmStatus: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  alarmStatusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  analysisText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  verificationContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
  },
  verificationTitle: {
    marginBottom: 4,
  },
  verificationText: {
    fontSize: 14,
    marginBottom: 4,
  },
  verificationStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataInfo: {
    marginTop: 8,
    alignItems: 'center',
  },
  dataInfoText: {
    fontSize: 12,
    opacity: 0.6,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF5252',
    textAlign: 'center',
    marginBottom: 8,
  },
  debugText: {
    color: '#FF9800',
    textAlign: 'left',
    fontSize: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    padding: 8,
    borderRadius: 4,
  },
  diagnosticButton: {
    backgroundColor: '#2196F3',
    padding: 8,
    borderRadius: 8,
    marginTop: 16,
    alignSelf: 'center',
  },
  diagnosticButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  devInfo: {
    marginTop: 12,
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 4,
    alignSelf: 'center',
  },
  devInfoText: {
    fontSize: 10,
    opacity: 0.6,
  },
  devInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 4,
  },
  chartExplanation: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
  },
  chartExplanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#4CAF50',
  },
  chartExplanationText: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.8,
  },
  validation6to9amContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: 8,
  },
  validation6to9amTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#2196F3',
  },
  validation6to9amText: {
    fontSize: 14,
    marginBottom: 4,
  },
  validation6to9amStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  validation6to9amNoData: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  dataQualityRow: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dataQualityText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
