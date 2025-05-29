import { Collapsible } from '@/components/Collapsible';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import {
  analyzeWindData,
  verifyWindConditions,
  type AlarmCriteria,
  type WindAnalysis,
  type WindDataPoint
} from '@/services/windService';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View
} from 'react-native';

// Predefined wind scenarios for testing
const WIND_SCENARIOS = {
  goodEarlyMorning: generateGoodMorningData(),
  weakEarlyMorning: generateWeakMorningData(),
  inconsistentDirection: generateInconsistentDirectionData(),
  wrongDirection: generateWrongDirectionData(),
  tooFewGoodPoints: generateFewGoodPointsData(),
  noData: [] as WindDataPoint[],
  custom: [] as WindDataPoint[], // Will be generated based on user inputs
};

type ScenarioKey = keyof typeof WIND_SCENARIOS;

// Snooze durations in minutes
const SNOOZE_OPTIONS = [5, 10, 15];

export function WindAlarmTesterFixed() {
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>('goodEarlyMorning');
  const [criteria, setCriteria] = useState<AlarmCriteria>({
    minimumAverageSpeed: 10,
    directionConsistencyThreshold: 70,
    minimumConsecutivePoints: 4,
    directionDeviationThreshold: 45,
    preferredDirection: 315, // Northwest
    preferredDirectionRange: 45, // +/- 45 degrees from preferred direction
    alarmEnabled: true,
    alarmTime: "05:00"
  });
  const [analysis, setAnalysis] = useState<WindAnalysis | null>(null);
  const [verification, setVerification] = useState<WindAnalysis | null>(null);
  const [customSpeed, setCustomSpeed] = useState('12');
  const [customDirection, setCustomDirection] = useState('315');
  const [customVariation, setCustomVariation] = useState('20');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [snoozeEnabled, setSnoozeEnabled] = useState(false);
  const [snoozeDuration, setSnoozeDuration] = useState(5); // Default 5 minutes
  const [snoozeEndTime, setSnoozeEndTime] = useState<Date | null>(null);
  const snoozeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const continuousPlayCheckRef = useRef<NodeJS.Timeout | null>(null);
  
  // Sound reference
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Animation for pulsing border
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const cardColor = useThemeColor({}, 'card');
  
  // Dynamic border color based on animation
  const borderColor = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FF4040', '#FF9000']
  });

  // Check for screen reader
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(
      screenReaderEnabled => {
        setIsScreenReaderEnabled(screenReaderEnabled);
      }
    );
  }, []);

  // Update analysis when scenario or criteria changes
  useEffect(() => {
    analyzeScenario();
  }, [selectedScenario, criteria]);
  
  // Generate custom scenario data when custom inputs change
  useEffect(() => {
    if (selectedScenario === 'custom') {
      const speed = parseFloat(customSpeed) || 10;
      const direction = parseFloat(customDirection) || 315;
      const variation = parseFloat(customVariation) || 20;
      
      WIND_SCENARIOS.custom = generateCustomData(speed, direction, variation);
      analyzeScenario();
    }
  }, [customSpeed, customDirection, customVariation, selectedScenario]);

  // Start pulsing animation when alarm is playing
  useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false,
          })
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
    }
  }, [isPlaying]);

  // Update sound volume when volume changes
  useEffect(() => {
    if (soundRef.current && isPlaying) {
      soundRef.current.setVolumeAsync(volume).catch(err => {
        console.error('Error setting volume:', err);
      });
    }
  }, [volume]);

  const analyzeScenario = () => {
    const data = WIND_SCENARIOS[selectedScenario];
    
    // Create a date to test early morning hours (3am-5am)
    const testDate = new Date();
    testDate.setHours(4, 30, 0, 0); // 4:30 AM
    
    console.log(`Analyzing scenario "${selectedScenario}" with ${data.length} data points`);
    console.log(`First data point:`, data[0]);
    
    // Debug: Check if any points fall within the 3am-5am window
    const alarmStart = new Date();
    alarmStart.setHours(3, 0, 0, 0);
    const alarmEnd = new Date();
    alarmEnd.setHours(5, 0, 0, 0);
    
    const earlyMorningPoints = data.filter(point => {
      const pointTime = new Date(point.time);
      return pointTime.getHours() >= 3 && pointTime.getHours() <= 5; 
    });
    
    console.log(`Found ${earlyMorningPoints.length} points in early morning window`);
    if (earlyMorningPoints.length > 0) {
      console.log('Sample early morning point:', earlyMorningPoints[0]);
    }
    
    const newAnalysis = analyzeWindData(data, criteria, testDate);
    console.log(`Analysis result:`, newAnalysis);
    setAnalysis(newAnalysis);
    
    // Also verify conditions for the 6am-8am window
    const newVerification = verifyWindConditions(data, criteria, testDate);
    console.log(`Verification result:`, newVerification);
    setVerification(newVerification);
    
    // For immediate testing - if it should be alarm worthy, play the sound
    if (newAnalysis.isAlarmWorthy && soundEnabled && !isPlaying) {
      console.log('Analysis indicates alarm worthy - playing sound');
      setTimeout(() => playAlarmSound(), 500);
    }
  };

  const handleCriteriaChange = (key: keyof AlarmCriteria, value: any) => {
    setCriteria({ ...criteria, [key]: value });
  };

  const getAlarmStatusColor = (isAlarmWorthy?: boolean) => {
    return isAlarmWorthy ? '#4CAF50' : '#FF9800';
  };

  // Load and play alarm sound
  const playAlarmSound = async () => {
    // Don't play if sound is disabled or we're in snooze mode
    if (!soundEnabled || snoozeEnabled) {
      console.log("⚠️ Sound is disabled or alarm is snoozed - not playing");
      return false;
    }
    
    // If already playing, don't restart
    if (isPlaying) {
      console.log("ℹ️ Alarm already playing - not restarting");
      return true;
    }
    
    console.log("🎵 Attempting to play alarm sound...");
    
    try {
      // Vibration pattern for alarm (if supported)
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          console.log("📳 Triggering vibration");
          // Use repeating vibration pattern
          Vibration.vibrate([0, 300, 150, 300], true); // true means repeat
        } catch (err) {
          console.log('⚠️ Vibration not supported:', err);
        }
      }
      
      if (soundRef.current) {
        // If we already have a sound loaded, just play it
        console.log("🔊 Sound object exists, checking status...");
        const status = await soundRef.current.getStatusAsync();
        console.log("Sound status:", status);
        
        if (status.isLoaded) {
          console.log("🔁 Sound is loaded, playing from beginning");
          await soundRef.current.setPositionAsync(0); // Start from beginning
          await soundRef.current.setVolumeAsync(volume); // Set volume (0.0 to 1.0)
          await soundRef.current.setIsLoopingAsync(true); // Ensure looping is enabled
          const playResult = await soundRef.current.playAsync();
          console.log("▶️ Play result:", playResult);
          setIsPlaying(true);
          
          // For screen readers
          if (isScreenReaderEnabled) {
            AccessibilityInfo.announceForAccessibility('Alarm is now playing');
          }
          
          return true;
        } else {
          console.log("⚠️ Sound somehow unloaded, reloading...");
          // If sound is somehow unloaded, reload it
          soundRef.current = null;
          return playAlarmSound(); // Recursive call to load and play
        }
      } else {
        // Load the sound first time
        console.log("🔄 Loading alarm sound for the first time...");
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true, // Keep playing in background
          shouldDuckAndroid: true,
        });
        
        console.log("📂 Creating sound from asset...");
        const soundAsset = require('../assets/sounds/alarm.mp3');
        console.log("Sound asset:", soundAsset);
        
        const { sound } = await Audio.Sound.createAsync(
          soundAsset,
          { 
            shouldPlay: true, 
            isLooping: true, // Ensure looping is enabled
            volume: volume 
          }
        );
        console.log("✅ Sound loaded successfully");
        soundRef.current = sound;
        setIsPlaying(true);
        
        // For screen readers
        if (isScreenReaderEnabled) {
          AccessibilityInfo.announceForAccessibility('Alarm is now playing');
        }
        
        // Set up finished handler with improved looping
        sound.setOnPlaybackStatusUpdate((status: any) => {
          console.log("🔄 Playback status update:", status);
          
          // Force continuous playback with multiple fallback methods
          if (status.didJustFinish && isPlaying) {
            console.log("🏁 Sound finished playing - manually restarting");
            
            // Try to use the proper method first
            sound.setPositionAsync(0)
              .then(() => sound.playAsync())
              .catch(err => {
                console.error('❌ Error restarting sound (method 1):', err);
                
                // Fallback method
                try {
                  sound.replayAsync();
                } catch (replayErr) {
                  console.error('❌ Error with replayAsync (method 2):', replayErr);
                  
                  // Last resort - create a new instance if all else fails
                  setTimeout(() => {
                    if (isPlaying) {
                      console.log("🚨 Using emergency playback restart");
                      soundRef.current = null;
                      playAlarmSound();
                    }
                  }, 300);
                }
              });
          }
          
          // Log any errors
          if (status.error) {
            console.error('❌ Sound playback error:', status.error);
          }
        });
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error playing alarm sound', error);
      Alert.alert(
        'Sound Error', 
        'Could not play alarm sound. Please check if your device has audio enabled.',
        [{ text: 'OK' }]
      );
      setIsPlaying(false);
      return false;
    }
  };

  const stopAlarmSound = async () => {
    try {
      console.log("🛑 Attempting to stop alarm sound...");
      
      // Update UI state immediately for responsive feedback
      setIsPlaying(false);
      
      // First, stop vibration immediately for immediate feedback
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        try {
          console.log("📳 Stopping vibration");
          Vibration.cancel();
        } catch (err) {
          console.log('Error canceling vibration:', err);
        }
      }
      
      // Then try to stop the sound if it exists
      if (soundRef.current) {
        try {
          console.log("🔊 Getting sound status...");
          const status = await soundRef.current.getStatusAsync().catch(e => {
            console.log("Error getting sound status:", e);
            return { isLoaded: false };
          });
          
          if (status.isLoaded) {
            console.log("💤 Stopping loaded sound...");
            
            // Use Promise.all to run these operations in parallel for quicker response
            await Promise.all([
              // First pause it for immediate feedback
              soundRef.current.pauseAsync().catch(e => console.log("Error pausing sound:", e)),
              
              // Also try to disable looping to make sure it stays stopped
              soundRef.current.setIsLoopingAsync(false).catch(() => {})
            ]);
            
            // Then fully stop it
            await soundRef.current.stopAsync().catch(e => console.log("Error stopping sound:", e));
            
            // Also try to reset position just to be safe
            await soundRef.current.setPositionAsync(0).catch(() => {});
            
            console.log("✅ Sound stopped successfully");
          } else {
            console.log("⚠️ Sound was not loaded, no need to stop");
          }
        } catch (soundError) {
          console.error("❌ Error managing sound:", soundError);
          
          // As a last resort, try to unload the sound
          try {
            await soundRef.current.unloadAsync();
            console.log("🧹 Sound unloaded as fallback");
          } catch (unloadError) {
            console.error("Failed to unload sound:", unloadError);
          }
        }
      } else {
        console.log("⚠️ No sound reference found");
      }
      
      // For screen readers
      if (isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Alarm stopped');
      }
      
      console.log("🎯 Stop alarm process completed");
      return true; // Successfully stopped
    } catch (error) {
      console.error('❌ Error stopping sound', error);
      
      // Force the UI to update even if stopping failed
      setIsPlaying(false);
      
      // Still try to stop vibration even if sound stopping failed
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.cancel();
      }
      
      // If all else fails, try to create a new sound instance next time
      soundRef.current = null;
      
      // Return false to indicate failure, but we still updated UI
      return false;
    }
  };

  // Clean up the sound when component unmounts
  useEffect(() => {
    return () => {
      // Stop and unload sound
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
      }
      
      // Stop vibration
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.cancel();
      }
      
      // Clear all timers
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
      }
      
      if (continuousPlayCheckRef.current) {
        clearInterval(continuousPlayCheckRef.current);
      }
    };
  }, []);

  // Play/stop sound when analysis changes
  useEffect(() => {
    if (analysis?.isAlarmWorthy && soundEnabled && !isPlaying) {
      playAlarmSound();
    } else if (!analysis?.isAlarmWorthy && isPlaying) {
      stopAlarmSound();
    }
  }, [analysis?.isAlarmWorthy, soundEnabled, isPlaying]);

  // Continuous playback checker - ensures alarm keeps making sound
  useEffect(() => {
    // Clear any existing interval
    if (continuousPlayCheckRef.current) {
      clearInterval(continuousPlayCheckRef.current);
    }

    // Setup periodic check if alarm should be playing
    if (isPlaying && !snoozeEnabled) {
      continuousPlayCheckRef.current = setInterval(async () => {
        try {
          // Only check if alarm should still be playing
          if (soundRef.current && isPlaying) {
            const status = await soundRef.current.getStatusAsync();
            console.log("📢 Continuous playback check:", status);
            
            // If sound somehow stopped playing but should be playing, restart it
            if (status.isLoaded && !status.isPlaying && !snoozeEnabled) {
              console.log("🔄 Sound stopped unexpectedly, restarting...");
              await soundRef.current.playAsync();
            }
          }
        } catch (err) {
          console.error("Error in continuous playback check:", err);
        }
      }, 3000); // Check every 3 seconds
    }
    
    // Cleanup
    return () => {
      if (continuousPlayCheckRef.current) {
        clearInterval(continuousPlayCheckRef.current);
      }
    };
  }, [isPlaying, snoozeEnabled]);

  // Snooze the alarm for a specific number of minutes
  const snoozeAlarm = (minutes: number) => {
    // Stop the alarm
    stopAlarmSound();
    
    // Clear any existing snooze timer
    if (snoozeTimerRef.current) {
      clearTimeout(snoozeTimerRef.current);
    }
    
    // Set snooze state
    setSnoozeEnabled(true);
    setSnoozeDuration(minutes);
    
    // Calculate and set end time for UI display
    const endTime = new Date();
    endTime.setMinutes(endTime.getMinutes() + minutes);
    setSnoozeEndTime(endTime);
    
    // Set a timer to resume alarm after snooze period
    snoozeTimerRef.current = setTimeout(() => {
      setSnoozeEnabled(false);
      setSnoozeEndTime(null);
      
      // Only play alarm if it's still alarm-worthy
      if (analysis?.isAlarmWorthy && soundEnabled) {
        playAlarmSound();
      }
    }, minutes * 60 * 1000); // Convert minutes to milliseconds
    
    // Provide feedback for screen reader users
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(`Alarm snoozed for ${minutes} minutes`);
    }
  };
  
  // Turn off alarm completely
  const turnOffAlarm = async () => {
    try {
      console.log("🛑 Turning off alarm completely...");
      
      // Stop vibration immediately
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.cancel();
      }
      
      // Ensure the sound is properly stopped
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync().catch(() => ({ isLoaded: false }));
          if (status.isLoaded) {
            await soundRef.current.stopAsync().catch(e => console.log("Error stopping sound:", e));
            await soundRef.current.setIsLoopingAsync(false).catch(() => {});
            console.log("✅ Sound stopped successfully");
          }
        } catch (error) {
          console.error("Error stopping sound:", error);
        }
      }
      
      // Update UI state
      setIsPlaying(false);
      setSoundEnabled(false);
      
      // Clear any snooze timer
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
        setSnoozeEnabled(false);
        setSnoozeEndTime(null);
        console.log("⏱️ Cleared snooze timer");
      }
      
      // Provide feedback for screen reader users
      if (isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Alarm turned off completely');
      }
      
      console.log('✅ Alarm turned off completely');
    } catch (error) {
      console.error("❌ Error in turnOffAlarm:", error);
      
      // Ensure UI state is updated even if there was an error
      setIsPlaying(false);
      setSoundEnabled(false);
    }
  };
  
  // Clean up timers when component unmounts
  useEffect(() => {
    return () => {
      if (snoozeTimerRef.current) {
        clearTimeout(snoozeTimerRef.current);
      }
    };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <ThemedText style={styles.title}>Wind Alarm Tester</ThemedText>
        <ThemedText style={styles.description}>
          Test different wind scenarios to verify alarm logic
        </ThemedText>
        
        {/* Scenario Selection */}
        <ThemedView style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Select Test Scenario</ThemedText>
          <View style={styles.scenarioButtons}>
            {Object.keys(WIND_SCENARIOS).map((key) => (
              <TouchableOpacity
                key={key}
                style={[
                  styles.scenarioButton,
                  {
                    backgroundColor: selectedScenario === key ? tintColor : cardColor,
                    borderColor: tintColor,
                  }
                ]}
                onPress={() => setSelectedScenario(key as ScenarioKey)}
                accessibilityLabel={`Select ${formatScenarioName(key)} scenario`}
              >
                <Text style={{
                  color: selectedScenario === key ? 'white' : textColor,
                }}>
                  {formatScenarioName(key)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Custom Scenario Controls */}
          {selectedScenario === 'custom' && (
            <View style={styles.customControls}>
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Wind Speed (mph):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={customSpeed}
                  onChangeText={setCustomSpeed}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Wind speed in miles per hour"
                />
              </View>
              
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Wind Direction (°):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={customDirection}
                  onChangeText={setCustomDirection}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Wind direction in degrees"
                />
              </View>
              
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Variation (±°):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={customVariation}
                  onChangeText={setCustomVariation}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Direction variation in degrees"
                />
              </View>
            </View>
          )}
        </ThemedView>
        
        {/* Alarm Criteria Settings */}
        <ThemedView style={styles.card}>
          <Collapsible title="Alarm Criteria Settings" initiallyExpanded={false}>
            <View style={styles.criteriaContainer}>
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Min Speed (mph):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={criteria.minimumAverageSpeed.toString()}
                  onChangeText={(value) => handleCriteriaChange('minimumAverageSpeed', parseFloat(value) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Minimum average speed threshold"
                />
              </View>
              
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Direction Consistency (%):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={criteria.directionConsistencyThreshold.toString()}
                  onChangeText={(value) => handleCriteriaChange('directionConsistencyThreshold', parseFloat(value) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Direction consistency threshold percentage"
                />
              </View>
              
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Min Consecutive Points:</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={criteria.minimumConsecutivePoints.toString()}
                  onChangeText={(value) => handleCriteriaChange('minimumConsecutivePoints', parseInt(value) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Minimum consecutive data points required"
                />
              </View>
              
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Direction Deviation (°):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={criteria.directionDeviationThreshold.toString()}
                  onChangeText={(value) => handleCriteriaChange('directionDeviationThreshold', parseFloat(value) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Direction deviation threshold in degrees"
                />
              </View>
              
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Preferred Direction (°):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={criteria.preferredDirection.toString()}
                  onChangeText={(value) => handleCriteriaChange('preferredDirection', parseFloat(value) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Preferred wind direction in degrees"
                />
              </View>
              
              <View style={styles.inputRow}>
                <ThemedText style={styles.inputLabel}>Direction Range (±°):</ThemedText>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: tintColor }]}
                  value={criteria.preferredDirectionRange.toString()}
                  onChangeText={(value) => handleCriteriaChange('preferredDirectionRange', parseFloat(value) || 0)}
                  keyboardType="numeric"
                  placeholderTextColor="#888"
                  accessibilityLabel="Preferred direction range in degrees"
                />
              </View>
            </View>
          </Collapsible>
        </ThemedView>
        
        {/* Analysis Results */}
        <Animated.View style={{
          borderWidth: isPlaying ? 2 : 0,
          borderColor: borderColor,
          borderRadius: 14,
          marginBottom: 16,
        }}>
          <ThemedView style={styles.card}>
            <ThemedText style={styles.sectionTitle}>Alarm Analysis Results</ThemedText>
            
            {/* Sound Control */}
            <View style={styles.soundControlContainer}>
              <View style={styles.soundToggleRow}>
                <ThemedText style={styles.soundControlLabel}>Enable Alarm Sound:</ThemedText>
                <Switch 
                  value={soundEnabled} 
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: '#767577', true: tintColor }}
                  thumbColor={soundEnabled ? '#ffffff' : '#f4f3f4'}
                  accessibilityLabel="Toggle alarm sound"
                  accessibilityHint="Double tap to turn alarm sound on or off"
                />
              </View>
              
              {soundEnabled && (
                <>
                  <View style={styles.soundStatusRow}>
                    <ThemedText style={styles.soundStatusLabel}>
                      Status: <ThemedText style={{color: isPlaying ? '#FF4040' : '#4CAF50'}}>
                        {isPlaying ? 'PLAYING' : 'READY'}
                      </ThemedText>
                    </ThemedText>
                    
                    {!isPlaying && (
                      <TouchableOpacity 
                        onPress={() => {
                          console.log("🟢 Play button pressed");
                          playAlarmSound().catch(err => console.error("Error in play button press:", err));
                        }}
                        style={styles.playButton}
                        accessibilityLabel="Play alarm sound"
                        accessibilityHint="Double tap to play the alarm sound"
                      >
                        <Ionicons name="play-circle" size={28} color="#4CAF50" />
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {/* Snooze and Turn Off Controls - Display when alarm is playing */}
                  {isPlaying && (
                    <View style={styles.alarmControlsContainer}>
                      {/* Snooze buttons */}
                      <View style={styles.snoozeControlsRow}>
                        <ThemedText style={styles.snoozeLabel}>Snooze for:</ThemedText>
                        <View style={styles.snoozeButtons}>
                          {[5, 10, 15].map(mins => (
                            <TouchableOpacity
                              key={`snooze-${mins}`}
                              style={styles.snoozeButton}
                              onPress={() => snoozeAlarm(mins)}
                              accessibilityLabel={`Snooze for ${mins} minutes`}
                              accessibilityHint={`Double tap to snooze alarm for ${mins} minutes`}
                            >
                              <ThemedText style={styles.snoozeButtonText}>{mins}m</ThemedText>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      
                      {/* Turn off button */}
                      <TouchableOpacity
                        style={styles.turnOffButton}
                        onPress={async () => {
                          console.log("🔴 Turn Off Alarm button pressed");
                          
                          try {
                            // Stop vibration immediately for responsive feedback
                            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                              Vibration.cancel();
                            }
                            
                            // Update UI state immediately for responsive feedback
                            setIsPlaying(false);
                            setSoundEnabled(false);
                            
                            // If snooze timer is active, clear it
                            if (snoozeTimerRef.current) {
                              clearTimeout(snoozeTimerRef.current);
                              setSnoozeEnabled(false);
                              setSnoozeEndTime(null);
                            }
                            
                            // Then handle the sound stopping async operation
                            if (soundRef.current) {
                              const status = await soundRef.current.getStatusAsync().catch(() => ({ isLoaded: false }));
                              if (status.isLoaded) {
                                await soundRef.current.stopAsync().catch(() => {});
                                console.log("✅ Sound stopped successfully");
                              }
                            }
                            
                            // For screen readers
                            if (isScreenReaderEnabled) {
                              AccessibilityInfo.announceForAccessibility('Alarm turned off completely');
                            }
                            
                            console.log('✅ Alarm turned off completely');
                          } catch (error) {
                            console.error("❌ Error turning off alarm:", error);
                          }
                        }}
                        accessibilityLabel="Turn off alarm"
                        accessibilityHint="Double tap to completely turn off alarm"
                      >
                        <Ionicons name="power" size={20} color="#fff" />
                        <ThemedText style={styles.turnOffButtonText}>Turn Off Alarm</ThemedText>
                      </TouchableOpacity>
                    </View>
                  )}
                  
                  {/* Show snooze status if alarm is snoozed */}
                  {snoozeEnabled && snoozeEndTime && (
                    <View style={styles.snoozeStatusContainer}>
                      <Ionicons name="alarm-outline" size={20} color="#FF9800" />
                      <ThemedText style={styles.snoozeStatusText}>
                        Snoozed for {snoozeDuration} minutes (resumes at {snoozeEndTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                      </ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.volumeControlRow}>
                    <ThemedText style={styles.volumeLabel}>Volume:</ThemedText>
                    <View style={styles.sliderContainer}>
                      <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={1}
                        value={volume}
                        onValueChange={setVolume}
                        minimumTrackTintColor={tintColor}
                        maximumTrackTintColor="#CCCCCC"
                        thumbTintColor={tintColor}
                        step={0.1}
                        accessibilityLabel="Adjust volume"
                        accessibilityHint={`Current volume is ${Math.round(volume * 100)} percent`}
                      />
                      <ThemedText style={styles.volumeValue}>{Math.round(volume * 100)}%</ThemedText>
                    </View>
                  </View>
                </>
              )}
            </View>
            
            {/* Analysis Results Display */}
            <View style={styles.resultsContainer}>
              <ThemedText style={styles.resultLabel}>Selected Scenario:</ThemedText>
              <ThemedText style={styles.resultValue}>
                {formatScenarioName(selectedScenario)}
              </ThemedText>
              
              <ThemedText style={styles.resultLabel}>Analysis Time:</ThemedText>
              <ThemedText style={styles.resultValue}>
                {new Date().toLocaleString() || 'N/A'}
              </ThemedText>
              
              <ThemedText style={styles.resultLabel}>Is Alarm Worthy?</ThemedText>
              <View style={styles.alarmStatusContainer}>
                <ThemedText 
                  style={[
                    styles.resultValue, 
                    styles.alarmStatusText, 
                    { color: getAlarmStatusColor(analysis?.isAlarmWorthy) }
                  ]}
                >
                  {analysis?.isAlarmWorthy ? 'YES' : 'NO'}
                </ThemedText>
                <Ionicons 
                  name={analysis?.isAlarmWorthy ? "alarm" : "alarm-outline"} 
                  size={24} 
                  color={getAlarmStatusColor(analysis?.isAlarmWorthy)} 
                />
              </View>
              
              <ThemedText style={styles.resultLabel}>Average Speed:</ThemedText>
              <ThemedText style={styles.resultValue}>
                {analysis?.averageSpeed.toFixed(2)} mph
              </ThemedText>
              
              <ThemedText style={styles.resultLabel}>Direction Consistency:</ThemedText>
              <ThemedText style={styles.resultValue}>
                {analysis?.directionConsistency.toFixed(2)}%
              </ThemedText>
              
              <ThemedText style={styles.resultLabel}>Consecutive Good Points:</ThemedText>
              <ThemedText style={styles.resultValue}>
                {analysis?.consecutiveGoodPoints}
              </ThemedText>
              
              <ThemedText style={styles.resultLabel}>Direction Information:</ThemedText>
              <ThemedText style={styles.resultValue}>
                Consistency: {analysis?.directionConsistency.toFixed(2) || 'N/A'}%
              </ThemedText>
              
              <ThemedText style={styles.resultLabel}>Analysis Details:</ThemedText>
              <ThemedText style={styles.resultValue}>
                {analysis?.analysis || 'Analysis based on early morning window (3am-5am).'}
              </ThemedText>
              
              <ThemedText style={styles.resultLabel}>Verification Match:</ThemedText>
              <ThemedText 
                style={[
                  styles.resultValue, 
                  { 
                    color: verification?.isAlarmWorthy === analysis?.isAlarmWorthy 
                      ? '#4CAF50' 
                      : '#FF9800' 
                  }
                ]}
              >
                {verification?.isAlarmWorthy === analysis?.isAlarmWorthy ? 'Yes ✓' : 'No ✗'}
              </ThemedText>
            </View>
          </ThemedView>
        </Animated.View>
        
        {/* Debug Info */}
        <ThemedView style={styles.card}>
          <Collapsible title="Debug Information" initiallyExpanded={false}>
            <View style={{marginBottom: 16}}>
              <ThemedText style={styles.debugTitle}>Alarm Trigger Status:</ThemedText>
              <View style={styles.debugMetricsContainer}>
                <View style={styles.debugMetricItem}>
                  <ThemedText style={styles.debugLabel}>Alarm Worthy:</ThemedText>
                  <ThemedText style={{
                    ...styles.debugValue, 
                    color: analysis?.isAlarmWorthy ? '#4CAF50' : '#FF9800'
                  }}>
                    {analysis?.isAlarmWorthy ? 'YES' : 'NO'}
                  </ThemedText>
                </View>
                <View style={styles.debugMetricItem}>
                  <ThemedText style={styles.debugLabel}>Sound Enabled:</ThemedText>
                  <ThemedText style={styles.debugValue}>{soundEnabled ? 'YES' : 'NO'}</ThemedText>
                </View>
                <View style={styles.debugMetricItem}>
                  <ThemedText style={styles.debugLabel}>Currently Playing:</ThemedText>
                  <ThemedText style={styles.debugValue}>{isPlaying ? 'YES' : 'NO'}</ThemedText>
                </View>
                <TouchableOpacity 
                  style={styles.debugButton}
                  onPress={() => {
                    console.log("🔵 Force Play Sound button pressed");
                    playAlarmSound().catch(err => console.error("Error in force play button press:", err));
                  }}
                >
                  <ThemedText style={styles.debugButtonText}>Force Play Sound</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
            <ThemedText style={styles.debugText}>
              {JSON.stringify(analysis, null, 2)}
            </ThemedText>
          </Collapsible>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

function formatScenarioName(key: string) {
  const formatted = key
    .replace(/([A-Z])/g, ' $1') // Insert space before uppercase letters
    .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
  
  return formatted;
}

// Generate functions for predefined scenarios
function generateGoodMorningData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseTime = new Date();
  baseTime.setHours(0, 0, 0, 0);
  
  console.log("Generating goodEarlyMorning data with baseTime:", baseTime.toISOString());
  
  // Generate 24 hours of data, with multiple points per early morning hour to ensure we have enough consecutive points
  for (let hour = 0; hour < 24; hour++) {
    // For early morning hours (3-5), create multiple points per hour
    const pointsPerHour = (hour >= 3 && hour <= 5) ? 4 : 1;
    
    for (let j = 0; j < pointsPerHour; j++) {
      const pointTime = new Date(baseTime);
      pointTime.setHours(hour);
      // For multiple points in an hour, space them out
      if (pointsPerHour > 1) {
        pointTime.setMinutes((j * 60) / pointsPerHour);
      }
      
      let speed: number;
      let direction: number;
      
      // Early morning (3am-5am) - good conditions - GUARANTEED to be alarm worthy
      if (hour >= 3 && hour <= 5) {
        speed = 15; // Well above the 10mph threshold
        direction = 315; // Exactly the preferred NW direction
        console.log(`Creating early morning point for hour ${hour}:${pointTime.getMinutes()}: speed=${speed}, direction=${direction}`);
      } 
      // 6am-8am - verification window
      else if (hour >= 6 && hour <= 8) {
        speed = 15; // Strong wind continues
        direction = 315; // Same direction continues
      }
      // Rest of the day - variable
      else {
        speed = 5 + Math.random() * 5; // 5-10 mph (below threshold)
        direction = Math.random() * 360; // random direction
      }
      
      const dataPoint = {
        time: pointTime.toISOString(),
        windSpeed: speed.toString(),
        windGust: (speed + 2 + Math.random() * 3).toFixed(1),
        windDirection: direction.toString(),
      };
      
      // Extra debug for early morning points
      if (hour >= 3 && hour <= 5) {
        console.log(`Early morning point at ${hour}:${pointTime.getMinutes()}:`, dataPoint);
      }
      
      data.push(dataPoint);
    }
  }
  
  console.log(`Generated ${data.length} data points total, with extra points in the alarm window.`);
  
  return data;
}

function generateWeakMorningData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseTime = new Date();
  baseTime.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24; i++) {
    const pointTime = new Date(baseTime);
    pointTime.setHours(i);
    
    let speed: number;
    let direction: number;
    
    // All speeds are weak
    speed = Math.random() * 5; // 0-5 mph, below minimum threshold
    direction = 315 + (Math.random() * 30 - 15); // Direction is good but speed is too low
    
    data.push({
      time: pointTime.toISOString(),
      windSpeed: speed.toString(),
      windGust: (speed + 1 + Math.random() * 2).toFixed(1),
      windDirection: direction.toString(),
    });
  }
  
  return data;
}

function generateInconsistentDirectionData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseTime = new Date();
  baseTime.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24; i++) {
    const pointTime = new Date(baseTime);
    pointTime.setHours(i);
    
    let speed: number;
    let direction: number;
    
    // Speed is good but direction is inconsistent
    speed = 12 + Math.random() * 3; // 12-15 mph
    direction = Math.random() * 360; // Completely random direction
    
    data.push({
      time: pointTime.toISOString(),
      windSpeed: speed.toString(),
      windGust: (speed + 2 + Math.random() * 3).toFixed(1),
      windDirection: direction.toString(),
    });
  }
  
  return data;
}

function generateWrongDirectionData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseTime = new Date();
  baseTime.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24; i++) {
    const pointTime = new Date(baseTime);
    pointTime.setHours(i);
    
    let speed: number;
    let direction: number;
    
    // Speed is good but direction is consistently wrong
    speed = 12 + Math.random() * 3; // 12-15 mph
    // Wrong direction - opposite of preferred (315)
    direction = (135 + Math.random() * 30 - 15) % 360; // Around SE
    
    data.push({
      time: pointTime.toISOString(),
      windSpeed: speed.toString(),
      windGust: (speed + 2 + Math.random() * 3).toFixed(1),
      windDirection: direction.toString(),
    });
  }
  
  return data;
}

function generateFewGoodPointsData(): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseTime = new Date();
  baseTime.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24; i++) {
    const pointTime = new Date(baseTime);
    pointTime.setHours(i);
    
    let speed: number;
    let direction: number;
    
    if (i >= 3 && i <= 5) {
      // Only first 2 points in the early morning window are good
      if (i < 5) {
        speed = 12 + Math.random() * 3; // 12-15 mph
        direction = 315 + (Math.random() * 30 - 15); // 300-330 degrees (NW)
      } else {
        speed = Math.random() * 5; // Too weak
        direction = 315 + (Math.random() * 30 - 15);
      }
    } else {
      speed = 5 + Math.random() * 10; // Variable for the rest of the day
      direction = Math.random() * 360;
    }
    
    data.push({
      time: pointTime.toISOString(),
      windSpeed: speed.toString(),
      windGust: (speed + 2 + Math.random() * 3).toFixed(1),
      windDirection: direction.toString(),
    });
  }
  
  return data;
}

function generateCustomData(speed: number, direction: number, variation: number): WindDataPoint[] {
  const data: WindDataPoint[] = [];
  const baseTime = new Date();
  baseTime.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 24; i++) {
    const pointTime = new Date(baseTime);
    pointTime.setHours(i);
    
    // Add some natural variation
    const windSpeed = speed * (0.8 + Math.random() * 0.4); // ±20% variation
    const windDirection = direction + (Math.random() * variation * 2 - variation); // ±variation degrees
    
    data.push({
      time: pointTime.toISOString(),
      windSpeed: windSpeed.toString(),
      windGust: (windSpeed + 2 + Math.random() * 3).toFixed(1),
      windDirection: windDirection.toString(),
    });
  }
  
  return data;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 0, // Changed to 0 since we now have an AnimatedView wrapper
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
  },
  scenarioButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  scenarioButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
    minWidth: 100,
  },
  customControls: {
    marginTop: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  input: {
    flex: 2,
    height: 40,
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 16,
  },
  criteriaContainer: {
    marginTop: 8,
  },
  soundControlContainer: {
    marginBottom: 16,
  },
  soundToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  soundControlLabel: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
  soundStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  soundStatusLabel: {
    fontSize: 16,
    color: '#333',
  },
  stopButton: {
    padding: 8,
  },
  playButton: {
    padding: 8,
  },
  volumeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  volumeLabel: {
    width: 70,
    fontSize: 16,
    color: '#333',
  },
  sliderContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  slider: {
    flex: 1,
    height: 40,
  },
  volumeValue: {
    width: 50,
    fontSize: 16,
    textAlign: 'right',
    color: '#333',
  },
  alarmControlsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  snoozeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  snoozeLabel: {
    fontSize: 16,
    marginRight: 8,
  },
  snoozeButtons: {
    flexDirection: 'row',
  },
  snoozeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snoozeButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  turnOffButton: {
    backgroundColor: '#FF4040',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  turnOffButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  snoozeStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
  },
  snoozeStatusText: {
    color: '#FF9800',
    marginLeft: 8,
    fontSize: 14,
  },
  resultsContainer: {
    marginTop: 16,
  },
  resultLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '500',
    color: '#111',
    marginBottom: 12,
  },
  alarmStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alarmStatusText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 10,
    marginBottom: 0,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  debugMetricsContainer: {
    marginBottom: 16,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
  },
  debugMetricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  debugLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  debugValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  debugButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  debugText: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: '#333',
    maxHeight: 200,
  },
});
