import AsyncStorage from '@react-native-async-storage/async-storage';

const WIND_THRESHOLD_KEY = 'wind_threshold';
const DEFAULT_WIND_THRESHOLD = 15; // mph

export interface WindThresholdState {
  windThreshold: number;
}

class WindThresholdService {
  private listeners: Set<(threshold: number) => void> = new Set();
  private currentThreshold: number = DEFAULT_WIND_THRESHOLD;
  private isInitialized: boolean = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      const saved = await AsyncStorage.getItem(WIND_THRESHOLD_KEY);
      if (saved) {
        this.currentThreshold = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load wind threshold:', error);
    }
    
    this.isInitialized = true;
  }

  getThreshold(): number {
    return this.currentThreshold;
  }

  async setThreshold(threshold: number): Promise<void> {
    this.currentThreshold = threshold;
    
    try {
      await AsyncStorage.setItem(WIND_THRESHOLD_KEY, JSON.stringify(threshold));
      this.notifyListeners();
    } catch (error) {
      console.error('Failed to save wind threshold:', error);
    }
  }

  onThresholdChange(listener: (threshold: number) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.currentThreshold);
      } catch (error) {
        console.error('Error notifying threshold listener:', error);
      }
    });
  }
}

export const windThresholdService = new WindThresholdService();
