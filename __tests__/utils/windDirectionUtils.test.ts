import {
  assessWindDirection,
  getWindDirectionIndicator,
  getWindDirectionStatusText,
  type WindDirectionStatus
} from '@/utils/windDirectionUtils';
import { WindStationConfig } from '@/types/windStation';

describe('Wind Direction Utilities Tests', () => {
  const sodaLakeConfig: WindStationConfig['idealWindDirection'] = {
    range: { min: 270, max: 330 },
    perfect: 297,
    perfectTolerance: 10
  };

  const standleyLakeConfig: WindStationConfig['idealWindDirection'] = {
    range: { min: 225, max: 315 },
    perfect: 270,
    perfectTolerance: 15
  };

  describe('assessWindDirection', () => {
    describe('Soda Lake configuration', () => {
      it('should return "perfect" for exact perfect direction', () => {
        const result = assessWindDirection(297, sodaLakeConfig);
        expect(result).toBe('perfect');
      });

      it('should return "perfect" for direction within perfect tolerance', () => {
        // Within ±10 degrees of 297
        expect(assessWindDirection(290, sodaLakeConfig)).toBe('perfect'); // 297-7
        expect(assessWindDirection(305, sodaLakeConfig)).toBe('perfect'); // 297+8
        expect(assessWindDirection(287, sodaLakeConfig)).toBe('perfect'); // 297-10 (boundary)
        expect(assessWindDirection(307, sodaLakeConfig)).toBe('perfect'); // 297+10 (boundary)
      });

      it('should return "good" for direction within ideal range but outside perfect tolerance', () => {
        // Within 270-330 range but outside 287-307 perfect range
        expect(assessWindDirection(275, sodaLakeConfig)).toBe('good');
        expect(assessWindDirection(320, sodaLakeConfig)).toBe('good');
        expect(assessWindDirection(270, sodaLakeConfig)).toBe('good'); // Range boundary
        expect(assessWindDirection(330, sodaLakeConfig)).toBe('good'); // Range boundary
      });

      it('should return null for direction outside ideal range', () => {
        expect(assessWindDirection(180, sodaLakeConfig)).toBe(null); // South
        expect(assessWindDirection(90, sodaLakeConfig)).toBe(null);  // East
        expect(assessWindDirection(0, sodaLakeConfig)).toBe(null);   // North
        expect(assessWindDirection(269, sodaLakeConfig)).toBe(null); // Just outside range
        expect(assessWindDirection(331, sodaLakeConfig)).toBe(null); // Just outside range
      });
    });

    describe('Standley Lake configuration', () => {
      it('should return "perfect" for exact perfect direction', () => {
        const result = assessWindDirection(270, standleyLakeConfig);
        expect(result).toBe('perfect');
      });

      it('should return "perfect" for direction within perfect tolerance', () => {
        // Within ±15 degrees of 270
        expect(assessWindDirection(260, standleyLakeConfig)).toBe('perfect'); // 270-10
        expect(assessWindDirection(280, standleyLakeConfig)).toBe('perfect'); // 270+10
        expect(assessWindDirection(255, standleyLakeConfig)).toBe('perfect'); // 270-15 (boundary)
        expect(assessWindDirection(285, standleyLakeConfig)).toBe('perfect'); // 270+15 (boundary)
      });

      it('should return "good" for direction within ideal range but outside perfect tolerance', () => {
        // Within 225-315 range but outside 255-285 perfect range
        expect(assessWindDirection(230, standleyLakeConfig)).toBe('good');
        expect(assessWindDirection(300, standleyLakeConfig)).toBe('good');
        expect(assessWindDirection(225, standleyLakeConfig)).toBe('good'); // Range boundary
        expect(assessWindDirection(315, standleyLakeConfig)).toBe('good'); // Range boundary
      });

      it('should return null for direction outside ideal range', () => {
        expect(assessWindDirection(180, standleyLakeConfig)).toBe(null); // South
        expect(assessWindDirection(45, standleyLakeConfig)).toBe(null);  // Northeast
        expect(assessWindDirection(224, standleyLakeConfig)).toBe(null); // Just outside range
        expect(assessWindDirection(316, standleyLakeConfig)).toBe(null); // Just outside range
      });
    });

    describe('360° boundary handling', () => {
      const boundaryConfig: WindStationConfig['idealWindDirection'] = {
        range: { min: 350, max: 30 }, // Crosses 360°/0° boundary
        perfect: 10,
        perfectTolerance: 15
      };

      it('should handle perfect range crossing 360° boundary', () => {
        // Perfect range: 355° to 25° (crossing 0°)
        expect(assessWindDirection(0, boundaryConfig)).toBe('perfect');
        expect(assessWindDirection(10, boundaryConfig)).toBe('perfect'); // Exact perfect
        expect(assessWindDirection(355, boundaryConfig)).toBe('perfect'); // 10-15 (wrapping)
        expect(assessWindDirection(25, boundaryConfig)).toBe('perfect');  // 10+15
      });

      it('should handle ideal range crossing 360° boundary', () => {
        // Ideal range: 350° to 30°, but outside perfect range (355° to 25°)
        expect(assessWindDirection(350, boundaryConfig)).toBe('good'); // Range start
        expect(assessWindDirection(30, boundaryConfig)).toBe('good');  // Range end
        expect(assessWindDirection(345, boundaryConfig)).toBe(null);   // Outside range
        expect(assessWindDirection(35, boundaryConfig)).toBe(null);    // Outside range
      });
    });

    describe('edge cases', () => {
      it('should return null when no config provided', () => {
        const result = assessWindDirection(270, undefined);
        expect(result).toBe(null);
      });

      it('should handle default perfect tolerance when not specified', () => {
        const configWithoutTolerance: WindStationConfig['idealWindDirection'] = {
          range: { min: 270, max: 330 },
          perfect: 300
          // No perfectTolerance specified, should default to 10
        };

        expect(assessWindDirection(295, configWithoutTolerance)).toBe('perfect'); // 300-5
        expect(assessWindDirection(305, configWithoutTolerance)).toBe('perfect'); // 300+5
        expect(assessWindDirection(290, configWithoutTolerance)).toBe('perfect'); // 300-10 (boundary)
        expect(assessWindDirection(310, configWithoutTolerance)).toBe('perfect'); // 300+10 (boundary)
        expect(assessWindDirection(289, configWithoutTolerance)).toBe('good');    // Outside perfect, inside range
        expect(assessWindDirection(311, configWithoutTolerance)).toBe('good');    // Outside perfect, inside range
      });
    });
  });

  describe('getWindDirectionIndicator', () => {
    it('should return correct indicators for each status', () => {
      expect(getWindDirectionIndicator('perfect')).toBe('🎯');
      expect(getWindDirectionIndicator('good')).toBe('✅');
      expect(getWindDirectionIndicator(null)).toBe('');
    });
  });

  describe('getWindDirectionStatusText', () => {
    it('should return correct text for each status', () => {
      expect(getWindDirectionStatusText('perfect')).toBe('Perfect direction!');
      expect(getWindDirectionStatusText('good')).toBe('Good direction');
      expect(getWindDirectionStatusText(null)).toBe('');
    });
  });
});
