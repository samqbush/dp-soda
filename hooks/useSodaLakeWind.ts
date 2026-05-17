import { useStationWind, type UseStationWindReturn } from './useStationWind';

export interface UseSodaLakeWindReturn extends UseStationWindReturn {
  loadCachedData: () => Promise<boolean>;
}

export const useSodaLakeWind = (): UseSodaLakeWindReturn => {
  const stationWind = useStationWind({
    deviceName: 'DP Soda Lakes',
    preferredDirection: 315, // Northwest wind for Soda Lake
    defaultAlarmTime: '05:00'
  });

  return {
    ...stationWind,
    loadCachedData: async () => false
  };
};

export default useSodaLakeWind;
