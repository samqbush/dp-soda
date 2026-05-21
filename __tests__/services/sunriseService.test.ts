import axios from 'axios';
import {
  fetchSunriseData,
  isBeforeSunrise,
  getMinutesUntilSunrise,
  SunriseData,
} from '@/services/sunriseService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SunriseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchSunriseData', () => {
    const mockApiResponse = {
      data: {
        results: {
          sunrise: '2026-05-20T12:00:00+00:00',
          sunset: '2026-05-21T02:30:00+00:00',
          solar_noon: '2026-05-20T19:15:00+00:00',
          day_length: '14:30:00',
          civil_twilight_begin: '2026-05-20T11:30:00+00:00',
          civil_twilight_end: '2026-05-21T03:00:00+00:00',
          nautical_twilight_begin: '2026-05-20T10:50:00+00:00',
          nautical_twilight_end: '2026-05-21T03:40:00+00:00',
          astronomical_twilight_begin: '2026-05-20T10:05:00+00:00',
          astronomical_twilight_end: '2026-05-21T04:25:00+00:00',
        },
        status: 'OK',
      },
    };

    it('should parse API response and return formatted sunrise data', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      const result = await fetchSunriseData();

      expect(result).not.toBeNull();
      expect(result!.sunrise).toBe('2026-05-20T12:00:00+00:00');
      expect(result!.sunset).toBe('2026-05-21T02:30:00+00:00');
      expect(result!.sunriseTime).toBeInstanceOf(Date);
      expect(result!.sunsetTime).toBeInstanceOf(Date);
      expect(result!.formatted.sunrise).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
      expect(result!.formatted.sunset).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
    });

    it('should call API with correct parameters', async () => {
      mockedAxios.get.mockResolvedValueOnce(mockApiResponse);

      await fetchSunriseData();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.sunrise-sunset.org/json',
        expect.objectContaining({
          params: {
            lat: 39.6547,
            lng: -105.1956,
            formatted: 0,
          },
          timeout: 10000,
        })
      );
    });

    it('should return null when API returns non-OK status', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { results: {}, status: 'INVALID_REQUEST' },
      });

      const result = await fetchSunriseData();
      expect(result).toBeNull();
    });

    it('should return null on network failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

      const result = await fetchSunriseData();
      expect(result).toBeNull();
    });

    it('should return null on timeout', async () => {
      mockedAxios.get.mockRejectedValueOnce({ code: 'ECONNABORTED' });

      const result = await fetchSunriseData();
      expect(result).toBeNull();
    });
  });

  describe('isBeforeSunrise', () => {
    it('should return false when sunriseData is null', () => {
      expect(isBeforeSunrise(null)).toBe(false);
    });

    it('should return true when current time is before sunrise', () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const data: SunriseData = {
        sunrise: futureDate.toISOString(),
        sunset: futureDate.toISOString(),
        sunriseTime: futureDate,
        sunsetTime: futureDate,
        formatted: { sunrise: '6:00 AM', sunset: '8:00 PM' },
      };
      expect(isBeforeSunrise(data)).toBe(true);
    });

    it('should return false when current time is after sunrise', () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
      const data: SunriseData = {
        sunrise: pastDate.toISOString(),
        sunset: pastDate.toISOString(),
        sunriseTime: pastDate,
        sunsetTime: pastDate,
        formatted: { sunrise: '6:00 AM', sunset: '8:00 PM' },
      };
      expect(isBeforeSunrise(data)).toBe(false);
    });
  });

  describe('getMinutesUntilSunrise', () => {
    it('should return null when sunriseData is null', () => {
      expect(getMinutesUntilSunrise(null)).toBeNull();
    });

    it('should return positive minutes when before sunrise', () => {
      const futureDate = new Date(Date.now() + 30 * 60000); // 30 min from now
      const data: SunriseData = {
        sunrise: futureDate.toISOString(),
        sunset: futureDate.toISOString(),
        sunriseTime: futureDate,
        sunsetTime: futureDate,
        formatted: { sunrise: '6:00 AM', sunset: '8:00 PM' },
      };
      const minutes = getMinutesUntilSunrise(data);
      expect(minutes).toBeGreaterThanOrEqual(29);
      expect(minutes).toBeLessThanOrEqual(30);
    });

    it('should return negative minutes when after sunrise', () => {
      const pastDate = new Date(Date.now() - 15 * 60000); // 15 min ago
      const data: SunriseData = {
        sunrise: pastDate.toISOString(),
        sunset: pastDate.toISOString(),
        sunriseTime: pastDate,
        sunsetTime: pastDate,
        formatted: { sunrise: '6:00 AM', sunset: '8:00 PM' },
      };
      const minutes = getMinutesUntilSunrise(data);
      expect(minutes).toBeLessThanOrEqual(-14);
      expect(minutes).toBeGreaterThanOrEqual(-16);
    });
  });
});
