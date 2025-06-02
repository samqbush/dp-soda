/**
 * Alarm state reducer for WindAlarmTester component
 * 
 * Centralizes state management and transitions for alarm condition analysis,
 * reduces complexity in the main component.
 */

export interface WindAlarmState {
  // UI state
  showAdvancedSettings: boolean;
  showDebugInfo: boolean;

  // Alarm analysis settings
  minConsecutiveDataPoints: number;
  minWindSpeed: number;
  directionConsistencyThreshold: number;
  minDirectionPercentage: number;
  maxDirectionDeviationDegrees: number;
  preferredDirection: number;
  preferredDirectionRange: number;
  useWindDirection: boolean;

  // Analysis results
  isAlarmActive: boolean;
  windAnalysisQuality: number;
  directionConsistencyPercentage: number;
  averageSpeed: number;
  favorableConsecutivePoints: number;
  lastAnalysisTime: Date | null;
  analysisDetails: string;

  // Test scenarios
  isTestScenarioActive: boolean;
  selectedTestScenario: string | null;
  
  // Snooze control
  snoozeMinutes: number;
  isSnoozeEnabled: boolean;
  snoozeEnd: Date | null;
}

export type WindAlarmAction = 
  | { type: 'TOGGLE_ADVANCED_SETTINGS' }
  | { type: 'TOGGLE_DEBUG_INFO' }
  | { type: 'SET_ALARM_ACTIVE'; payload: boolean }
  | { type: 'UPDATE_ANALYSIS_RESULT'; payload: {
      quality: number;
      directionConsistency: number;
      averageSpeed: number;
      favorablePoints: number;
      details: string;
      time: Date;
    }}
  | { type: 'UPDATE_SETTING'; payload: { setting: keyof WindAlarmState; value: any }}
  | { type: 'ACTIVATE_TEST_SCENARIO'; payload: string }
  | { type: 'DEACTIVATE_TEST_SCENARIO' }
  | { type: 'SET_SNOOZE'; payload: { enabled: boolean; minutes?: number }}
  | { type: 'SNOOZE_EXPIRED' };

export const initialWindAlarmState: WindAlarmState = {
  // UI state
  showAdvancedSettings: false,
  showDebugInfo: false,

  // Alarm settings
  minConsecutiveDataPoints: 4,
  minWindSpeed: 10,
  directionConsistencyThreshold: 70,
  minDirectionPercentage: 70,
  maxDirectionDeviationDegrees: 45,
  preferredDirection: 315, // Northwest (default)
  preferredDirectionRange: 45, // +/- 45 degrees (default)
  useWindDirection: true, // By default, use wind direction in calculations

  // Analysis results
  isAlarmActive: false,
  windAnalysisQuality: 0,
  directionConsistencyPercentage: 0,
  averageSpeed: 0,
  favorableConsecutivePoints: 0,
  lastAnalysisTime: null,
  analysisDetails: 'No analysis performed yet.',

  // Test scenarios
  isTestScenarioActive: false,
  selectedTestScenario: null,
  
  // Snooze control
  snoozeMinutes: 30,
  isSnoozeEnabled: false,
  snoozeEnd: null
};

export const windAlarmReducer = (state: WindAlarmState, action: WindAlarmAction): WindAlarmState => {
  switch (action.type) {
    case 'TOGGLE_ADVANCED_SETTINGS':
      return {
        ...state,
        showAdvancedSettings: !state.showAdvancedSettings
      };
      
    case 'TOGGLE_DEBUG_INFO':
      return {
        ...state,
        showDebugInfo: !state.showDebugInfo
      };
      
    case 'SET_ALARM_ACTIVE':
      return {
        ...state,
        isAlarmActive: action.payload
      };
      
    case 'UPDATE_ANALYSIS_RESULT':
      return {
        ...state,
        windAnalysisQuality: action.payload.quality,
        directionConsistencyPercentage: action.payload.directionConsistency,
        averageSpeed: action.payload.averageSpeed,
        favorableConsecutivePoints: action.payload.favorablePoints,
        lastAnalysisTime: action.payload.time,
        analysisDetails: action.payload.details
      };
      
    case 'UPDATE_SETTING':
      return {
        ...state,
        [action.payload.setting]: action.payload.value
      };
      
    case 'ACTIVATE_TEST_SCENARIO':
      return {
        ...state,
        isTestScenarioActive: true,
        selectedTestScenario: action.payload
      };
      
    case 'DEACTIVATE_TEST_SCENARIO':
      return {
        ...state,
        isTestScenarioActive: false,
        selectedTestScenario: null
      };
      
    case 'SET_SNOOZE':
      const now = new Date();
      const snoozeEnd = action.payload.enabled
        ? new Date(now.getTime() + (action.payload.minutes || state.snoozeMinutes) * 60 * 1000)
        : null;
        
      return {
        ...state,
        isSnoozeEnabled: action.payload.enabled,
        snoozeMinutes: action.payload.minutes || state.snoozeMinutes,
        snoozeEnd
      };
      
    case 'SNOOZE_EXPIRED':
      return {
        ...state,
        isSnoozeEnabled: false,
        snoozeEnd: null
      };
      
    default:
      return state;
  }
};
