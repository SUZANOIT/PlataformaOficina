/**
 * Indicadores dos orçamentos de uma plataforma de gestão (tela Plataformas).
 * Mesma regra de antes para "pagos" (Pago ou Parcialmente Pago), agora com
 * filtro opcional por status do orçamento e quebra por status.
 */
export interface PlatformQuoteLike { status: string; valor: number }

export const PAID_STATUSES = ['Pago', 'Parcialmente Pago'];
const round = (v: number) => Math.round(v * 100) / 100;

export function summarizePlatformQuotes(quotes: PlatformQuoteLike[], statusFilter?: string) {
  const filtered = statusFilter ? quotes.filter(q => q.status === statusFilter) : quotes;
  const porStatusMap = new Map<string, { status: string; quantidade: number; valor: number }>();
  let totalValue = 0;
  let paidValue = 0;
  let paidQuotesCount = 0;
  for (const q of filtered) {
    const valor = Number(q.valor) || 0;
    totalValue += valor;
    if (PAID_STATUSES.includes(q.status)) { paidQuotesCount++; paidValue += valor; }
    const row = porStatusMap.get(q.status) || { status: q.status, quantidade: 0, valor: 0 };
    row.quantidade++;
    row.valor += valor;
    porStatusMap.set(q.status, row);
  }
  return {
    totalQuotesCount: filtered.length,
    totalValue: round(totalValue),
    paidQuotesCount,
    paidValue: round(paidValue),
    openValue: round(totalValue - paidValue),
    porStatus: [...porStatusMap.values()]
      .map(r => ({ ...r, valor: round(r.valor) }))
      .sort((a, b) => b.quantidade - a.quantidade || a.status.localeCompare(b.status, 'pt-BR')),
  };
}
