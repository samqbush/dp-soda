// Quick test to understand actual behavior
import { getWindChartTimeWindow } from '@/utils/timeWindowUtils';

describe('Debug Time Window Behavior', () => {
  it('should show actual behavior for different times', () => {
    // Test different times and see what we get
    const testTimes = [
      '2025-07-04T02:30:00.000Z', // 2:30 AM UTC
      '2025-07-04T08:00:00.000Z', // 8:00 AM UTC  
      '2025-07-04T15:00:00.000Z', // 3:00 PM UTC
      '2025-07-04T22:30:00.000Z', // 10:30 PM UTC
    ];

    const results: any[] = [];

    testTimes.forEach(timeStr => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date(timeStr));

      const result = getWindChartTimeWindow();
      const localHour = new Date(timeStr).getHours();
      
      results.push({
        time: timeStr,
        localHour,
        result
      });

      jest.useRealTimers();
    });

    // Use assertions to see the actual results
    results.forEach(({ time, localHour, result }) => {
      console.log(`Time: ${time} (${localHour}h local) =>`, result);
    });

    // The test passes but we can see the output
    expect(results).toHaveLength(4);
  });
});
