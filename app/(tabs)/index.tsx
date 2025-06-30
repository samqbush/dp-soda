import React from 'react';
import WindStationTab from '@/components/WindStationTab';
import { useSodaLakeWind } from '@/hooks/useSodaLakeWind';

export default function SodaLakeScreen() {
  const data = useSodaLakeWind();
  
  const config = {
    name: 'Soda Lake',
    subtitle: 'Ecowitt monitor located at the head of the lake',
    features: {
      transmissionQuality: true,
      externalLink: {
        url: 'https://www.ecowitt.net/home/share?authorize=9S85P3',
        description: 'For more detailed wind analysis and historical data, visit the Ecowitt weather station page:',
        buttonText: '📊 View Detailed Weather Data'
      }
    },
    idealWindDirection: {
      range: {
        min: 270,
        max: 330
      },
      perfect: 297,
      perfectTolerance: 10
    }
  };

  return <WindStationTab data={data} config={config} />;
}
