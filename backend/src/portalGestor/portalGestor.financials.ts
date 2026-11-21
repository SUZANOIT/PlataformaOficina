/**
 * Regra ÚNICA dos indicadores financeiros do Portal do Gestor de Frota.
 *
 * Usada pelo Dashboard, por Finanças / DRE e pelo cockpit do veículo, para que
 * os mesmos números apareçam em todas as telas e sempre fechem entre si:
 *
 *   Custo total      = Total das OS + Outras manutenções
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
export interface FinMaintenance { veiculoId: string; placa: string; modelo: string; data: Date; valor: number }
export interface FinVehicle { id: string; placa: string; marca: string; modelo: string }

export interface FinPeriod { inicio: Date; fim: Date }

const round = (v: number) => Math.round(v * 100) / 100;

export const isReceivedStatus = (status?: string | null) =>
  ['RECEBIDA', 'LIQUIDADO', 'PAGO', 'PAGA'].includes((status || '').toUpperCase());
export const isCancelledStatus = (status?: string | null) =>
  ['CANCELADA', 'CANCELADO'].includes((status || '').toUpperCase());

/** Orçamento que já virou Ordem de Serviço (aprovado, em execução, faturado ou pago). */
export const isServiceOrderStatus = (status: string) => !isPendingQuoteStatus(status) && status !== 'Cancelado';

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
  manutencaoExterna: number;
  total: number;
  pago: number;
  emAberto: number;
  vencido: number;
  coberto: number;
}

const emptySummary = (): FinSummary => ({
  quantidadeOs: 0, totalOs: 0, pecas: 0, servicos: 0, ajustes: 0, manutencaoExterna: 0,
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

const MONEY_FIELDS: (keyof FinSummary)[] = ['totalOs', 'pecas', 'servicos', 'ajustes', 'manutencaoExterna', 'total', 'pago', 'emAberto', 'vencido', 'coberto'];

function finalize(s: FinSummary): FinSummary {
  s.total = s.totalOs + s.manutencaoExterna;
  MONEY_FIELDS.forEach(k => { s[k] = round(s[k]); });
  return s;
}

export function computeFleetFinancials(params: {
  quotes: FinQuote[];
  allocations: FinAllocation[];
  maintenance: FinMaintenance[];
  vehicles: FinVehicle[];
  period?: FinPeriod;
  now?: Date;
}) {
  const { quotes, allocations, maintenance, vehicles, period, now = new Date() } = params;
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
    .filter(q => isServiceOrderStatus(q.status) && inPeriod(new Date(q.createdAt)))
    .forEach(q => {
      const pay = paymentStatus(q, allocByQuote.get(q.id) || [], now);
      addQuote(resumo, q, pay);
      addQuote(meses[new Date(q.createdAt).getMonth()], q, pay);
      addQuote(vehicleRow(q.veiculoId, q.veiculoPlaca), q, pay);
    });

  maintenance
    .filter(m => m.valor > 0 && inPeriod(new Date(m.data)))
    .forEach(m => {
      resumo.manutencaoExterna += m.valor;
      meses[new Date(m.data).getMonth()].manutencaoExterna += m.valor;
      vehicleRow(m.veiculoId, m.placa).manutencaoExterna += m.valor;
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
