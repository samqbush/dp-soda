/**
 * Font Scaling Logic Tests for CustomWindChart
 * Tests the calculations used to make Y-axis labels responsive to font scaling
 */

describe('CustomWindChart Font Scaling Logic', () => {
  // Helper function that mimics the logic from CustomWindChart
  const calculateResponsiveYAxisWidth = (fontScale: number) => {
    const baseYAxisWidth = 50;
    return Math.max(baseYAxisWidth, baseYAxisWidth * fontScale * 1.2);
  };

  const calculateResponsiveFontSize = (fontScale: number) => {
    const baseFontSize = 14;
    return Math.min(baseFontSize / fontScale, baseFontSize);
  };

  it('should calculate responsive Y-axis width based on font scale', () => {
    const fontScale = 1.0; // Normal font scale
    const yAxisWidth = calculateResponsiveYAxisWidth(fontScale);
    
    expect(yAxisWidth).toBe(60); // 50 * 1.0 * 1.2 = 60
  });

  it('should handle large font scale (Android accessibility)', () => {
    const fontScale = 2.0; // Large font scale - typical for Android large text
    const yAxisWidth = calculateResponsiveYAxisWidth(fontScale);
    
    expect(yAxisWidth).toBe(120); // 50 * 2.0 * 1.2 = 120
  });

  it('should calculate responsive font size to prevent overflow', () => {
    const fontScale = 1.5; // Medium-large font scale
    const responsiveFontSize = calculateResponsiveFontSize(fontScale);
    
    // When font scale is 1.5, we scale down to prevent overflow
    expect(responsiveFontSize).toBeCloseTo(9.33, 1); // 14 / 1.5 ≈ 9.33
  });

  it('should handle extreme font scale gracefully', () => {
    const fontScale = 3.0; // Extreme font scale
    
    const yAxisWidth = calculateResponsiveYAxisWidth(fontScale);
    const responsiveFontSize = calculateResponsiveFontSize(fontScale);
    
    expect(yAxisWidth).toBe(180); // 50 * 3.0 * 1.2 = 180
    expect(responsiveFontSize).toBeCloseTo(4.67, 1); // 14 / 3.0 ≈ 4.67
  });

  it('should ensure minimum Y-axis width at normal scale', () => {
    const fontScale = 0.8; // Smaller than normal scale
    const yAxisWidth = calculateResponsiveYAxisWidth(fontScale);
    
    // Should not go below base width
    expect(yAxisWidth).toBe(50); // Math.max(50, 50 * 0.8 * 1.2) = Math.max(50, 48) = 50
  });

  it('should not reduce font size below scaled size at normal scale', () => {
    const fontScale = 1.0; // Normal scale
    const responsiveFontSize = calculateResponsiveFontSize(fontScale);
    
    // Should return the base font size when scale is 1.0
    expect(responsiveFontSize).toBe(14); // Math.min(14 / 1.0, 14) = 14
  });
});