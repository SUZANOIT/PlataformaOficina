import { describe, expect, it } from 'vitest';
import { formatBrlInput, parseBrl } from './brl';

describe('valor em reais', () => {
  it('formata a digitação como moeda brasileira', () => {
    expect(formatBrlInput('125050')).toBe('1.250,50');
  });

  it('interpreta 1.250,50 como número maior que zero', () => {
    expect(parseBrl('1.250,50')).toBe(1250.5);
  });

  it('rejeita zero e texto', () => {
    expect(parseBrl('0,00')).toBeNull();
    expect(parseBrl('')).toBeNull();
    expect(parseBrl('abc')).toBeNull();
  });
});
