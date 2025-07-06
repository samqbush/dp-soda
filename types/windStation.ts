// Wind Station Types - Based on Soda Lake implementation
import { 
  EcowittWindDataPoint, 
  EcowittCurrentWindConditions, 
  TransmissionQualityInfo 
} from '@/services/ecowittService';
import { WindDataPoint, WindAnalysis } from '@/services/windService';

export interface WindStationData {
  // Data state
  windData: EcowittWindDataPoint[];
  chartData: WindDataPoint[];
  currentConditions: EcowittCurrentWindConditions | null;
  analysis: WindAnalysis | null;
  transmissionQuality?: TransmissionQualityInfo | null;
  
  // Loading and error states
  isLoading: boolean;
  isLoadingCurrent?: boolean;
  error: string | null;
  lastUpdated?: Date | null;
  currentConditionsUpdated: Date | null;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshCurrentConditions: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export interface WindStationConfig {
  name: string;
  subtitle: string;
  features?: {
    transmissionQuality?: boolean;
    externalLink?: {
      url: string;
      description: string;
      buttonText: string;
    };
  };
  idealWindDirection?: {
    range: {
      min: number;
      max: number;
    };
    perfect: number;
    perfectTolerance?: number; // degrees ± perfect for "near perfect" indication
  };
}
