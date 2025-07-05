import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useColorScheme as useColorSchemeWeb } from '@/hooks/useColorScheme.web';
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

  describe('Native useColorScheme', () => {
    it('should re-export useColorScheme from react-native', () => {
      // This is a simple re-export, so we just need to verify it exists and is the same function
      expect(useColorScheme).toBeDefined();
      expect(typeof useColorScheme).toBe('function');
      
      // Test that it actually works by calling it
      const result = useColorScheme();
      expect(['light', 'dark', null, undefined]).toContain(result);
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

  describe('Web useColorScheme', () => {
    it('should be defined and return a valid color scheme', () => {
      mockReactNativeUseColorScheme.mockReturnValue('dark');
      
      const { result } = renderHook(() => useColorSchemeWeb());
      
      // Should return a valid color scheme value
      expect(['light', 'dark', null, undefined]).toContain(result.current);
    });

    it('should return dark theme when react-native hook returns dark', async () => {
      mockReactNativeUseColorScheme.mockReturnValue('dark');
      
      const { result } = renderHook(() => useColorSchemeWeb());
      
      // After effects run, should eventually match the native hook
      await waitFor(() => {
        expect(result.current).toBe('dark');
      });
    });

    it('should return light theme when react-native hook returns light', async () => {
      mockReactNativeUseColorScheme.mockReturnValue('light');
      
      const { result } = renderHook(() => useColorSchemeWeb());
      
      // Should return light theme
      await waitFor(() => {
        expect(result.current).toBe('light');
      }, { timeout: 100 });
    });

    it('should handle null color scheme', async () => {
      mockReactNativeUseColorScheme.mockReturnValue(null);
      
      const { result } = renderHook(() => useColorSchemeWeb());
      
      // Should handle null values
      await waitFor(() => {
        expect(result.current).toBe(null);
      }, { timeout: 100 });
    });

    it('should use useEffect for hydration logic', () => {
      // Test that the hook uses useEffect (this ensures hydration logic exists)
      const useEffectSpy = jest.spyOn(React, 'useEffect');
      
      renderHook(() => useColorSchemeWeb());
      
      expect(useEffectSpy).toHaveBeenCalled();
      
      useEffectSpy.mockRestore();
    });

    it('should use useState for hydration state', () => {
      // Test that the hook uses useState (this ensures hydration state exists)
      const useStateSpy = jest.spyOn(React, 'useState');
      
      renderHook(() => useColorSchemeWeb());
      
      expect(useStateSpy).toHaveBeenCalled();
      
      useStateSpy.mockRestore();
    });
  });
});
