/**
 * Build configuration for the Dawn Patrol Alarm app
 * This file helps with debugging release builds and providing build info
 */

import { Platform } from 'react-native';

interface BuildConfig {
  version: string;
  buildNumber: string;
  environment: 'development' | 'production';
  apiEndpoint: string;
  isDebugMode: boolean;
  buildDate: string;
  platformSpecific: {
    android?: {
      versionCode: number;
    };
    ios?: {
      buildNumber: string;
    };
  };
}

// Current build configuration
const config: BuildConfig = {
  version: '1.0.2',
  buildNumber: '2',
  environment: __DEV__ ? 'development' : 'production',
  apiEndpoint: 'https://api.weatherflow.com/wxengine/rest/graph/getGraph',
  isDebugMode: __DEV__,
  buildDate: new Date().toISOString().split('T')[0],
  platformSpecific: {
    android: {
      versionCode: 6,
    },
    ios: {
      buildNumber: '2',
    },
  }
};

export const getBuildConfig = (): BuildConfig => config;

/**
 * Returns current build info as a formatted string for debugging
 */
export const getBuildInfo = (): string => {
  const { version, buildNumber, environment } = config;
  const platform = Platform.OS;
  const versionString = platform === 'android' 
    ? `${version} (${config.platformSpecific.android?.versionCode})`
    : `${version} (${config.platformSpecific.ios?.buildNumber})`;
  
  return `${platform}/${versionString}/${environment}`;
};

/**
 * Logging utility specific for build-related issues
 */
export const logBuildIssue = (message: string, error?: any): void => {
  console.warn(`[BUILD] ${message}`, error ? error : '');
  
  // In development, show more detailed logs
  if (__DEV__ && error) {
    console.error('Build issue details:', error);
  }
};

export default config;
