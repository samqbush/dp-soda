import React from 'react';
import WindStationTab from '@/components/WindStationTab';
import { useStandleyLakeWind } from '@/hooks/useStandleyLakeWind';

const config = {
  name: 'Standley Lake Wind Monitor',
  subtitle: 'Ecowitt monitor located on the west side of the lake',
  features: {}
};

export default function StandleyLakeScreen() {
  const data = useStandleyLakeWind();

  return <WindStationTab data={data} config={config} />;
}
