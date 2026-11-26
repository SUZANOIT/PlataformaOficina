/**
 * Regra ÚNICA dos indicadores financeiros do Portal do Gestor de Frota.
 *
 * Usada pelo Dashboard, por Finanças / DRE e pelo cockpit do veículo, para que
 * os mesmos números apareçam em todas as telas e sempre fechem entre si:
 *
 *   Custo total      = Total das OS
 *   Total das OS     = Peças + Mão de obra/serviços + Ajustes (descontos/acréscimos)
 *   Total das OS     = Pago + Em aberto + Coberto
 *   Vencido          ⊆ Em aberto
 *
 * Considera-se OS todo orçamento já aprovado (não pendente e não cancelado),
 * na data de abertura do orçamento (createdAt).
 */
import { isPendingQuoteStatus } from '../utils/quoteReceivables.helper';

export interface FinQuoteItem { tipo?: string | null; valorTotal: number }
export interface FinQuote {
  id: string;
  status: string;
  total: number;
  valorEntrada?: number | null;
  createdAt: Date;
  veiculoId?: string | null;
  veiculoPlaca?: string | null;
  items: FinQuoteItem[];
}
/** Parte de um título (conta a receber) atribuída a uma OS. */
export interface FinAllocation { quoteId: string; valor: number; status: string; vencimento: Date }
export interface FinVehicle { id: string; placa: string; marca: string; modelo: string }

export interface FinPeriod { inicio: Date; fim: Date }

const round = (v: number) => Math.round(v * 100) / 100;

export const isReceivedStatus = (status?: string | null) =>
  ['RECEBIDA', 'LIQUIDADO', 'PAGO', 'PAGA'].includes((status || '').toUpperCase());
export const isCancelledStatus = (status?: string | null) =>
  ['CANCELADA', 'CANCELADO'].includes((status || '').toUpperCase());

/** Orçamento que já virou Ordem de Serviço (aprovado, em execução, faturado ou pago). */
export const isServiceOrderStatus = (status: string) => !isPendingQuoteStatus(status) && status !== 'Cancelado';

/**
 * Filtro de status da OS nos indicadores do Dashboard do portal.
 * Padrão: só OS pagas. "todas" = toda OS a partir da aprovação (regra antiga).
 */
export const OS_STATUS_TODAS = 'todas';
export const DEFAULT_DASHBOARD_OS_STATUS = 'Pago';
export const DASHBOARD_OS_STATUSES = ['Pago', 'Aprovado', 'Aguardando Pagamento', 'Parcialmente Pago', 'Emitir Nota Fiscal'];

export function parseOsStatusFilter(value: unknown): string {
  const v = typeof value === 'string' ? value.trim() : '';
  if (v === OS_STATUS_TODAS || DASHBOARD_OS_STATUSES.includes(v)) return v;
  return DEFAULT_DASHBOARD_OS_STATUS;
}

/** Sem filtro: toda OS (regra usada fora do Dashboard). Com filtro: só o status escolhido. */
export function osStatusMatcher(filter?: string) {
  if (!filter || filter === OS_STATUS_TODAS) return (status: string) => isServiceOrderStatus(status);
  return (status: string) => isServiceOrderStatus(status) && status === filter;
}

/**
 * Categorias dos itens de um orçamento/OS, na ordem "Peças", "Mão de Obra".
 * Mesma classificação usada no DRE: Peça/Produto = Peças; demais = Mão de Obra.
 */
export function itemCategories(items: { tipo?: string | null }[]): string[] {
  const cats: string[] = [];
  if (items.some(i => isPartItem(i.tipo))) cats.push('Peças');
  if (items.some(i => !isPartItem(i.tipo))) cats.push('Mão de Obra');
  return cats;
}

/** Tipos de item tratados como Peças (comparação sem diferenciar maiúsculas). */
export const PART_ITEM_TYPES = ['peça', 'peca', 'produto'];

/**
 * Filtro Prisma equivalente ao isPartItem, para filtrar no banco:
 * mesma classificação usada em itemCategories e no DRE.
 */
export function partItemWhere() {
  return { OR: PART_ITEM_TYPES.map(t => ({ tipo: { equals: t, mode: 'insensitive' as const } })) };
}

export function isPartItem(tipo?: string | null) {
  const t = (tipo || '').toLowerCase();
  return t === 'peça' || t === 'peca' || t === 'produto';
}

/** Situação de pagamento de uma OS: pago + aberto + coberto = total. */
export function paymentStatus(q: FinQuote, allocations: FinAllocation[], now = new Date()) {
  const total = q.total || 0;
  if (q.status === 'Pago') return { pago: total, aberto: 0, vencido: 0, coberto: 0 };
  if (q.status === 'Cobertura') return { pago: 0, aberto: 0, vencido: 0, coberto: total };

  const ativos = allocations.filter(a => !isCancelledStatus(a.status));
  let pago = ativos.filter(a => isReceivedStatus(a.status)).reduce((s, a) => s + a.valor, 0);
  // Sem títulos lançados: considera a entrada informada no orçamento (ex.: Parcialmente Pago)
  if (ativos.length === 0 && q.valorEntrada && q.valorEntrada > 0) pago = q.valorEntrada;
  pago = Math.min(Math.max(pago, 0), total);
  const aberto = total - pago;
  const vencidoTitulos = ativos
    .filter(a => !isReceivedStatus(a.status) && new Date(a.vencimento) < now)
    .reduce((s, a) => s + a.valor, 0);
  return { pago, aberto, vencido: Math.min(vencidoTitulos, aberto), coberto: 0 };
}

export interface FinSummary {
  quantidadeOs: number;
  totalOs: number;
  pecas: number;
  servicos: number;
  ajustes: number;
  total: number;
  pago: number;
  emAberto: number;
  vencido: number;
  coberto: number;
}

const emptySummary = (): FinSummary => ({
  quantidadeOs: 0, totalOs: 0, pecas: 0, servicos: 0, ajustes: 0,
  total: 0, pago: 0, emAberto: 0, vencido: 0, coberto: 0,
});

function addQuote(s: FinSummary, q: FinQuote, pay: ReturnType<typeof paymentStatus>) {
  const pecas = q.items.filter(i => isPartItem(i.tipo)).reduce((a, i) => a + (i.valorTotal || 0), 0);
  const servicos = q.items.filter(i => !isPartItem(i.tipo)).reduce((a, i) => a + (i.valorTotal || 0), 0);
  s.quantidadeOs += 1;
  s.totalOs += q.total || 0;
  s.pecas += pecas;
  s.servicos += servicos;
  s.ajustes += (q.total || 0) - pecas - servicos;
  s.pago += pay.pago;
  s.emAberto += pay.aberto;
  s.vencido += pay.vencido;
  s.coberto += pay.coberto;
}

const MONEY_FIELDS: (keyof FinSummary)[] = ['totalOs', 'pecas', 'servicos', 'ajustes', 'total', 'pago', 'emAberto', 'vencido', 'coberto'];

function finalize(s: FinSummary): FinSummary {
  s.total = s.totalOs;
  MONEY_FIELDS.forEach(k => { s[k] = round(s[k]); });
  return s;
}

export function computeFleetFinancials(params: {
  quotes: FinQuote[];
  allocations: FinAllocation[];
  vehicles: FinVehicle[];
  period?: FinPeriod;
  now?: Date;
  /** Status da OS (Dashboard). Sem valor: toda OS a partir da aprovação. */
  statusOs?: string;
}) {
  const { quotes, allocations, vehicles, period, now = new Date() } = params;
  const matches = osStatusMatcher(params.statusOs);
  const inPeriod = (d: Date) => !period || (d >= period.inicio && d < period.fim);

  const allocByQuote = new Map<string, FinAllocation[]>();
  allocations.forEach(a => {
    if (!allocByQuote.has(a.quoteId)) allocByQuote.set(a.quoteId, []);
    allocByQuote.get(a.quoteId)!.push(a);
  });

  const resumo = emptySummary();
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, ...emptySummary() }));
  const vehicleMap = new Map(vehicles.map(v => [v.id, v]));
  const porVeiculo = new Map<string, FinSummary & { veiculoId: string | null; placa: string; modelo: string }>();
  const vehicleRow = (veiculoId: string | null | undefined, placa: string | null | undefined) => {
    const key = veiculoId || `placa:${placa || 'sem-placa'}`;
    if (!porVeiculo.has(key)) {
      const v = veiculoId ? vehicleMap.get(veiculoId) : undefined;
      porVeiculo.set(key, { veiculoId: veiculoId || null, placa: v?.placa || placa || 'Sem placa', modelo: v ? `${v.marca} ${v.modelo}` : '', ...emptySummary() });
    }
    return porVeiculo.get(key)!;
  };

  quotes
    .filter(q => matches(q.status) && inPeriod(new Date(q.createdAt)))
    .forEach(q => {
      const pay = paymentStatus(q, allocByQuote.get(q.id) || [], now);
      addQuote(resumo, q, pay);
      addQuote(meses[new Date(q.createdAt).getMonth()], q, pay);
      addQuote(vehicleRow(q.veiculoId, q.veiculoPlaca), q, pay);
    });

  finalize(resumo);
  meses.forEach(finalize);
  porVeiculo.forEach(finalize);

  return {
    resumo,
    meses,
    porVeiculo: Array.from(porVeiculo.values()).sort((a, b) => b.total - a.total),
  };
}

// --------------------------------------------------------------------------
// Gastos por veículo e por mês (Dashboard do portal)
// --------------------------------------------------------------------------

/** Período do gráfico: atalho (6m, 12m, ano atual) ou intervalo de meses (de/até, formato AAAA-MM). */
export type SpendPeriod = '6m' | '12m' | 'ano' | { de: string; ate: string };

export const MAX_SPEND_MONTHS = 24;

/**
 * Valida um intervalo de meses "AAAA-MM" (de <= até, no máximo 24 meses).
 * Retorna o intervalo normalizado ou uma mensagem de erro.
 */
export function parseMonthRange(de?: string, ate?: string): { de: string; ate: string } | { error: string } {
  const re = /^(\d{4})-(0[1-9]|1[0-2])$/;
  if (!de || !ate || !re.test(de) || !re.test(ate)) return { error: 'Informe o mês inicial e o mês final no formato AAAA-MM.' };
  const toIndex = (v: string) => Number(v.slice(0, 4)) * 12 + Number(v.slice(5, 7)) - 1;
  const diff = toIndex(ate) - toIndex(de);
  if (diff < 0) return { error: 'O mês inicial deve ser anterior ou igual ao mês final.' };
  if (diff + 1 > MAX_SPEND_MONTHS) return { error: `Selecione no máximo ${MAX_SPEND_MONTHS} meses.` };
  return { de, ate };
}

/** Meses do período, em ordem cronológica (nos atalhos, inclui o mês atual). */
export function spendMonths(period: SpendPeriod, now = new Date()) {
  let end = new Date(now.getFullYear(), now.getMonth(), 1);
  let count: number;
  if (typeof period === 'object') {
    end = new Date(Number(period.ate.slice(0, 4)), Number(period.ate.slice(5, 7)) - 1, 1);
    const start = new Date(Number(period.de.slice(0, 4)), Number(period.de.slice(5, 7)) - 1, 1);
    count = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
  } else {
    count = period === '6m' ? 6 : period === '12m' ? 12 : now.getMonth() + 1;
  }
  const months: { chave: string; ano: number; mes: number; inicio: Date; fim: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const inicio = new Date(end.getFullYear(), end.getMonth() - i, 1);
    const fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1);
    months.push({
      chave: `${inicio.getFullYear()}-${String(inicio.getMonth() + 1).padStart(2, '0')}`,
      ano: inicio.getFullYear(), mes: inicio.getMonth() + 1, inicio, fim,
    });
  }
  return months;
}

/**
 * Gasto mensal de cada veículo: total das OS (mesma regra de "Custo total" do
 * DRE: orçamento aprovado, não pendente e não cancelado), pela data de abertura.
 * Cada orçamento entra uma única vez, no veículo e mês dele.
 *
 * Divisão por tipo de serviço (mesma classificação do DRE): itens de peça =
 * "Peças/Serviços"; demais itens = "Mão de Obra". O total da OS é repartido na
 * proporção dos itens (descontos/ajustes entram proporcionalmente), de modo
 * que pecas + maoDeObra = total em cada mês e no total do veículo.
 */
export function computeVehicleMonthlySpend(params: {
  quotes: (Pick<FinQuote, 'id' | 'status' | 'total' | 'createdAt' | 'veiculoId' | 'veiculoPlaca'> & { items?: FinQuoteItem[] })[];
  vehicles: FinVehicle[];
  period: SpendPeriod;
  now?: Date;
  /** Status da OS (Dashboard). Sem valor: toda OS a partir da aprovação. */
  statusOs?: string;
}) {
  const months = spendMonths(params.period, params.now);
  const matches = osStatusMatcher(params.statusOs);
  const inicio = months[0].inicio;
  const fim = months[months.length - 1].fim;
  const vehicleMap = new Map(params.vehicles.map(v => [v.id, v]));
  const rows = new Map<string, { veiculoId: string | null; placa: string; modelo: string; valores: number[]; pecasRaw: number[]; total: number }>();
  const seen = new Set<string>();

  for (const q of params.quotes) {
    if (seen.has(q.id)) continue; // nunca soma o mesmo orçamento duas vezes
    seen.add(q.id);
    const d = new Date(q.createdAt);
    if (!matches(q.status) || d < inicio || d >= fim) continue;
    const idx = months.findIndex(m => d >= m.inicio && d < m.fim);
    if (idx < 0) continue;
    const key = q.veiculoId || `placa:${q.veiculoPlaca || 'sem-placa'}`;
    if (!rows.has(key)) {
      const v = q.veiculoId ? vehicleMap.get(q.veiculoId) : undefined;
      rows.set(key, {
        veiculoId: q.veiculoId || null,
        placa: v?.placa || q.veiculoPlaca || 'Sem placa',
        modelo: v ? `${v.marca} ${v.modelo}` : '',
        valores: months.map(() => 0),
        pecasRaw: months.map(() => 0),
        total: 0,
      });
    }
    const row = rows.get(key)!;
    const total = q.total || 0;
    const items = q.items || [];
    const pecasItens = items.filter(i => isPartItem(i.tipo)).reduce((a, i) => a + (i.valorTotal || 0), 0);
    const somaItens = items.reduce((a, i) => a + (i.valorTotal || 0), 0);
    // Parte de peças no total da OS (sem itens: tudo em Mão de Obra)
    const pecas = somaItens > 0 ? total * (pecasItens / somaItens) : 0;
    row.valores[idx] += total;
    row.pecasRaw[idx] += pecas;
    row.total += total;
  }

  const veiculos = Array.from(rows.values())
    .map(({ pecasRaw, ...r }) => {
      const valores = r.valores.map(round);
      const pecas = pecasRaw.map(round);
      const maoDeObra = valores.map((v, i) => round(v - pecas[i]));
      const total = round(r.total);
      const totalPecas = round(pecas.reduce((a, b) => a + b, 0));
      return { ...r, valores, pecas, maoDeObra, total, totalPecas, totalMaoDeObra: round(total - totalPecas) };
    })
    .sort((a, b) => b.total - a.total || a.placa.localeCompare(b.placa));

  return {
    meses: months.map(m => ({ chave: m.chave, ano: m.ano, mes: m.mes })),
    veiculos,
    total: round(veiculos.reduce((s, v) => s + v.total, 0)),
  };
}
