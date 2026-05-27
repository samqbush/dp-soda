import { useStationWind, type UseStationWindReturn } from './useStationWind';

export interface UseBoulderResWindReturn extends UseStationWindReturn {
  loadCachedData: () => Promise<boolean>;
}

export const useBoulderResWind = (): UseBoulderResWindReturn => {
  const stationWind = useStationWind({
    deviceName: 'DP Boulder Res',
    preferredDirection: 270, // West wind for Boulder Reservoir
    defaultAlarmTime: '06:00'
  });

  return {
    ...stationWind,
    loadCachedData: async () => false
  };
};

export default useBoulderResWind;
