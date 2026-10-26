export type ChartTooltipRow = {
  label: string;
  value: string;
  color?: string;
};

export type ChartValueFormat = 'currency' | 'number' | 'percent';

export type TooltipAnchor = { x: number; y: number };
export type TooltipSize = { width: number; height: number };
export type TooltipViewport = { width: number; height: number };

const EDGE = 8;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 0,
});

export function toChartNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatChartCurrency(value: number | null | undefined): string | null {
  const amount = toChartNumber(value);
  if (amount === null) return null;
  return currencyFormatter.format(amount);
}

export function formatChartNumber(value: number | null | undefined): string | null {
  const amount = toChartNumber(value);
  if (amount === null) return null;
  return numberFormatter.format(amount);
}

export function formatChartPercent(value: number | null | undefined): string | null {
  const amount = toChartNumber(value);
  if (amount === null) return null;
  return `${percentFormatter.format(amount)}%`;
}

export function formatChartCount(
  value: number | null | undefined,
  singular: string,
  plural: string,
): string | null {
  const amount = toChartNumber(value);
  if (amount === null) return null;
  const formatted = integerFormatter.format(amount);
  return `${formatted} ${Math.abs(amount) === 1 ? singular : plural}`;
}

export function formatTooltipValue(format: ChartValueFormat, value: number | null): string | null {
  if (format === 'currency') return formatChartCurrency(value);
  if (format === 'percent') return formatChartPercent(value);
  return formatChartNumber(value);
}

export function sharePercent(
  value: number | null | undefined,
  total: number | null | undefined,
): number | null {
  const amount = toChartNumber(value);
  const base = toChartNumber(total);
  if (amount === null || base === null || base === 0) return null;
  return (amount / base) * 100;
}

export function chartRow(
  label: string,
  value: string | null | undefined,
  color?: string,
): ChartTooltipRow | null {
  if (!value || !value.trim()) return null;
  return { label, value, color };
}

export function chartMetricRow(
  label: string,
  value: string | null | undefined,
  color?: string,
): ChartTooltipRow {
  return { label, value: value && value.trim() ? value : '—', color };
}

export function chartRows(
  rows: Array<ChartTooltipRow | null | false | undefined>,
): ChartTooltipRow[] {
  return rows.filter((row): row is ChartTooltipRow => Boolean(row && row.value.trim()));
}

export function placeTooltip(
  anchor: TooltipAnchor,
  size: TooltipSize,
  viewport: TooltipViewport,
  gap = 14,
): { top: number; left: number } {
  const maxLeft = Math.max(EDGE, viewport.width - size.width - EDGE);
  const maxTop = Math.max(EDGE, viewport.height - size.height - EDGE);

  let left = anchor.x + gap;
  if (left > maxLeft) left = anchor.x - size.width - gap;
  if (left < EDGE) left = EDGE;
  if (left > maxLeft) left = maxLeft;

  let top = anchor.y - size.height - gap;
  if (top < EDGE) top = anchor.y + gap;
  if (top > maxTop) top = maxTop;
  if (top < EDGE) top = EDGE;

  return { top, left };
}
