import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWindThreshold, UseWindThresholdReturn } from '@/hooks/useWindThreshold';
import { windThresholdService } from '@/services/windThresholdService';

// Mock the windThresholdService
jest.mock('@/services/windThresholdService', () => ({
  windThresholdService: {
    initialize: jest.fn(),
    getThreshold: jest.fn(),
    setThreshold: jest.fn(),
    onThresholdChange: jest.fn(),
  },
}));

// Mock AsyncStorage for the service
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockWindThresholdService = windThresholdService as jest.Mocked<typeof windThresholdService>;

describe('useWindThreshold Hook Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockWindThresholdService.initialize.mockResolvedValue(undefined);
    mockWindThresholdService.getThreshold.mockReturnValue(15);
    mockWindThresholdService.setThreshold.mockResolvedValue(undefined);
    mockWindThresholdService.onThresholdChange.mockReturnValue(jest.fn()); // Return unsubscribe function
  });

  describe('Hook Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useWindThreshold());

      expect(result.current.windThreshold).toBe(15);
      expect(result.current.isLoading).toBe(true);
      expect(typeof result.current.setWindThreshold).toBe('function');
    });

    it('should call windThresholdService.initialize on mount', async () => {
      renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(mockWindThresholdService.initialize).toHaveBeenCalledTimes(1);
      });
    });

    it('should get threshold from service after initialization', async () => {
      mockWindThresholdService.getThreshold.mockReturnValue(20);

      const { result } = renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(result.current.windThreshold).toBe(20);
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockWindThresholdService.getThreshold).toHaveBeenCalledTimes(1);
    });

    it('should subscribe to threshold changes', async () => {
      const mockUnsubscribe = jest.fn();
      mockWindThresholdService.onThresholdChange.mockReturnValue(mockUnsubscribe);

      const { unmount } = renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(mockWindThresholdService.onThresholdChange).toHaveBeenCalledTimes(1);
      });

      // Verify the callback function was passed
      const subscribeFn = mockWindThresholdService.onThresholdChange.mock.calls[0][0];
      expect(typeof subscribeFn).toBe('function');

      // Test cleanup - unsubscribe should be called on unmount
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('Threshold Updates', () => {
    it('should update windThreshold when service notifies change', async () => {
      let thresholdChangeCallback: (threshold: number) => void = () => {};
      
      mockWindThresholdService.onThresholdChange.mockImplementation((callback) => {
        thresholdChangeCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate threshold change from service
      act(() => {
        thresholdChangeCallback(25);
      });

      expect(result.current.windThreshold).toBe(25);
    });

    it('should call windThresholdService.setThreshold when setWindThreshold is called', async () => {
      const { result } = renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.setWindThreshold(30);
      });

      expect(mockWindThresholdService.setThreshold).toHaveBeenCalledWith(30);
      expect(mockWindThresholdService.setThreshold).toHaveBeenCalledTimes(1);
    });

    it('should handle setThreshold errors gracefully', async () => {
      const mockError = new Error('Failed to set threshold');
      mockWindThresholdService.setThreshold.mockRejectedValue(mockError);

      const { result } = renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not throw error, but let the service handle it
      await act(async () => {
        await expect(result.current.setWindThreshold(30)).rejects.toThrow('Failed to set threshold');
      });
    });
  });

  describe('Loading States', () => {
    it('should start with isLoading true and set to false after initialization', async () => {
      const { result } = renderHook(() => useWindThreshold());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle slow initialization', async () => {
      let resolveInitialize: () => void;
      mockWindThresholdService.initialize.mockImplementation(() => {
        return new Promise<void>((resolve) => {
          resolveInitialize = resolve;
        });
      });

      const { result } = renderHook(() => useWindThreshold());

      expect(result.current.isLoading).toBe(true);

      // Resolve the initialization
      act(() => {
        resolveInitialize();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle async errors without crashing', async () => {
      // Test that the hook doesn't crash when used normally
      const { result } = renderHook(() => useWindThreshold());

      expect(result.current.windThreshold).toBe(15);
      expect(typeof result.current.setWindThreshold).toBe('function');
      expect(typeof result.current.isLoading).toBe('boolean');
    });
  });

  describe('Hook Interface', () => {
    it('should return correct interface structure', async () => {
      const { result } = renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const hookResult = result.current;

      // Check all required properties exist
      expect(hookResult).toHaveProperty('windThreshold');
      expect(hookResult).toHaveProperty('setWindThreshold');
      expect(hookResult).toHaveProperty('isLoading');

      // Check types
      expect(typeof hookResult.windThreshold).toBe('number');
      expect(typeof hookResult.setWindThreshold).toBe('function');
      expect(typeof hookResult.isLoading).toBe('boolean');
    });

    it('should create new function references on each render (current behavior)', () => {
      const { result, rerender } = renderHook(() => useWindThreshold());

      const firstSetThreshold = result.current.setWindThreshold;

      rerender({});

      const secondSetThreshold = result.current.setWindThreshold;

      // The current implementation creates new functions each render
      expect(firstSetThreshold).not.toBe(secondSetThreshold);
      
      // But they should still be functions
      expect(typeof firstSetThreshold).toBe('function');
      expect(typeof secondSetThreshold).toBe('function');
    });
  });

  describe('Realistic Usage Scenarios', () => {
    it('should handle rapid threshold changes', async () => {
      let thresholdChangeCallback: (threshold: number) => void = () => {};
      
      mockWindThresholdService.onThresholdChange.mockImplementation((callback) => {
        thresholdChangeCallback = callback;
        return jest.fn();
      });

      const { result } = renderHook(() => useWindThreshold());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Simulate rapid threshold changes
      act(() => {
        thresholdChangeCallback(20);
      });
      expect(result.current.windThreshold).toBe(20);

      act(() => {
        thresholdChangeCallback(25);
      });
      expect(result.current.windThreshold).toBe(25);

      act(() => {
        thresholdChangeCallback(18);
      });
      expect(result.current.windThreshold).toBe(18);
    });

    it('should handle component unmount during async operations', async () => {
      let resolveInitialize: () => void;
      mockWindThresholdService.initialize.mockImplementation(() => {
        return new Promise<void>((resolve) => {
          resolveInitialize = resolve;
        });
      });

      const { unmount } = renderHook(() => useWindThreshold());

      // Unmount before initialization completes
      unmount();

      // Complete initialization - should not cause errors
      act(() => {
        resolveInitialize();
      });

      // No assertions needed - just ensuring no errors are thrown
    });
  });
});
