/**
 * Utility functions for calculating smart time windows for wind charts
 * Used to show data from 4am to current time, with 9pm cutoff for nighttime hours
 */
/**
 * Calculates the appropriate time window for wind charts based on current time
 * Rules:
 * - Start at 4am
 * - End at current time, but not past 9pm
 * - If current time is between midnight and 4am, use previous day's 4am-9pm window
 *
 * @returns TimeWindow object with startHour and endHour
 */
export function getWindChartTimeWindow() {
    const now = new Date();
    const currentHour = now.getHours();
    // If it's between midnight and 4am, we want to show yesterday's 4am-9pm window
    if (currentHour >= 0 && currentHour < 4) {
        return {
            startHour: 4,
            endHour: 21, // 9pm
            isMultiDay: true // This indicates we want previous day's data
        };
    }
    // If it's between 4am and 9pm, show from 4am to current hour
    if (currentHour >= 4 && currentHour <= 21) {
        return {
            startHour: 4,
            endHour: currentHour
        };
    }
    // If it's after 9pm, show 4am to 9pm (full windsurfing day)
    return {
        startHour: 4,
        endHour: 21 // 9pm
    };
}
/**
 * Filters wind data points based on the smart time window
 * Handles multi-day scenarios correctly
 *
 * @param data Array of wind data points
 * @param timeWindow TimeWindow object from getWindChartTimeWindow()
 * @returns Filtered array of wind data points
 */
export function filterWindDataByTimeWindow(data, timeWindow) {
    if (!data || data.length === 0)
        return [];
    const now = new Date();
    return data.filter(point => {
        const pointDate = new Date(point.time);
        const pointHour = pointDate.getHours();
        if (timeWindow.isMultiDay) {
            // For multi-day scenarios (current time is 0-4am), 
            // we want yesterday's data from 4am-9pm
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            // Check if point is from yesterday and within 4am-9pm window
            const isFromYesterday = pointDate.toDateString() === yesterday.toDateString();
            const isInTimeWindow = pointHour >= timeWindow.startHour && pointHour <= timeWindow.endHour;
            return isFromYesterday && isInTimeWindow;
        }
        else {
            // For same-day scenarios, check if point is from today and within time window
            const isFromToday = pointDate.toDateString() === now.toDateString();
            const isInTimeWindow = pointHour >= timeWindow.startHour && pointHour <= timeWindow.endHour;
            return isFromToday && isInTimeWindow;
        }
    });
}
