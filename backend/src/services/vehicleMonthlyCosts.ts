/**
 * Evolução de custos mensais por veículo (Dashboard de Gestão de Frotas).
 *
 * Mesma regra de custo do card "Evolução de Custos Mensais": orçamentos/OS com status
 * "Pago" vinculados ao veículo (mês da última atualização) + eventos do veículo com valor
 * (mês da data do evento).
 */

export const COST_PERIOD_OPTIONS = [3, 6, 12];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const parseCostMonths = (v: unknown) => {
  const n = Number(v);
  return COST_PERIOD_OPTIONS.includes(n) ? n : 6;
};

export interface CostVehicle { id: string; placa: string; marca: string; modelo: string; clienteId: string; cliente: string }
export interface CostEntry { veiculoId: string; data: Date; valor: number }

/** Primeiro dia do mês mais antigo da janela de `meses` meses (inclui o mês atual). */
export function costWindowStart(meses: number, now: Date = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() - (meses - 1), 1);
}

export function monthlyCostsByVehicle(vehicles: CostVehicle[], entries: CostEntry[], meses: number, now: Date = new Date()) {
  const start = costWindowStart(meses, now);
  const months = Array.from({ length: meses }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTH_NAMES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}` };
  });
  const index = new Map(months.map((m, i) => [m.key, i]));
  const round = (v: number) => Math.round(v * 100) / 100;

  const byVehicle = new Map(vehicles.map(v => [v.id, { ...v, porMes: months.map(() => 0) }]));
  for (const e of entries) {
    const row = byVehicle.get(e.veiculoId);
    if (!row || !e.valor) continue;
    const key = `${e.data.getFullYear()}-${String(e.data.getMonth() + 1).padStart(2, '0')}`;
    const i = index.get(key);
    if (i === undefined) continue;
    row.porMes[i] += e.valor;
  }

  const veiculos = [...byVehicle.values()]
    .map(v => ({
      veiculoId: v.id, placa: v.placa, marca: v.marca, modelo: v.modelo, clienteId: v.clienteId, cliente: v.cliente,
      porMes: v.porMes.map(round),
      total: round(v.porMes.reduce((s, x) => s + x, 0)),
    }))
    .filter(v => v.total > 0)
    .sort((a, b) => b.total - a.total || a.placa.localeCompare(b.placa));

  const totalPorMes = months.map((_, i) => round(veiculos.reduce((s, v) => s + v.porMes[i], 0)));
  return {
    meses,
    periodos: COST_PERIOD_OPTIONS,
    months,
    totalPorMes,
    total: round(totalPorMes.reduce((s, x) => s + x, 0)),
    veiculos,
  };
}
