import React from 'react';
import WindStationTab from '@/components/WindStationTab';
import { useStandleyLakeWind } from '@/hooks/useStandleyLakeWind';

export default function StandleyLakeScreen() {
  const data = useStandleyLakeWind();
  
  const config = {
    name: 'Standley Lake Wind Monitor',
    subtitle: 'Ecowitt monitor located on the west side of the lake',
    features: {
      // Standley Lake doesn't have transmission quality monitoring or external link
    }
  };

  return <WindStationTab data={data} config={config} />;
}
