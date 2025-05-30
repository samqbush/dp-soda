import { useCallback, useMemo, useState } from 'react';
import { AlarmLogger } from '../services/alarmDebugLogger';
import { useWindData } from './useWindData';

// Define test scenario types
interface TestScenario {
  name: string;
  description: string;
  conditions: {
    averageSpeed: number;
    directionConsistency: number;
    favorablePoints: number;
    quality: number;
  };
}

/**
 * Custom hook for analyzing wind data and testing alarm scenarios.
 * Separates wind data analysis logic from the UI component.
 */
export const useWindAnalyzer = () => {
  // Get wind data from our main data hook
  const { windData, isLoading, error } = useWindData();
  
  // State for manual analysis settings - aligned with AlarmCriteria interface
  const [criteriaSettings, setCriteriaSettings] = useState({
    minimumAverageSpeed: 10,
    directionConsistencyThreshold: 70,
    minimumConsecutivePoints: 4,
    directionDeviationThreshold: 45,
    preferredDirection: 315, // Northwest (default)
    preferredDirectionRange: 45 // +/- 45 degrees (default)
  });
  
  // Predefined test scenarios
  const testScenarios = useMemo<Record<string, TestScenario>>(() => ({
    favorable: {
      name: 'Favorable Wind',
      description: 'Strong, consistent wind conditions that should trigger the alarm',
      conditions: {
        averageSpeed: 15.2,
        directionConsistency: 92,
        favorablePoints: 7,
        quality: 89
      }
    },
    borderline: {
      name: 'Borderline Conditions',
      description: 'Wind conditions just barely meeting the threshold',
      conditions: {
        averageSpeed: 10.1,
        directionConsistency: 72,
        favorablePoints: 4,
        quality: 65
      }
    },
    unfavorable: {
      name: 'Unfavorable Wind',
      description: 'Low wind conditions that should not trigger the alarm',
      conditions: {
        averageSpeed: 7.5,
        directionConsistency: 55,
        favorablePoints: 2,
        quality: 35
      }
    },
    inconsistent: {
      name: 'Inconsistent Direction',
      description: 'Strong wind but with inconsistent direction',
      conditions: {
        averageSpeed: 14.8,
        directionConsistency: 45,
        favorablePoints: 3,
        quality: 55
      }
    }
  }), []);

  /**
   * Analyze wind data using the provided criteria
   */
  const analyzeWindData = useCallback((
    data = windData,
    criteria = criteriaSettings
  ) => {
    AlarmLogger.lifecycle.start('analyzeWindData');
    
    try {
      if (!data || !data.length) {
        AlarmLogger.warning('No wind data to analyze');
        AlarmLogger.lifecycle.end('analyzeWindData', false);
        return {
          isAlarmWorthy: false,
          quality: 0,
          directionConsistency: 0,
          averageSpeed: 0,
          favorablePoints: 0,
          details: 'No wind data available'
        };
      }
      
      // Extract the early morning data (3am-5am)
      const morningData = data.filter(point => {
        // Use timestamp if available, otherwise use time
        const timestamp = point.timestamp ? point.timestamp : point.time;
        const hour = new Date(timestamp).getHours();
        return hour >= 3 && hour < 5;
      });
      
      if (!morningData.length) {
        AlarmLogger.warning('No morning data points found');
        AlarmLogger.lifecycle.end('analyzeWindData', false);
        return {
          isAlarmWorthy: false,
          quality: 0,
          directionConsistency: 0,
          averageSpeed: 0,
          favorablePoints: 0,
          details: 'No early morning data points (3am-5am) found'
        };
      }
      
      // Calculate average speed and direction consistency
      let totalSpeed = 0;
      let favorableDirectionCount = 0;
      let consecutiveFavorablePoints = 0;
      let maxConsecutivePoints = 0;
      let prevDirectionFavorable = false;
      
      // Direction tracking
      const directions = morningData.map(point => {
        // Ensure windDirection is a number
        return typeof point.windDirection === 'string' 
          ? parseFloat(point.windDirection) 
          : point.windDirection;
      });
      const directionCounts: Record<number, number> = {};
      
      // Count occurrences of each direction (rounded to nearest 10 degrees)
      directions.forEach(dir => {
        // Ensure dir is a number
        const numDir = typeof dir === 'string' ? parseFloat(dir) : dir;
        const roundedDir = Math.round(numDir / 10) * 10;
        directionCounts[roundedDir] = (directionCounts[roundedDir] || 0) + 1;
      });
      
      // Find the most common direction
      let mostCommonDirection = 0;
      let maxCount = 0;
      
      Object.entries(directionCounts).forEach(([dir, count]) => {
        if (count > maxCount) {
          mostCommonDirection = parseInt(dir);
          maxCount = count;
        }
      });
      
      // Calculate direction consistency and speed criteria
      morningData.forEach(point => {
        // Get wind speed in mph (either from windSpeedMph field or convert from windSpeed)
        const windSpeedMph = point.windSpeedMph !== undefined 
          ? point.windSpeedMph 
          : (typeof point.windSpeed === 'string' ? parseFloat(point.windSpeed) : point.windSpeed);
        
        totalSpeed += windSpeedMph;
        
        // Convert wind direction to number if it's a string
        const windDir = typeof point.windDirection === 'string'
          ? parseFloat(point.windDirection)
          : point.windDirection;
        
        // Check direction consistency
        const dirDiff = Math.abs(
          (((windDir - mostCommonDirection) % 360) + 540) % 360 - 180
        );
        
        // Direction is considered favorable if within deviation threshold
        const isDirectionFavorable = dirDiff <= criteria.directionDeviationThreshold;
        
        if (isDirectionFavorable) {
          favorableDirectionCount++;
        }
        
        // Track consecutive favorable points (considering both speed and direction)
        const isSpeedFavorable = windSpeedMph >= criteria.minimumAverageSpeed;
        const isPointFavorable = isDirectionFavorable && isSpeedFavorable;
        
        if (isPointFavorable) {
          if (prevDirectionFavorable) {
            consecutiveFavorablePoints++;
          } else {
            consecutiveFavorablePoints = 1;
          }
          
          if (consecutiveFavorablePoints > maxConsecutivePoints) {
            maxConsecutivePoints = consecutiveFavorablePoints;
          }
        } else {
          consecutiveFavorablePoints = 0;
        }
        
        prevDirectionFavorable = isPointFavorable;
      });
      
      // Calculate final metrics
      const averageSpeed = totalSpeed / morningData.length;
      const directionConsistency = (favorableDirectionCount / morningData.length) * 100;
      
      // Determine if conditions are alarm-worthy
      const isSpeedSufficient = averageSpeed >= criteria.minimumAverageSpeed;
      const isDirectionConsistent = directionConsistency >= criteria.directionConsistencyThreshold;
      const hasEnoughConsecutivePoints = maxConsecutivePoints >= criteria.minimumConsecutivePoints;
      
      const isAlarmWorthy = isSpeedSufficient && isDirectionConsistent && hasEnoughConsecutivePoints;
      
      // Calculate overall quality score (0-100)
      const speedQuality = Math.min(100, (averageSpeed / criteria.minimumAverageSpeed) * 70);
      const directionQuality = (directionConsistency / 100) * 100;
      const consecutiveQuality = (maxConsecutivePoints / criteria.minimumConsecutivePoints) * 100;
      
      const qualityScore = Math.round(
        (speedQuality * 0.4) + (directionQuality * 0.3) + (consecutiveQuality * 0.3)
      );
      
      // Create analysis summary
      const details = `
        Analysis of ${morningData.length} data points from 3am-5am:
        - Average speed: ${averageSpeed.toFixed(1)} mph (min: ${criteria.minimumAverageSpeed})
        - Direction consistency: ${directionConsistency.toFixed(1)}% (min: ${criteria.directionConsistencyThreshold}%)
        - Max consecutive favorable points: ${maxConsecutivePoints} (min: ${criteria.minimumConsecutivePoints})
        - Most common wind direction: ${mostCommonDirection}°
        - Overall quality score: ${qualityScore}/100
      `;
      
      AlarmLogger.success('Wind analysis complete', { isAlarmWorthy, qualityScore });
      AlarmLogger.lifecycle.end('analyzeWindData', true);
      
      return {
        isAlarmWorthy,
        quality: qualityScore,
        directionConsistency,
        averageSpeed,
        favorablePoints: maxConsecutivePoints,
        details
      };
    } catch (error) {
      AlarmLogger.error('Error analyzing wind data', error);
      AlarmLogger.lifecycle.end('analyzeWindData', false);
      
      return {
        isAlarmWorthy: false,
        quality: 0,
        directionConsistency: 0,
        averageSpeed: 0,
        favorablePoints: 0,
        details: `Error analyzing wind data: ${error}`
      };
    }
  }, [windData, criteriaSettings]);

  /**
   * Analyze test scenario data without actual wind data
   */
  const analyzeTestScenario = useCallback((scenarioKey: string) => {
    AlarmLogger.lifecycle.start('analyzeTestScenario');
    
    try {
      const scenario = testScenarios[scenarioKey];
      if (!scenario) {
        AlarmLogger.warning(`Test scenario "${scenarioKey}" not found`);
        AlarmLogger.lifecycle.end('analyzeTestScenario', false);
        return {
          isAlarmWorthy: false,
          quality: 0,
          directionConsistency: 0,
          averageSpeed: 0,
          favorablePoints: 0,
          details: `Test scenario "${scenarioKey}" not found`
        };
      }
      
      const { conditions } = scenario;
      
      // Determine if conditions meet criteria
      const isSpeedSufficient = conditions.averageSpeed >= criteriaSettings.minimumAverageSpeed;
      const isDirectionConsistent = conditions.directionConsistency >= criteriaSettings.directionConsistencyThreshold;
      const hasEnoughConsecutivePoints = conditions.favorablePoints >= criteriaSettings.minimumConsecutivePoints;
      
      const isAlarmWorthy = isSpeedSufficient && isDirectionConsistent && hasEnoughConsecutivePoints;
      
      // Create analysis summary
      const details = `
        Test scenario "${scenario.name}":
        ${scenario.description}
        
        Analysis results:
        - Average speed: ${conditions.averageSpeed.toFixed(1)} mph (min: ${criteriaSettings.minimumAverageSpeed})
        - Direction consistency: ${conditions.directionConsistency.toFixed(1)}% (min: ${criteriaSettings.directionConsistencyThreshold}%)
        - Consecutive favorable points: ${conditions.favorablePoints} (min: ${criteriaSettings.minimumConsecutivePoints})
        - Overall quality score: ${conditions.quality}/100
      `;
      
      AlarmLogger.success('Test scenario analyzed', { scenarioKey, isAlarmWorthy });
      AlarmLogger.lifecycle.end('analyzeTestScenario', true);
      
      return {
        isAlarmWorthy,
        quality: conditions.quality,
        directionConsistency: conditions.directionConsistency,
        averageSpeed: conditions.averageSpeed,
        favorablePoints: conditions.favorablePoints,
        details
      };
    } catch (error) {
      AlarmLogger.error('Error analyzing test scenario', error);
      AlarmLogger.lifecycle.end('analyzeTestScenario', false);
      
      return {
        isAlarmWorthy: false,
        quality: 0,
        directionConsistency: 0,
        averageSpeed: 0,
        favorablePoints: 0,
        details: `Error analyzing test scenario: ${error}`
      };
    }
  }, [testScenarios, criteriaSettings]);

  /**
   * Update analyzer criteria settings
   */
  const updateSettings = useCallback((newSettings: Partial<typeof criteriaSettings>) => {
    setCriteriaSettings(current => ({ ...current, ...newSettings }));
  }, []);

  return {
    // Wind data state
    windData,
    isLoading,
    error,
    
    // Analysis functions
    analyzeWindData,
    analyzeTestScenario,
    
    // Settings
    settings: criteriaSettings,
    updateSettings,
    
    // Test scenarios
    testScenarios
  };
};
