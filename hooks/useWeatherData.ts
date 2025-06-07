import { useCallback, useEffect, useState } from 'react';
import { weatherService, WeatherServiceData, WeatherDataPoint } from '@/services/weatherService';
import { useKatabaticAnalyzer } from '@/hooks/useKatabaticAnalyzer';

/**
 * Custom hook for managing weather data state and operations
 * Follows the same patterns as useWindData.ts
 */
export const useWeatherData = () => {
  const [weatherData, setWeatherData] = useState<WeatherServiceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Initialize katabatic analyzer with weather data
  const katabaticAnalysis = useKatabaticAnalyzer(weatherData);

  /**
   * Fetch weather data from the weather service
   */
  const fetchWeatherData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await weatherService.fetchWeatherData();
      
      setWeatherData(data);
      setLastUpdated(new Date(data.lastFetch));
      
      // If the service returned an error but still has data, set the error state
      if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch weather data';
      setError(errorMessage);
      console.error('Weather data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh weather data (force fetch)
   */
  const refreshData = useCallback(async () => {
    await weatherService.clearCache();
    await fetchWeatherData();
  }, [fetchWeatherData]);

  /**
   * Clear cached weather data
   */
  const clearCache = useCallback(async () => {
    try {
      await weatherService.clearCache();
      setWeatherData(null);
      setLastUpdated(null);
      setError(null);
    } catch (err) {
      console.error('Failed to clear weather cache:', err);
    }
  }, []);

  /**
   * Get current conditions for a specific location
   */
  const getCurrentConditions = useCallback((location: 'morrison' | 'mountain') => {
    if (!weatherData) return null;
    return weatherData[location]?.current || null;
  }, [weatherData]);

  /**
   * Get hourly forecast for a specific location
   */
  const getHourlyForecast = useCallback((location: 'morrison' | 'mountain', hours?: number) => {
    if (!weatherData) return [];
    const forecast = weatherData[location]?.hourlyForecast || [];
    return hours ? forecast.slice(0, hours) : forecast;
  }, [weatherData]);

  /**
   * Get weather data for a specific time window
   */
  const getWeatherForTimeWindow = useCallback((
    location: 'morrison' | 'mountain',
    startHour: number,
    endHour: number
  ) => {
    if (!weatherData) return [];
    
    const forecast = weatherData[location]?.hourlyForecast || [];
    
    return forecast.filter((point: WeatherDataPoint) => {
      const pointDate = new Date(point.timestamp);
      const pointHour = pointDate.getHours();
      
      // For time windows that span midnight (e.g., 22:00 to 06:00)
      if (startHour > endHour) {
        return pointHour >= startHour || pointHour <= endHour;
      }
      
      return pointHour >= startHour && pointHour <= endHour;
    });
  }, [weatherData]);

  /**
   * Calculate temperature differential between mountain and valley
   */
  const getTemperatureDifferential = useCallback(() => {
    if (!weatherData) return null;
    
    const morrisonTemp = weatherData.morrison?.current?.temperature;
    const mountainTemp = weatherData.mountain?.current?.temperature;
    
    if (morrisonTemp === undefined || mountainTemp === undefined) return null;
    
    return {
      morrison: morrisonTemp,
      mountain: mountainTemp,
      differential: morrisonTemp - mountainTemp,
    };
  }, [weatherData]);

  /**
   * Get pressure trend analysis
   */
  const getPressureTrend = useCallback((location: 'morrison' | 'mountain', hours: number = 6) => {
    if (!weatherData) return null;
    
    const forecast = weatherData[location]?.hourlyForecast || [];
    const recentData = forecast.slice(0, hours);
    
    if (recentData.length < 2) return null;
    
    const pressures = recentData.map((point: WeatherDataPoint) => point.pressure);
    const firstPressure = pressures[0];
    const lastPressure = pressures[pressures.length - 1];
    const change = lastPressure - firstPressure;
    
    let trend: 'rising' | 'falling' | 'stable';
    if (Math.abs(change) < 1) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'rising';
    } else {
      trend = 'falling';
    }
    
    return {
      change,
      trend,
      pressures,
      timespan: hours,
    };
  }, [weatherData]);

  /**
   * Check if conditions are suitable for katabatic winds
   * This is a simplified check - the full analysis will be in useKatabaticAnalyzer
   */
  const getBasicKatabaticConditions = useCallback(() => {
    if (!weatherData) return null;
    
    const morrisonCurrent = weatherData.morrison?.current;
    const mountainCurrent = weatherData.mountain?.current;
    
    if (!morrisonCurrent || !mountainCurrent) return null;
    
    // Get weather for the critical time windows
    const clearSkyPeriod = getWeatherForTimeWindow('morrison', 2, 5); // 2-5am
    const predictionPeriod = getWeatherForTimeWindow('morrison', 6, 8); // 6-8am
    
    // Calculate average precipitation probability for clear sky period
    const avgPrecipProb = clearSkyPeriod.length > 0 
      ? clearSkyPeriod.reduce((sum: number, point: WeatherDataPoint) => sum + point.precipitationProbability, 0) / clearSkyPeriod.length
      : morrisonCurrent.precipitationProbability;
    
    // Calculate average cloud cover for clear sky period
    const avgCloudCover = clearSkyPeriod.length > 0
      ? clearSkyPeriod.reduce((sum: number, point: WeatherDataPoint) => sum + point.cloudCover, 0) / clearSkyPeriod.length
      : morrisonCurrent.cloudCover;
    
    const tempDiff = getTemperatureDifferential();
    const pressureTrend = getPressureTrend('morrison');
    
    return {
      precipitationProbability: avgPrecipProb,
      cloudCover: avgCloudCover,
      temperatureDifferential: tempDiff?.differential || 0,
      pressureChange: pressureTrend?.change || 0,
      pressureTrend: pressureTrend?.trend || 'stable',
      clearSkyPeriod,
      predictionPeriod,
    };
  }, [weatherData, getWeatherForTimeWindow, getTemperatureDifferential, getPressureTrend]);

  // Initialize data on mount
  useEffect(() => {
    fetchWeatherData();
  }, [fetchWeatherData]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchWeatherData();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [fetchWeatherData]);

  return {
    // Data
    weatherData,
    isLoading,
    error,
    lastUpdated,
    
    // Actions
    refreshData,
    clearCache,
    
    // Getters
    getCurrentConditions,
    getHourlyForecast,
    getWeatherForTimeWindow,
    getTemperatureDifferential,
    getPressureTrend,
    getBasicKatabaticConditions,
    
    // Phase 2: Katabatic prediction engine
    katabaticAnalysis,
  };
};
