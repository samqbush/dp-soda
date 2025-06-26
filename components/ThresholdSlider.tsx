import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useWindThreshold } from '@/hooks/useWindThreshold';

interface ThresholdSliderProps {
  disabled?: boolean;
}

export function ThresholdSlider({ disabled = false }: ThresholdSliderProps) {
  const { windThreshold, setWindThreshold, isLoading } = useWindThreshold();
  const [localValue, setLocalValue] = useState(windThreshold);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const tintColor = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  // Update local value when service value changes
  useEffect(() => {
    setLocalValue(windThreshold);
  }, [windThreshold]);

  const handleValueChange = (value: number) => {
    const roundedValue = Math.round(value);
    setLocalValue(roundedValue);

    // Clear existing timeout to debounce saves
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Hide previous "saved" indicator
    setShowSaved(false);

    // Debounce the save operation
    const newTimeout = setTimeout(async () => {
      setIsSaving(true);
      try {
        await setWindThreshold(roundedValue);
        console.log(`✅ Auto-saved wind threshold = ${roundedValue} mph`);
        
        // Show "saved" confirmation
        setShowSaved(true);
        
        // Hide "saved" indicator after 2 seconds
        setTimeout(() => setShowSaved(false), 2000);
        
      } catch (error) {
        console.error('❌ Failed to save wind threshold:', error);
        // Revert local value on error
        setLocalValue(windThreshold);
      } finally {
        setIsSaving(false);
      }
    }, 500); // Wait 500ms after user stops sliding

    setSaveTimeout(newTimeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, [saveTimeout]);

  const getThresholdDescription = (value: number) => {
    if (value < 10) return 'Light Breeze - go mountain biking';
    if (value < 15) return 'Moderate wind - get your downwind board and big wing';
    if (value < 20) return 'Good wind - ideal conditions for most riders';
    if (value < 30) return 'Strong wind - downsize your wing';
    return 'Extreme Wind - get your smallest wing and hang on for the ride';
  };

  const getSliderColor = () => {
    if (disabled) return '#cccccc';
    return tintColor;
  };

  return (
    <ThemedView style={[styles.container, disabled && styles.disabledContainer]}>
      <View style={styles.header}>
        <ThemedText style={[styles.label, { color: textColor }]}>
          Wind Speed Threshold
        </ThemedText>
        <View style={styles.valueContainer}>
          <ThemedText style={[styles.value, { color: getSliderColor() }]}>
            {localValue} mph
          </ThemedText>
          {/* Save status indicators */}
          {isSaving && (
            <ThemedText style={[styles.statusText, { color: '#FF9500' }]}>
              💾
            </ThemedText>
          )}
          {showSaved && !isSaving && (
            <ThemedText style={[styles.statusText, { color: '#34C759' }]}>
              ✅
            </ThemedText>
          )}
        </View>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={35}
        value={localValue}
        onValueChange={handleValueChange}
        step={1}
        minimumTrackTintColor={getSliderColor()}
        maximumTrackTintColor={disabled ? '#e0e0e0' : '#d0d0d0'}
        disabled={disabled || isLoading}
      />

      <View style={styles.scaleContainer}>
        <ThemedText style={[styles.scaleText, { color: textColor }]}>1</ThemedText>
        <ThemedText style={[styles.scaleText, { color: textColor }]}>10</ThemedText>
        <ThemedText style={[styles.scaleText, { color: textColor }]}>20</ThemedText>
        <ThemedText style={[styles.scaleText, { color: textColor }]}>30</ThemedText>
        <ThemedText style={[styles.scaleText, { color: textColor }]}>35</ThemedText>
      </View>

      <ThemedText style={[styles.description, { color: textColor }]}>
        {getThresholdDescription(localValue)}
      </ThemedText>

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  disabledContainer: {
    opacity: 0.5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: 'bold',
    minWidth: 60,
    textAlign: 'right',
  },
  statusText: {
    fontSize: 14,
    marginLeft: 8,
  },
  slider: {
    height: 40,
    marginVertical: 8,
  },
  scaleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  scaleText: {
    fontSize: 12,
    opacity: 0.6,
  },
  description: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 8,
    textAlign: 'center',
  },
  helpText: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 16,
  },
});
