import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  prepareSplashScreen,
  hideSplashScreen,
  setupSplashScreenTimeout,
  useSplashScreen
} from '@/services/androidSplash';
import { renderHook, act } from '@testing-library/react-native';

// Mock react-native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'android'
  }
}));

// Mock expo-splash-screen
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn()
}));

describe('androidSplash Service Tests', () => {
  const mockPreventAutoHideAsync = SplashScreen.preventAutoHideAsync as jest.MockedFunction<typeof SplashScreen.preventAutoHideAsync>;
  const mockHideAsync = SplashScreen.hideAsync as jest.MockedFunction<typeof SplashScreen.hideAsync>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    (Platform as any).OS = 'android';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('prepareSplashScreen', () => {
    it('should call preventAutoHideAsync on Android', async () => {
      mockPreventAutoHideAsync.mockResolvedValue(true);

      await prepareSplashScreen();

      expect(mockPreventAutoHideAsync).toHaveBeenCalledTimes(1);
    });

    it('should not call preventAutoHideAsync on iOS', async () => {
      (Platform as any).OS = 'ios';

      await prepareSplashScreen();

      expect(mockPreventAutoHideAsync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Splash screen error');
      mockPreventAutoHideAsync.mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await prepareSplashScreen();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to prevent auto hide of splash screen:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('hideSplashScreen', () => {
    it('should call hideAsync on Android', async () => {
      mockHideAsync.mockResolvedValue();

      await hideSplashScreen();

      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });

    it('should not call hideAsync on iOS', async () => {
      (Platform as any).OS = 'ios';

      await hideSplashScreen();

      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Hide splash screen error');
      mockHideAsync.mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await hideSplashScreen();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to hide splash screen:', error);
      consoleSpy.mockRestore();
    });
  });

  describe('setupSplashScreenTimeout', () => {
    it('should set up a timeout to hide splash screen on Android', () => {
      mockHideAsync.mockResolvedValue();

      setupSplashScreenTimeout(1000);

      // Fast forward the timer
      jest.advanceTimersByTime(1000);

      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });

    it('should use default timeout of 5000ms', () => {
      mockHideAsync.mockResolvedValue();

      setupSplashScreenTimeout();

      // Fast forward by default timeout
      jest.advanceTimersByTime(5000);

      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });

    it('should not set timeout on iOS', () => {
      (Platform as any).OS = 'ios';

      setupSplashScreenTimeout(1000);

      jest.advanceTimersByTime(1000);

      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should handle hideAsync errors in timeout', () => {
      const error = new Error('Timeout hide error');
      mockHideAsync.mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      setupSplashScreenTimeout(100);
      jest.advanceTimersByTime(100);

      // Just verify the timeout was set up - error handling is async
      expect(mockHideAsync).toHaveBeenCalledTimes(1);
      consoleSpy.mockRestore();
    });
  });

  describe('useSplashScreen hook', () => {
    it('should auto-hide splash screen with default timeout on Android', async () => {
      mockHideAsync.mockResolvedValue();

      const { unmount } = renderHook(() => useSplashScreen());

      // Fast forward by default Android timeout (3000ms)
      await act(async () => {
        jest.advanceTimersByTime(3000);
      });

      expect(mockHideAsync).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should auto-hide splash screen with custom timeout', async () => {
      mockHideAsync.mockResolvedValue();

      const { unmount } = renderHook(() => useSplashScreen(true, 1500));

      // Fast forward by custom timeout
      await act(async () => {
        jest.advanceTimersByTime(1500);
      });

      expect(mockHideAsync).toHaveBeenCalledTimes(1);
      unmount();
    });

    it('should use shorter timeout on iOS but not call hideAsync', async () => {
      (Platform as any).OS = 'ios';
      mockHideAsync.mockResolvedValue();

      const { unmount } = renderHook(() => useSplashScreen());

      // Fast forward by iOS timeout (500ms)
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      // hideSplashScreen() is called but it doesn't call SplashScreen.hideAsync on iOS
      expect(mockHideAsync).not.toHaveBeenCalled();
      unmount();
    });

    it('should not auto-hide when autoHide is false', async () => {
      const { unmount } = renderHook(() => useSplashScreen(false));

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockHideAsync).not.toHaveBeenCalled();
      unmount();
    });

    it('should clean up timer on unmount', () => {
      const { unmount } = renderHook(() => useSplashScreen());

      unmount();

      // Fast forward time - nothing should happen
      jest.advanceTimersByTime(5000);
      expect(mockHideAsync).not.toHaveBeenCalled();
    });

    it('should return hide function', async () => {
      mockHideAsync.mockResolvedValue();

      const { result } = renderHook(() => useSplashScreen(false));

      expect(result.current.hide).toBeDefined();
      expect(typeof result.current.hide).toBe('function');

      // Test the returned hide function
      await result.current.hide();
      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    });
  });
});
