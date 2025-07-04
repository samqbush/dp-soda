import { renderHook } from '@testing-library/react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

// Mock the useColorScheme hook
jest.mock('@/hooks/useColorScheme', () => ({
  useColorScheme: jest.fn(),
}));

// Mock the Colors constant
jest.mock('@/constants/Colors', () => ({
  Colors: {
    light: {
      text: '#11181C',
      background: '#fff',
      tint: '#0a7ea4',
      icon: '#687076',
      tabIconDefault: '#687076',
      tabIconSelected: '#0a7ea4',
      card: '#f5f5f5',
    },
    dark: {
      text: '#ECEDEE',
      background: '#151718',
      tint: '#fff',
      icon: '#9BA1A6',
      tabIconDefault: '#9BA1A6',
      tabIconSelected: '#fff',
      card: '#1e2022',
    },
  },
}));

describe('useThemeColor Hook Tests', () => {
  const mockUseColorScheme = require('@/hooks/useColorScheme').useColorScheme;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return light theme color when theme is light', () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => 
      useThemeColor({}, 'text')
    );

    expect(result.current).toBe('#11181C');
  });

  it('should return dark theme color when theme is dark', () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() => 
      useThemeColor({}, 'text')
    );

    expect(result.current).toBe('#ECEDEE');
  });

  it('should return light theme color when theme is null (fallback)', () => {
    mockUseColorScheme.mockReturnValue(null);

    const { result } = renderHook(() => 
      useThemeColor({}, 'background')
    );

    expect(result.current).toBe('#fff');
  });

  it('should return prop color when provided for light theme', () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => 
      useThemeColor({ light: '#custom-light', dark: '#custom-dark' }, 'text')
    );

    expect(result.current).toBe('#custom-light');
  });

  it('should return prop color when provided for dark theme', () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { result } = renderHook(() => 
      useThemeColor({ light: '#custom-light', dark: '#custom-dark' }, 'text')
    );

    expect(result.current).toBe('#custom-dark');
  });

  it('should fallback to theme color when prop color is not provided', () => {
    mockUseColorScheme.mockReturnValue('light');

    const { result } = renderHook(() => 
      useThemeColor({ dark: '#custom-dark' }, 'tint')
    );

    expect(result.current).toBe('#0a7ea4'); // Light theme tint from Colors
  });

  it('should work with different color names', () => {
    mockUseColorScheme.mockReturnValue('dark');

    const { result: iconResult } = renderHook(() => 
      useThemeColor({}, 'icon')
    );
    
    const { result: backgroundResult } = renderHook(() => 
      useThemeColor({}, 'background')
    );

    expect(iconResult.current).toBe('#9BA1A6');
    expect(backgroundResult.current).toBe('#151718');
  });
});
