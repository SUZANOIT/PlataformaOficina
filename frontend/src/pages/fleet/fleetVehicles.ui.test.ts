import { describe, expect, it } from 'vitest';
import {
  classifyFleetSearch,
  countVehiclesByStatus,
  fleetDisplayValue,
  fleetKpiStatus,
  fleetStatusLabel,
  fleetYearLabel,
  formatFleetDate,
  sortFleetVehicles,
} from './fleetVehicles.ui';

describe('indicadores e status da frota', () => {
  it('conta apenas os status reais e mantém vendidos só no total', () => {
    const counts = countVehiclesByStatus([
      { status: 'ATIVO' },
      { status: 'ATIVO' },
      { status: 'INATIVO' },
      { status: 'EM_MANUTENCAO' },
      { status: 'VENDIDO' },
      { status: null },
    ]);

    expect(counts).toEqual({ total: 6, active: 2, inactive: 1, maintenance: 1 });
  });

  it('liga cada indicador ao filtro de status já existente', () => {
    expect(fleetKpiStatus('total')).toBe('all');
    expect(fleetKpiStatus('active')).toBe('ATIVO');
    expect(fleetKpiStatus('inactive')).toBe('INATIVO');
    expect(fleetKpiStatus('maintenance')).toBe('EM_MANUTENCAO');
  });

  it('traduz o status com texto, inclusive o valor vazio', () => {
    expect(fleetStatusLabel('EM_MANUTENCAO')).toBe('Em manutenção');
    expect(fleetStatusLabel('ATIVO')).toBe('Ativo');
    expect(fleetStatusLabel(null)).toBe('Não informado');
  });
});

describe('busca e campos vazios', () => {
  it('envia placa completa ou parcial para o filtro de placa', () => {
    expect(classifyFleetSearch('abc-1d23')).toEqual({ search: '', placa: 'ABC1D23' });
    expect(classifyFleetSearch('ABC 1234')).toEqual({ search: '', placa: 'ABC1234' });
    expect(classifyFleetSearch('ab1')).toEqual({ search: '', placa: 'AB1' });
  });

  it('envia cliente, empresa e texto com espaço para a busca existente', () => {
    expect(classifyFleetSearch('  Suzano  ')).toEqual({ search: 'Suzano', placa: '' });
    expect(classifyFleetSearch('Empresa 2')).toEqual({ search: 'Empresa 2', placa: '' });
    expect(classifyFleetSearch('')).toEqual({ search: '', placa: '' });
  });

  it('não transforma vazio em zero e monta o ano só com o que existe', () => {
    expect(fleetDisplayValue('')).toBe('Não informado');
    expect(fleetDisplayValue(0)).toBe('0');
    expect(fleetYearLabel(null, null)).toBe('Não informado');
    expect(fleetYearLabel(2019, 2020)).toBe('2019 / 2020');
    expect(fleetYearLabel(2019, null)).toBe('2019 / Não informado');
  });

  it('formata data real e preserva valor ausente', () => {
    expect(formatFleetDate(null)).toBe('Não informado');
    expect(formatFleetDate('invalida')).toBe('Não informado');
    const iso = '2026-03-15T12:00:00.000Z';
    expect(formatFleetDate(iso)).toBe(new Date(iso).toLocaleDateString('pt-BR'));
  });
});

describe('ordenação local dos veículos carregados', () => {
  const vehicles = [
    { placa: 'BBB1A23', marca: 'Volvo', modelo: 'FH', ano: 2020, status: 'INATIVO', dataUltimoServico: '2026-01-02T12:00:00.000Z' },
    { placa: 'AAA1234', marca: 'Pierce', modelo: 'Telequart', ano: 2024, status: 'ATIVO', dataUltimoServico: null },
  ];

  it('ordena por placa sem alterar a lista original', () => {
    const sorted = sortFleetVehicles(vehicles, 'placa', 'asc');
    expect(sorted.map((item) => item.placa)).toEqual(['AAA1234', 'BBB1A23']);
    expect(vehicles.map((item) => item.placa)).toEqual(['BBB1A23', 'AAA1234']);
  });

  it('devolve a ordem recebida quando não há coluna escolhida', () => {
    expect(sortFleetVehicles(vehicles, null, 'asc')).toBe(vehicles);
  });
});
