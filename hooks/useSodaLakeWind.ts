import { useStationWind, type UseStationWindReturn } from './useStationWind';
import { fetchSunriseData, type SunriseData } from '@/services/sunriseService';
import { useCallback, useEffect, useState } from 'react';

export interface UseSodaLakeWindReturn extends UseStationWindReturn {
  sunriseData: SunriseData | null;
  loadCachedData: () => Promise<boolean>;
}

export const useSodaLakeWind = (): UseSodaLakeWindReturn => {
  const stationWind = useStationWind({
    deviceName: 'DP Soda Lakes',
    preferredDirection: 315, // Northwest wind for Soda Lake
    defaultAlarmTime: '05:00'
  });

  const [sunriseData, setSunriseData] = useState<SunriseData | null>(null);

  const refreshSunrise = useCallback(async () => {
    try {
      const data = await fetchSunriseData();
      setSunriseData(data);
    } catch (error) {
      console.error('Error fetching sunrise data:', error);
    }
  }, []);

  // Fetch sunrise data on mount
  useEffect(() => {
    refreshSunrise();
  }, [refreshSunrise]);

  // Wrap refreshData to also refresh sunrise
  const refreshData = useCallback(async () => {
    await Promise.all([
      stationWind.refreshData(),
      refreshSunrise()
    ]);
  }, [stationWind.refreshData, refreshSunrise]);

  return {
    ...stationWind,
    refreshData,
    sunriseData,
    loadCachedData: async () => false
  };
};

export default useSodaLakeWind;
