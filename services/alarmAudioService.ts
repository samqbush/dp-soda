import { Audio } from 'expo-av';
import { AccessibilityInfo, Platform, Vibration } from 'react-native';
import { AlarmLogger } from './alarmDebugLogger';

export interface AlarmAudioState {
  isPlaying: boolean;
  isEnabled: boolean;
  isSnoozing: boolean;
  volume: number;
  isScreenReaderEnabled: boolean;
}

/**
 * AlarmAudioService
 * 
 * A dedicated service for handling alarm audio playback and related functionality.
 * Centralizes all audio operations to prevent race conditions and simplify the UI components.
 */
export class AlarmAudioService {
  private sound: Audio.Sound | null = null;
  private isTurningOff: boolean = false;
  private continuousCheckInterval: NodeJS.Timeout | null = null;
  private onStateChangeCallback: ((state: Partial<AlarmAudioState>) => void) | null = null;
  
  // State
  private _state: AlarmAudioState = {
    isPlaying: false,
    isEnabled: true,
    isSnoozing: false,
    volume: 0.7,
    isScreenReaderEnabled: false
  };
  
  constructor() {
    // Initialize screen reader detection
    this.detectScreenReader();
  }
  
  // Detect if screen reader is enabled
  private async detectScreenReader(): Promise<void> {
    try {
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      this._state.isScreenReaderEnabled = isScreenReaderEnabled;
    } catch (error) {
      console.error('Error detecting screen reader:', error);
    }
  }
  
  // Register callback for state changes
  public onStateChange(callback: (state: Partial<AlarmAudioState>) => void): void {
    this.onStateChangeCallback = callback;
  }
  
  // Update internal state and notify listeners
  private updateState(newState: Partial<AlarmAudioState>): void {
    this._state = { ...this._state, ...newState };
    
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }
  
  // Get current state
  public getState(): AlarmAudioState {
    return { ...this._state };
  }
  
  /**
   * Play alarm sound
   * @param volume Volume level (0.0 to 1.0)
   * @returns Promise resolving to success boolean
   */
  public async play(volume?: number): Promise<boolean> {
    // Log the start of play attempt with current state
    AlarmLogger.lifecycle.start('playAlarmSound');
    AlarmLogger.audio.state({
      isPlaying: this._state.isPlaying,
      soundEnabled: this._state.isEnabled,
      snoozeEnabled: this._state.isSnoozing,
      soundRefExists: !!this.sound,
      alarmTurnOffInProgress: this.isTurningOff
    });
    
    // MOST CRITICAL CHECK: If alarm turn-off is in progress, don't play no matter what
    if (this.isTurningOff) {
      AlarmLogger.warning('ABORT: Alarm turn-off in progress detected - immediately aborting play attempt');
      AlarmLogger.lifecycle.end('playAlarmSound', false);
      return false;
    }
    
    // Make a local copy of state to prevent race conditions
    const stateSnapshot = {
      isEnabled: this._state.isEnabled,
      isSnoozing: this._state.isSnoozing,
      isPlaying: this._state.isPlaying,
      isTurningOff: this.isTurningOff
    };
    
    // Don't play if sound is disabled or we're in snooze mode
    if (!stateSnapshot.isEnabled || stateSnapshot.isSnoozing) {
      AlarmLogger.info('Sound disabled or in snooze mode - not playing', stateSnapshot);
      AlarmLogger.lifecycle.end('playAlarmSound', false);
      return false;
    }
    
    // Apply volume if provided
    if (volume !== undefined) {
      this._state.volume = volume;
    }
    
    try {
      AlarmLogger.audio.play('Playing alarm sound...');
      
      // First stop any existing sound
      if (this.sound) {
        try {
          AlarmLogger.info('Cleaning up previous sound before playing');
          await this.sound.stopAsync();
          await this.sound.unloadAsync();
          AlarmLogger.success('Previous sound cleaned up successfully');
        } catch (err) {
          AlarmLogger.warning('Error cleaning up previous sound', err);
        }
        this.sound = null;
      }
      
      // Configure audio session for alarm
      AlarmLogger.info('Configuring audio session');
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true, // Allow playing when device is on silent
        staysActiveInBackground: true, // Keep playing when app is in background
        shouldDuckAndroid: false, // Don't lower volume of other apps
      });
      
      // Double-check all flags once more before creating the sound
      if (!this._state.isEnabled || this.isTurningOff) {
        AlarmLogger.warning('Sound was disabled or alarm turn-off started during setup, aborting play');
        AlarmLogger.lifecycle.end('playAlarmSound', false);
        return false;
      }
      
      // CRITICAL QUADRUPLE CHECK: Make absolutely sure we're not in turn-off mode
      if (this.isTurningOff) {
        AlarmLogger.forceLog('🚨 CRITICAL: Alarm turn-off detected at last moment, aborting sound creation');
        AlarmLogger.lifecycle.end('playAlarmSound', false);
        return false;
      }
      
      AlarmLogger.info('Creating sound object');
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/alarm.mp3'),
        {
          shouldPlay: true,
          isLooping: true,
          volume: this._state.volume
        }
      );
      
      this.sound = sound;
      this.updateState({ isPlaying: true });
      AlarmLogger.state.change('isPlaying', false, true);
      
      // For accessibility
      if (this._state.isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Alarm activated! Wind conditions are favorable!');
      }
      
      // Start vibration pattern for additional alert
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.vibrate([500, 1000, 500, 1000], true);
        AlarmLogger.info('Started vibration pattern');
      }
      
      // Start continuous playback checker
      this.startContinuousCheck();
      
      AlarmLogger.success('Alarm sound playing successfully');
      AlarmLogger.lifecycle.end('playAlarmSound', true);
      return true;
    } catch (error) {
      AlarmLogger.error('Failed to play sound', error);
      this.updateState({ isPlaying: false });
      AlarmLogger.lifecycle.end('playAlarmSound', false);
      return false;
    }
  }
  
  /**
   * Stop alarm sound
   * @returns Promise resolving to success boolean
   */
  public async stop(): Promise<boolean> {
    try {
      // Log the start of stop operation with current state
      AlarmLogger.lifecycle.start('stopAlarmSound');
      AlarmLogger.audio.state({
        isPlaying: this._state.isPlaying,
        soundEnabled: this._state.isEnabled,
        snoozeEnabled: this._state.isSnoozing,
        soundRefExists: !!this.sound,
        alarmTurnOffInProgress: this.isTurningOff
      });
      
      AlarmLogger.audio.stop("Stopping alarm sound...");
      
      // CRITICAL: Set turn-off flag FIRST to prevent any race conditions during stopping
      this.isTurningOff = true;
      
      // CRITICAL: Clear any continuous playback checker IMMEDIATELY as a safety measure
      this.stopContinuousCheck();
      
      // Update state immediately for UI feedback
      AlarmLogger.state.change('isPlaying', this._state.isPlaying, false);
      this.updateState({ isPlaying: false });
      
      // Stop vibration immediately for immediate feedback
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.cancel();
        AlarmLogger.info("Stopped vibration");
      }
      
      // Store sound reference locally in case it changes during async operations
      const currentSound = this.sound;
      
      // Null the reference IMMEDIATELY to prevent any other code from using it
      if (currentSound) {
        this.sound = null;
        AlarmLogger.info("Sound reference nulled early to prevent race conditions");
      }
      
      if (currentSound) {
        AlarmLogger.info("Sound reference exists, stopping...");
        try {
          // First try to stop playback
          try {
            await currentSound.stopAsync();
            AlarmLogger.success("Sound stopped successfully");
          } catch (stopError) {
            AlarmLogger.error("Error stopping sound", stopError);
            // Continue with cleanup
          }
          
          // Then try to turn off looping
          try {
            await currentSound.setIsLoopingAsync(false);
            AlarmLogger.success("Sound loop disabled");
          } catch (loopError) {
            AlarmLogger.error("Error disabling sound loop", loopError);
            // Continue with cleanup
          }
          
          // Set volume to 0 for immediate audio silence
          try {
            await currentSound.setVolumeAsync(0);
            AlarmLogger.success("Sound volume set to 0");
          } catch (volumeError) {
            AlarmLogger.error("Error setting volume to 0", volumeError);
            // Continue with cleanup
          }
          
          // Getting current status - important to check if sound is still loaded
          const status = await currentSound.getStatusAsync().catch(() => {
            AlarmLogger.warning("Could not get sound status");
            return null;
          });
          
          AlarmLogger.info("Current sound status before unload", status);
          
          // Skip straight to unloadAsync() which is the only reliable way to ensure audio cleanup
          try {
            await currentSound.unloadAsync();
            AlarmLogger.success("Sound unloaded successfully");
          } catch (unloadError) {
            AlarmLogger.error("Error unloading sound", unloadError);
            // Continue with cleanup
          }
        } catch (soundError) {
          AlarmLogger.error("Error handling sound object", soundError);
        }
      } else {
        AlarmLogger.warning("No sound reference found when trying to stop");
      }
      
      // Reset audio mode to release audio session completely
      try {
        AlarmLogger.info("Resetting audio mode...");
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          // Use numeric values for interruption modes
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
        AlarmLogger.success("Audio mode reset successfully");
      } catch (audioModeError) {
        AlarmLogger.error("Failed to reset audio mode", audioModeError);
      }
      
      // For screen readers
      if (this._state.isScreenReaderEnabled) {
        AccessibilityInfo.announceForAccessibility('Alarm stopped');
      }

      // Call forceResetAudio as an extra safety measure
      try {
        await this.forceResetAudio();
        AlarmLogger.success("Force reset completed as backup");
      } catch (resetError) {
        AlarmLogger.error("Force reset failed as backup", resetError);
      }
      
      // Reset the turn-off flag
      this.isTurningOff = false;
      
      AlarmLogger.success("Stop alarm process completed successfully");
      AlarmLogger.lifecycle.end('stopAlarmSound', true);
      return true;
    } catch (error) {
      AlarmLogger.error('Error stopping sound', error);
      
      // Force update state even if stopping failed
      this.updateState({ isPlaying: false });
      
      // Still try to stop vibration
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.cancel();
      }
      
      // Reset the turn-off flag even if there was an error
      this.isTurningOff = false;
      
      // Always null the reference to force reload next time
      this.sound = null;
      
      // Try to do a force reset one last time
      try {
        await this.forceResetAudio();
      } catch (e) {
        // Nothing more we can do here
      }
      
      AlarmLogger.lifecycle.end('stopAlarmSound', false);
      return false;
    }
  }
  
  /**
   * Turn off alarm completely - more aggressive than stop
   */
  public async turnOff(): Promise<boolean> {
    try {
      // SUPER CRITICAL - Set flag FIRST to indicate we're in the process of turning off the alarm
      this.isTurningOff = true;
      AlarmLogger.forceLog("🚨 EMERGENCY ALARM TURN-OFF INITIATED - PREVENTING ALL SOUND OPERATIONS 🚨");
      
      // Log the start of the operation with current state for debugging
      AlarmLogger.audio.state({
        isPlaying: this._state.isPlaying,
        soundEnabled: this._state.isEnabled,
        snoozeEnabled: this._state.isSnoozing,
        soundRefExists: !!this.sound,
        continuous: !!this.continuousCheckInterval,
        turnOffInProgress: this.isTurningOff
      });
      AlarmLogger.lifecycle.start('turnOffAlarm');
      
      // CRITICAL: Clear continuous playback checker FIRST to prevent restart
      this.stopContinuousCheck();
      
      // Store sound reference locally to prevent race conditions
      const currentSound = this.sound;
      // Null out the sound reference IMMEDIATELY to prevent it from being used elsewhere
      this.sound = null;
      
      // Update all state immediately for fastest possible UI feedback
      AlarmLogger.state.change('isPlaying/soundEnabled', `${this._state.isPlaying}/${this._state.isEnabled}`, 'false/false');
      this.updateState({ 
        isPlaying: false,
        isEnabled: false 
      });
      
      // Stop vibration immediately for immediate feedback
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        Vibration.cancel();
        AlarmLogger.info("Stopped vibration in emergency turn-off");
      }
      
      // First try standard method to stop sound
      if (currentSound) {
        AlarmLogger.info("Sound reference exists, emergency stopping...");
        try {
          // Try to stop and unload with minimal error handling - just get it done
          await currentSound.stopAsync().catch(() => {});
          await currentSound.setVolumeAsync(0).catch(() => {});
          await currentSound.unloadAsync().catch(() => {});
          AlarmLogger.success("Sound emergency stopped");
        } catch (error) {
          AlarmLogger.error("Error in emergency sound stop", error);
        }
      } else {
        AlarmLogger.info("No sound to stop in emergency turn-off");
      }
      
      // Reset audio mode to release audio session completely
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        }).catch(() => {});
      } catch (error) {
        // Just continue - this is emergency mode
      }
      
      // Force reset as final safety measure
      await this.forceResetAudio().catch(() => {});
      
      // Reset the turn-off flag
      this.isTurningOff = false;
      
      AlarmLogger.success("Emergency turn-off completed");
      AlarmLogger.lifecycle.end('turnOffAlarm', true);
      return true;
    } catch (error) {
      // Even if everything fails, make sure we reset our state
      this.sound = null;
      this.isTurningOff = false;
      this.updateState({ isPlaying: false, isEnabled: false });
      this.stopContinuousCheck();
      
      AlarmLogger.error("Critical failure in emergency turn-off", error);
      AlarmLogger.lifecycle.end('turnOffAlarm', false);
      return false;
    }
  }
  
  /**
   * Start continuous playback check to ensure sound keeps playing
   */
  public startContinuousCheck(): void {
    // Log current state for debugging
    AlarmLogger.info("Starting continuous playback checker", {
      isPlaying: this._state.isPlaying, 
      isSnoozing: this._state.isSnoozing, 
      isEnabled: this._state.isEnabled,
      hasExistingChecker: !!this.continuousCheckInterval,
      alarmTurnOffInProgress: this.isTurningOff
    });
    
    // Don't set up monitoring if alarm turn-off is in progress
    if (this.isTurningOff) {
      AlarmLogger.warning("Alarm turn-off in progress - not setting up continuous playback checker");
      this.stopContinuousCheck(); // Clear any existing checker to be safe
      return;
    }
    
    // Clear any existing interval first to prevent duplicates
    this.stopContinuousCheck();

    // Only setup new checker if we really want sound playing
    if (this._state.isPlaying && !this._state.isSnoozing && this._state.isEnabled && !this.isTurningOff) {
      // Double check the turn-off flag again to be extra safe
      if (this.isTurningOff) {
        AlarmLogger.warning("Last-minute alarm turn-off detected - not setting up checker");
        return;
      }

      AlarmLogger.info("Setting up new continuous playback checker");
      
      this.continuousCheckInterval = setInterval(async () => {
        try {
          // FIRST CHECK: If alarm is being turned off, immediately clear the interval and don't proceed
          if (this.isTurningOff) {
            AlarmLogger.warning("CRITICAL: Detected alarm turn-off in progress during continuous check - cleaning up immediately");
            this.stopContinuousCheck();
            
            // Force update state if inconsistent
            if (this._state.isPlaying) {
              this.updateState({ isPlaying: false });
            }
            
            // Clean up any sound reference
            if (this.sound) {
              const soundToCleanup = this.sound;
              this.sound = null;
              
              try { soundToCleanup.stopAsync().catch(() => {}); } catch (e) {}
              try { soundToCleanup.unloadAsync().catch(() => {}); } catch (e) {}
              
              AlarmLogger.warning("CRITICAL: Found sound reference during turn-off - forced cleanup");
            }
            
            return;
          }
          
          // IMPORTANT: Triple check all conditions before restarting sound
          if (this.sound && this._state.isPlaying && this._state.isEnabled && !this._state.isSnoozing && !this.isTurningOff) {
            // Get current sound status to see if it's playing
            let status;
            try {
              status = await this.sound.getStatusAsync();
              AlarmLogger.info("Continuous playback check", status);
            } catch (statusErr) {
              AlarmLogger.error("Error getting sound status", statusErr);
              return; // Exit if we can't get status
            }
            
            // Check if alarm turn-off started while we were getting status
            if (this.isTurningOff) {
              AlarmLogger.warning("Alarm turn-off started after status check - aborting restart attempt");
              return;
            }
            
            // If sound somehow stopped playing but should be playing, restart it
            if (status && status.isLoaded && !status.isPlaying) {
              AlarmLogger.warning("Sound stopped unexpectedly, attempting restart");
              
              // Final check before restart
              if (this._state.isEnabled && this._state.isPlaying && !this._state.isSnoozing && !this.isTurningOff) {
                // Keep a local reference in case it changes during async operation
                const soundToRestart = this.sound;
                
                // One last check before actually playing
                if (soundToRestart && !this.isTurningOff) {
                  await soundToRestart.playAsync()
                    .then(() => AlarmLogger.success("Sound restarted successfully"))
                    .catch(e => AlarmLogger.error("Failed to restart sound", e));
                } else {
                  AlarmLogger.info("Restart aborted - reference changed or turn-off started");
                }
              }
            }
          }
        } catch (err) {
          AlarmLogger.error("Error in continuous playback check", err);
          
          // If error happens repeatedly, disable the checker
          this.stopContinuousCheck();
        }
      }, 3000); // Check every 3 seconds
    } else {
      AlarmLogger.info("Continuous playback checker not needed", {
        isPlaying: this._state.isPlaying, 
        isSnoozing: this._state.isSnoozing, 
        isEnabled: this._state.isEnabled,
        alarmTurnOffInProgress: this.isTurningOff
      });
    }
  }
  
  /**
   * Stop the continuous playback checker
   */
  public stopContinuousCheck(): void {
    if (this.continuousCheckInterval) {
      AlarmLogger.info("Clearing continuous playback checker");
      clearInterval(this.continuousCheckInterval);
      this.continuousCheckInterval = null;
    }
  }
  
  /**
   * Update volume and apply to current sound if playing
   */
  public setVolume(volume: number): void {
    this._state.volume = volume;
    
    // Apply to current sound if playing
    if (this.sound && this._state.isPlaying) {
      this.sound.setVolumeAsync(volume).catch(err => {
        AlarmLogger.error('Error setting volume:', err);
      });
    }
  }
  
  /**
   * Enable or disable sound
   */
  public setEnabled(enabled: boolean): void {
    // If disabling while playing, stop the sound
    if (!enabled && this._state.isPlaying) {
      this.stop();
    }
    
    this.updateState({ isEnabled: enabled });
  }
  
  /**
   * Set snooze state
   */
  public setSnoozing(snoozing: boolean): void {
    // If enabling snooze while playing, stop the sound
    if (snoozing && this._state.isPlaying) {
      this.stop();
    }
    
    this.updateState({ isSnoozing: snoozing });
  }
  
  /**
   * Force reset audio completely - used for stubborn audio issues
   */
  public async forceResetAudio(): Promise<void> {
    AlarmLogger.lifecycle.start('forceResetAudio');
    AlarmLogger.audio.reset("Force resetting audio system...");
    
    try {
      // Double-check continuous playback checker is definitely cleared
      this.stopContinuousCheck();
      
      // Cancel any vibrations
      Vibration.cancel();
      
      // Stop and unload current sound if it exists
      if (this.sound) {
        const currentSound = this.sound;
        this.sound = null;
        
        try {
          await currentSound.stopAsync().catch(() => {});
          await currentSound.unloadAsync().catch(() => {});
          AlarmLogger.success("Force reset: sound stopped and unloaded");
        } catch (error) {
          AlarmLogger.error("Force reset: error cleaning up sound", error);
        }
      } else {
        AlarmLogger.info("Force reset: no sound to clean up");
      }
      
      // Reset audio mode
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
          interruptionModeIOS: 1,
          interruptionModeAndroid: 1,
        });
        AlarmLogger.success("Force reset: audio mode reset");
      } catch (error) {
        AlarmLogger.error("Force reset: error resetting audio mode", error);
      }
      
      AlarmLogger.lifecycle.end('forceResetAudio', true);
    } catch (error) {
      AlarmLogger.error("Force reset failed", error);
      AlarmLogger.lifecycle.end('forceResetAudio', false);
      throw error;
    }
  }
  
  /**
   * Clean up all resources
   */
  public cleanup(): void {
    AlarmLogger.info("AlarmAudioService cleanup");
    
    // Stop any ongoing sound
    if (this._state.isPlaying || this.sound) {
      this.stop().catch(e => AlarmLogger.error("Error stopping sound during cleanup", e));
    }
    
    // Clear all timers
    this.stopContinuousCheck();
    
    // Reset state
    this.updateState({
      isPlaying: false,
      isEnabled: true,
      isSnoozing: false
    });
    
    // Remove callback
    this.onStateChangeCallback = null;
  }
}

// Export singleton instance for app-wide use
export const alarmAudio = new AlarmAudioService();
