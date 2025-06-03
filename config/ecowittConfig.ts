import Constants from 'expo-constants';

/**
 * Secure Ecowitt API Configuration
 * 
 * These credentials are loaded from environment variables and not hardcoded.
 * The MAC address is fetched automatically via the device list API.
 */

export interface SecureEcowittConfig {
  readonly applicationKey: string;
  readonly apiKey: string;
}

/**
 * Get environment variable with error handling
 */
function getRequiredEnvVar(name: string): string {
  const value = Constants.expoConfig?.extra?.[name] || process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
      `Please ensure it's set in your .env file or environment configuration.`
    );
  }
  return value;
}

/**
 * Secure Ecowitt API credentials loaded from environment variables
 * Make sure to set ECOWITT_APPLICATION_KEY and ECOWITT_API_KEY
 * in your .env file (see .env.example for template)
 */
export const ECOWITT_CONFIG: SecureEcowittConfig = {
  applicationKey: getRequiredEnvVar('ECOWITT_APPLICATION_KEY'),
  apiKey: getRequiredEnvVar('ECOWITT_API_KEY')
} as const;

/**
 * Storage key for the automatically fetched device MAC address
 */
export const DEVICE_MAC_STORAGE_KEY = 'ecowitt_device_mac_address';

/**
 * Cache duration for device MAC address (24 hours)
 */
export const MAC_ADDRESS_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
