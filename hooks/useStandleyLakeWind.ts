import { useStationWind, type UseStationWindReturn } from './useStationWind';

export interface UseStandleyLakeWindReturn extends UseStationWindReturn {
  loadCachedData: () => Promise<boolean>;
}

export const useStandleyLakeWind = (): UseStandleyLakeWindReturn => {
  const stationWind = useStationWind({
    deviceName: 'DP Standley West',
    preferredDirection: 270, // West wind for Standley Lake
    defaultAlarmTime: '06:00'
  });

  return {
    ...stationWind,
    loadCachedData: async () => false
  };
};

export default useStandleyLakeWind;
