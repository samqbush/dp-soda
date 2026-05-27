import React from 'react';
import WindStationTab from '@/components/WindStationTab';
import { useBoulderResWind } from '@/hooks/useBoulderResWind';

const config = {
  name: 'Boulder Reservoir Wind Monitor',
  subtitle: 'Ecowitt monitor located at Boulder Reservoir',
  features: {}
};

export default function BoulderResScreen() {
  const data = useBoulderResWind();

  return <WindStationTab data={data} config={config} />;
}
