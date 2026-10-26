import { describe, expect, it } from 'vitest';
import {
  chartMetricRow,
  chartRows,
  formatChartCount,
  formatChartCurrency,
  formatChartPercent,
  placeTooltip,
  sharePercent,
  toChartNumber,
} from './chartTooltipFormat';

describe('formatação dos tooltips', () => {
  it('formata moeda, percentual e quantidade no padrão brasileiro', () => {
    expect(formatChartCurrency(1250.5)).toBe(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(1250.5),
    );
    expect(formatChartCurrency(0)).toBe(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0),
    );
    expect(formatChartCurrency(-10)).toBe(
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(-10),
    );
    expect(formatChartPercent(12.5)).toBe('12,5%');
    expect(formatChartPercent(12)).toBe('12%');
    expect(formatChartCount(1, 'ordem', 'ordens')).toBe('1 ordem');
    expect(formatChartCount(3, 'ordem', 'ordens')).toBe('3 ordens');
  });

  it('não transforma valor ausente em zero', () => {
    expect(formatChartCurrency(null)).toBeNull();
    expect(formatChartCurrency(undefined)).toBeNull();
    expect(formatChartPercent(Number.NaN)).toBeNull();
    expect(toChartNumber('')).toBeNull();
    expect(toChartNumber('10')).toBe(10);
    expect(chartMetricRow('Receita', null).value).toBe('—');
    expect(chartRows([null, chartMetricRow('Saldo', formatChartCurrency(0))])).toHaveLength(1);
  });

  it('calcula participação somente quando o total existe', () => {
    expect(sharePercent(25, 100)).toBe(25);
    expect(sharePercent(10, 0)).toBeNull();
    expect(sharePercent(null, 100)).toBeNull();
  });
});

describe('posicionamento do tooltip', () => {
  const size = { width: 180, height: 72 };
  const viewport = { width: 800, height: 600 };

  it('abre acima e à direita do cursor quando há espaço', () => {
    expect(placeTooltip({ x: 200, y: 300 }, size, viewport)).toEqual({ top: 214, left: 214 });
  });

  it('inverte para a esquerda e para baixo perto das bordas', () => {
    const nearCorner = placeTooltip({ x: 760, y: 20 }, size, viewport);
    expect(nearCorner.left).toBeLessThan(760);
    expect(nearCorner.top).toBeGreaterThanOrEqual(8);
    expect(nearCorner.left + size.width).toBeLessThanOrEqual(viewport.width - 8);
  });

  it('permanece dentro da viewport mesmo com o cursor no canto inferior', () => {
    const placed = placeTooltip({ x: 790, y: 590 }, size, viewport);
    expect(placed.left).toBeGreaterThanOrEqual(8);
    expect(placed.top).toBeGreaterThanOrEqual(8);
    expect(placed.left + size.width).toBeLessThanOrEqual(viewport.width - 8);
    expect(placed.top + size.height).toBeLessThanOrEqual(viewport.height - 8);
  });
});
