import { describe, expect, it } from 'vitest';
import { formatBrlInput, formatCompetenciaInput, formatFileSize, isCompetenciaValida, parseBrl } from './brl';

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

describe('competência e arquivos', () => {
  it('aplica a máscara MM/AAAA durante a digitação', () => {
    expect(formatCompetenciaInput('0')).toBe('0');
    expect(formatCompetenciaInput('082026')).toBe('08/2026');
    expect(formatCompetenciaInput('08/20261')).toBe('08/2026');
  });

  it('valida mês e ano da competência', () => {
    expect(isCompetenciaValida('08/2026')).toBe(true);
    expect(isCompetenciaValida('13/2026')).toBe(false);
    expect(isCompetenciaValida('08/26')).toBe(false);
  });

  it('formata o tamanho do arquivo', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
  });
});
