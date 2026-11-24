/**
 * Veículos sem manutenção: regra única usada no dashboard de Gestão de Frotas.
 *
 * Manutenção = Ordem de Serviço (orçamento aprovado/em execução/faturado/pago) do veículo,
 * ou evento de revisão, manutenção ou troca de óleo (motor/câmbio) registrado no veículo.
 * Veículo "sem manutenção" = ativo e sem nenhuma manutenção nos últimos `dias` dias
 * (inclui os que nunca tiveram manutenção). Veículos inativos ou vendidos não entram;
 * veículos com status "Em manutenção" contam como atendidos.
 */

export const MAINTENANCE_EVENT_TYPES = ['TROCA_OLEO_MOTOR', 'TROCA_OLEO_CAMBIO', 'REVISAO', 'MANUTENCAO'];
export const PERIOD_OPTIONS = [30, 60, 90, 180, 365];
export const INACTIVE_VEHICLE_STATUS = ['INATIVO', 'VENDIDO'];

export interface MaintVehicle {
  id: string;
  placa: string;
  marca: string;
  modelo: string;
  kmAtual: number;
  status: string;
  createdAt: Date;
  clienteId: string;
  clienteNome: string;
}

export interface MaintenanceSummaryRow {
  veiculoId: string;
  placa: string;
  marca: string;
  modelo: string;
  kmAtual: number;
  clienteId: string;
  cliente: string;
  ultimaManutencao: string | null;
  diasSemManutencao: number | null; // null = nunca teve manutenção
}

export const FAIXAS = [
  { key: 'ate30', label: 'Até 30 dias', min: 0, max: 30 },
  { key: 'de31a90', label: '31 a 90 dias', min: 31, max: 90 },
  { key: 'de91a180', label: '91 a 180 dias', min: 91, max: 180 },
  { key: 'de181a365', label: '181 a 365 dias', min: 181, max: 365 },
  { key: 'mais365', label: 'Mais de 1 ano', min: 366, max: Infinity },
  { key: 'nunca', label: 'Nunca teve manutenção', min: null, max: null },
] as const;

const DAY = 24 * 60 * 60 * 1000;

export const parsePeriodDays = (v: unknown) => {
  const n = Number(v);
  return PERIOD_OPTIONS.includes(n) ? n : 90;
};

export function summarizeMaintenance(
  vehicles: MaintVehicle[],
  lastMaintenance: Map<string, Date>,
  dias: number,
  now: Date = new Date(),
) {
  const ativos = vehicles.filter(v => !INACTIVE_VEHICLE_STATUS.includes((v.status || '').toUpperCase()));
  const faixas = FAIXAS.map(f => ({ key: f.key, label: f.label, total: 0 }));
  const semManutencao: MaintenanceSummaryRow[] = [];
  const porCliente = new Map<string, { clienteId: string; cliente: string; total: number; semManutencao: number }>();

  for (const v of ativos) {
    const last = lastMaintenance.get(v.id) || null;
    const diasSem = last ? Math.max(0, Math.floor((now.getTime() - last.getTime()) / DAY)) : null;

    const faixa = diasSem === null
      ? faixas[faixas.length - 1]
      : faixas[FAIXAS.findIndex(f => f.min !== null && diasSem >= f.min && diasSem <= f.max)];
    faixa.total += 1;

    const cli = porCliente.get(v.clienteId) || { clienteId: v.clienteId, cliente: v.clienteNome, total: 0, semManutencao: 0 };
    cli.total += 1;

    const emManutencao = (v.status || '').toUpperCase() === 'EM_MANUTENCAO';
    const atrasado = !emManutencao && (diasSem === null || diasSem > dias);
    if (atrasado) {
      cli.semManutencao += 1;
      semManutencao.push({
        veiculoId: v.id, placa: v.placa, marca: v.marca, modelo: v.modelo, kmAtual: v.kmAtual,
        clienteId: v.clienteId, cliente: v.clienteNome,
        ultimaManutencao: last ? last.toISOString() : null,
        diasSemManutencao: diasSem,
      });
    }
    porCliente.set(v.clienteId, cli);
  }

  // Mais críticos primeiro: nunca tiveram manutenção, depois os há mais tempo sem
  semManutencao.sort((a, b) => {
    const da = a.diasSemManutencao ?? Number.MAX_SAFE_INTEGER;
    const db = b.diasSemManutencao ?? Number.MAX_SAFE_INTEGER;
    return db - da || a.placa.localeCompare(b.placa);
  });

  const totalAtivos = ativos.length;
  const nunca = semManutencao.filter(r => r.diasSemManutencao === null).length;
  return {
    dias,
    periodos: PERIOD_OPTIONS,
    totalAtivos,
    semManutencao: semManutencao.length,
    emDia: totalAtivos - semManutencao.length,
    nuncaManutencao: nunca,
    percentualSemManutencao: totalAtivos ? Math.round((semManutencao.length / totalAtivos) * 1000) / 10 : 0,
    faixas,
    porCliente: [...porCliente.values()]
      .filter(c => c.semManutencao > 0)
      .sort((a, b) => b.semManutencao - a.semManutencao || a.cliente.localeCompare(b.cliente)),
    veiculos: semManutencao,
  };
}
