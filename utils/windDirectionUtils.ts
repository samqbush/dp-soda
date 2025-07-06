import { WindStationConfig } from '@/types/windStation';

export type WindDirectionStatus = 'perfect' | 'good';

export function assessWindDirection(
  currentDirection: number,
  idealConfig?: WindStationConfig['idealWindDirection']
): WindDirectionStatus | null {
  if (!idealConfig) return null;
  
  const { range, perfect, perfectTolerance = 10 } = idealConfig;
  
  // Check if within perfect tolerance
  const perfectMin = (perfect - perfectTolerance + 360) % 360;
  const perfectMax = (perfect + perfectTolerance) % 360;
  
  if (isAngleInRange(currentDirection, perfectMin, perfectMax)) {
    return 'perfect';
  }
  
  // Check if within ideal range
  if (isAngleInRange(currentDirection, range.min, range.max)) {
    return 'good';
  }
  
  // Return null when outside ideal range (no indicator)
  return null;
}

// Helper function to check if an angle is within a range, handling 360° wraparound
function isAngleInRange(angle: number, min: number, max: number): boolean {
  if (min <= max) {
    // Normal range (e.g., 270-330)
    return angle >= min && angle <= max;
  } else {
    // Range crosses 360° (e.g., 350-30)
    return angle >= min || angle <= max;
  }
}

export function getWindDirectionIndicator(status: WindDirectionStatus | null): string {
  switch (status) {
    case 'perfect':
      return '🎯';
    case 'good':
      return '✅';
    default:
      return '';
  }
}

export function getWindDirectionStatusText(status: WindDirectionStatus | null): string {
  switch (status) {
    case 'perfect':
      return 'Perfect direction!';
    case 'good':
      return 'Good direction';
    default:
      return '';
  }
}
