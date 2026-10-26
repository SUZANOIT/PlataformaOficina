export interface FleetStatusCounts {
  total: number;
  active: number;
  inactive: number;
  maintenance: number;
}

export type FleetVehicleSortKey = 'placa' | 'modelo' | 'ano' | 'status' | 'servico';

export interface FleetSortableVehicle {
  placa?: string | null;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  anoFabricacao?: number | null;
  status?: string | null;
  dataUltimoServico?: string | Date | null;
}

const EMPTY = 'Não informado';

export function fleetDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return EMPTY;
  if (typeof value === 'string' && value.trim() === '') return EMPTY;
  return String(value);
}

export function fleetYearLabel(fabricacao: unknown, modelo: unknown): string {
  const fabEmpty = fleetDisplayValue(fabricacao) === EMPTY || fabricacao === 0;
  const modEmpty = fleetDisplayValue(modelo) === EMPTY || modelo === 0;
  if (fabEmpty && modEmpty) return EMPTY;
  return `${fabEmpty ? EMPTY : fabricacao} / ${modEmpty ? EMPTY : modelo}`;
}

export function fleetStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'ATIVO':
      return 'Ativo';
    case 'EM_MANUTENCAO':
      return 'Em manutenção';
    case 'INATIVO':
      return 'Inativo';
    case 'VENDIDO':
      return 'Vendido';
    case 'all':
      return 'Todos os status';
    default:
      return status ? status.replaceAll('_', ' ') : EMPTY;
  }
}

export function fleetKpiStatus(kpi: 'total' | 'active' | 'inactive' | 'maintenance'): string {
  switch (kpi) {
    case 'total':
      return 'all';
    case 'active':
      return 'ATIVO';
    case 'inactive':
      return 'INATIVO';
    case 'maintenance':
      return 'EM_MANUTENCAO';
  }
}

export function countVehiclesByStatus(vehicles: { status?: string | null }[]): FleetStatusCounts {
  const counts: FleetStatusCounts = { total: vehicles.length, active: 0, inactive: 0, maintenance: 0 };
  for (const vehicle of vehicles) {
    if (vehicle.status === 'ATIVO') counts.active += 1;
    else if (vehicle.status === 'INATIVO') counts.inactive += 1;
    else if (vehicle.status === 'EM_MANUTENCAO') counts.maintenance += 1;
  }
  return counts;
}

export function classifyFleetSearch(value: string): { search: string; placa: string } {
  const trimmed = value.trim();
  if (!trimmed) return { search: '', placa: '' };

  const compact = trimmed.toUpperCase().replace(/[\s-]/g, '');
  const fullPlate = /^[A-Z]{3}[0-9]{4}$/.test(compact) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(compact);
  const partialPlate = !fullPlate
    && !/\s/.test(trimmed)
    && compact.length >= 3
    && compact.length < 7
    && /[A-Z]/.test(compact)
    && /[0-9]/.test(compact)
    && /^[A-Z]{1,3}[0-9][A-Z0-9]*$/.test(compact);

  if (fullPlate || partialPlate) return { search: '', placa: compact };
  return { search: trimmed, placa: '' };
}

export function formatFleetDate(value: unknown): string {
  if (value === null || value === undefined || value === '') return EMPTY;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return EMPTY;
  return date.toLocaleDateString('pt-BR');
}

function fleetSortValue(vehicle: FleetSortableVehicle, key: FleetVehicleSortKey): string | number {
  switch (key) {
    case 'placa':
      return (vehicle.placa || '').toUpperCase();
    case 'modelo':
      return `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim().toUpperCase();
    case 'ano':
      return Number(vehicle.ano || vehicle.anoFabricacao || 0);
    case 'status':
      return vehicle.status || '';
    case 'servico': {
      if (!vehicle.dataUltimoServico) return 0;
      const time = new Date(vehicle.dataUltimoServico).getTime();
      return Number.isNaN(time) ? 0 : time;
    }
  }
}

export function sortFleetVehicles<T extends FleetSortableVehicle>(
  vehicles: T[],
  key: FleetVehicleSortKey | null,
  direction: 'asc' | 'desc'
): T[] {
  if (!key) return vehicles;
  const factor = direction === 'asc' ? 1 : -1;
  return [...vehicles].sort((a, b) => {
    const av = fleetSortValue(a, key);
    const bv = fleetSortValue(b, key);
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    return 0;
  });
}
