import { useCallback, useEffect, useState } from 'react';
import type { AlarmAudioState } from '../services/alarmAudioService';
import { alarmAudio } from '../services/alarmAudioService';

/**
 * Custom hook for handling alarm audio functionality.
 * Provides a clean interface for components to interact with audio features.
 */
export const useAlarmAudio = () => {
  // Initialize state from the audio service
  const [audioState, setAudioState] = useState<AlarmAudioState>(alarmAudio.getState());
  
  // Setup state change listener
  useEffect(() => {
    // Register state change callback
    alarmAudio.onStateChange((newState) => {
      setAudioState(currentState => ({ ...currentState, ...newState }));
    });
    
    // Cleanup on unmount
    return () => {
      // The cleanup function will execute when the component unmounts
      if (audioState.isPlaying) {
        alarmAudio.stop().catch(err => console.error('Error stopping audio on unmount:', err));
      }
    };
  }, []);
  
  // Wrapper functions for the audio service
  const playAlarm = useCallback(async (volume?: number): Promise<boolean> => {
    return alarmAudio.play(volume);
  }, []);
  
  const stopAlarm = useCallback(async (): Promise<boolean> => {
    return alarmAudio.stop();
  }, []);
  
  const turnOffAlarm = useCallback(async (): Promise<boolean> => {
    return alarmAudio.turnOff();
  }, []);
  
  const setVolume = useCallback((volume: number): void => {
    alarmAudio.setVolume(volume);
  }, []);
  
  const setSoundEnabled = useCallback((enabled: boolean): void => {
    alarmAudio.setEnabled(enabled);
  }, []);
  
  const setSnoozing = useCallback((snoozing: boolean): void => {
    alarmAudio.setSnoozing(snoozing);
  }, []);

  // Return state and functions
  return {
    // Current audio state
    isPlaying: audioState.isPlaying,
    isSoundEnabled: audioState.isEnabled,
    isSnoozing: audioState.isSnoozing,
    volume: audioState.volume,
    
    // Actions
    playAlarm,
    stopAlarm,
    turnOffAlarm,
    setVolume,
    setSoundEnabled,
    setSnoozing
  };
};
