// Polyfills for testing environment

// Mock Expo modules first, before any imports
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        ECOWITT_APPLICATION_KEY: 'test-app-key',
        ECOWITT_API_KEY: 'test-api-key',
        ECOWITT_MAC_ADDRESS: 'test-mac-address',
      },
    },
  },
}));

// Mock React Native completely
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    Version: '17.0',
    select: jest.fn((options) => options.ios),
  },
  AsyncStorage: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
    clear: jest.fn(() => Promise.resolve()),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  DeviceEventEmitter: {
    addListener: jest.fn(),
    removeListener: jest.fn(),
  },
  NativeModules: {},
  TurboModuleRegistry: {
    getEnforcing: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
}));
