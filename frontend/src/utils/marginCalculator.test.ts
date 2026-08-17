import { describe, it, expect } from 'vitest';
import { calculateMargin } from './marginCalculator';

describe('calculateMargin', () => {
  it('should calculate margin correctly', () => {
    // Compra 320, Venda 500 -> 36%
    expect(calculateMargin(320, 500)).toBeCloseTo(36, 2);
    // Compra 100, Venda 200 -> 50%
    expect(calculateMargin(100, 200)).toBeCloseTo(50, 2);
  });

  it('should return 0 when venda is 0 or undefined', () => {
    expect(calculateMargin(100, 0)).toBe(0);
    expect(calculateMargin(100, null as any)).toBe(0);
    expect(calculateMargin(100, undefined)).toBe(0);
  });

  it('should return negative margin when compra > venda', () => {
    expect(calculateMargin(600, 500)).toBeCloseTo(-20, 2);
  });

  it('should treat nullish compra as 0', () => {
    expect(calculateMargin(null as any, 500)).toBe(100);
    expect(calculateMargin(undefined, 500)).toBe(100);
  });

  it('should return 0 when compra and venda are equal', () => {
    expect(calculateMargin(500, 500)).toBe(0);
  });
});
