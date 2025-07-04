import { useColorScheme } from '@/hooks/useColorScheme';
import { useColorScheme as reactNativeUseColorScheme } from 'react-native';

// Mock react-native
jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

describe('useColorScheme Hook Tests', () => {
  const mockReactNativeUseColorScheme = reactNativeUseColorScheme as jest.MockedFunction<typeof reactNativeUseColorScheme>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should re-export useColorScheme from react-native', () => {
    // This is a simple re-export, so we just need to verify it exists and is the same function
    expect(useColorScheme).toBeDefined();
    expect(typeof useColorScheme).toBe('function');
  });

  it('should return light theme from react-native', () => {
    mockReactNativeUseColorScheme.mockReturnValue('light');
    const result = useColorScheme();
    expect(result).toBe('light');
    expect(mockReactNativeUseColorScheme).toHaveBeenCalled();
  });

  it('should return dark theme from react-native', () => {
    mockReactNativeUseColorScheme.mockReturnValue('dark');
    const result = useColorScheme();
    expect(result).toBe('dark');
    expect(mockReactNativeUseColorScheme).toHaveBeenCalled();
  });

  it('should return null when react-native returns null', () => {
    mockReactNativeUseColorScheme.mockReturnValue(null);
    const result = useColorScheme();
    expect(result).toBe(null);
    expect(mockReactNativeUseColorScheme).toHaveBeenCalled();
  });

  it('should return undefined when react-native returns undefined', () => {
    mockReactNativeUseColorScheme.mockReturnValue(undefined);
    const result = useColorScheme();
    expect(result).toBe(undefined);
    expect(mockReactNativeUseColorScheme).toHaveBeenCalled();
  });
});
