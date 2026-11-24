/**
 * Regra de "veículos sem manutenção" (sem banco).
 *   npx ts-node --transpile-only src/services/vehicleMaintenanceStatus.test.ts
 */
import assert from 'assert';
import { parsePeriodDays, summarizeMaintenance, type MaintVehicle } from './vehicleMaintenanceStatus';

const now = new Date('2026-11-23T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);
const v = (id: string, status = 'ATIVO', clienteId = 'c1'): MaintVehicle => ({
  id, placa: id.toUpperCase(), marca: 'VW', modelo: 'Delivery', kmAtual: 1000, status,
  createdAt: daysAgo(800), clienteId, clienteNome: clienteId === 'c1' ? 'Cliente 1' : 'Cliente 2',
});

const results: [string, boolean, string?][] = [];
const test = (n: string, fn: () => void) => { try { fn(); results.push([n, true]); } catch (e: any) { results.push([n, false, e.message]); } };

const vehicles = [v('a'), v('b'), v('c'), v('d', 'EM_MANUTENCAO'), v('e', 'INATIVO'), v('f', 'VENDIDO'), v('g', 'ATIVO', 'c2'), v('h')];
const last = new Map<string, Date>([
  ['a', daysAgo(10)],   // em dia
  ['b', daysAgo(120)],  // sem manutenção (> 90)
  ['c', daysAgo(90)],   // exatamente 90: em dia
  ['d', daysAgo(400)],  // em manutenção agora: em dia
  ['e', daysAgo(500)],  // inativo: ignorado
  ['h', daysAgo(400)],  // +1 ano
  // g: nunca teve manutenção
]);

test('conta só veículos ativos (ignora inativos e vendidos)', () => {
  const s = summarizeMaintenance(vehicles, last, 90, now);
  assert.strictEqual(s.totalAtivos, 6);
});

test('sem manutenção = mais de N dias ou nunca; "em manutenção" conta como atendido', () => {
  const s = summarizeMaintenance(vehicles, last, 90, now);
  assert.deepStrictEqual(s.veiculos.map(r => r.veiculoId), ['g', 'h', 'b']);
  assert.strictEqual(s.semManutencao, 3);
  assert.strictEqual(s.emDia, 3);
  assert.strictEqual(s.nuncaManutencao, 1);
  assert.strictEqual(s.percentualSemManutencao, 50);
  assert.strictEqual(s.veiculos[0].diasSemManutencao, null);
  assert.strictEqual(s.veiculos[1].diasSemManutencao, 400);
});

test('período muda o resultado (30 e 365 dias)', () => {
  assert.strictEqual(summarizeMaintenance(vehicles, last, 30, now).semManutencao, 4); // b, c, h, g
  assert.strictEqual(summarizeMaintenance(vehicles, last, 365, now).semManutencao, 2); // h, g
});

test('faixas de tempo somam todos os ativos', () => {
  const s = summarizeMaintenance(vehicles, last, 90, now);
  const f = Object.fromEntries(s.faixas.map(x => [x.key, x.total]));
  assert.deepStrictEqual(f, { ate30: 1, de31a90: 1, de91a180: 1, de181a365: 0, mais365: 2, nunca: 1 });
  assert.strictEqual(s.faixas.reduce((t, x) => t + x.total, 0), s.totalAtivos);
});

test('ranking por cliente e período padrão', () => {
  const s = summarizeMaintenance(vehicles, last, 90, now);
  assert.deepStrictEqual(s.porCliente.map(c => [c.cliente, c.semManutencao, c.total]), [['Cliente 1', 2, 5], ['Cliente 2', 1, 1]]);
  assert.strictEqual(parsePeriodDays('abc'), 90);
  assert.strictEqual(parsePeriodDays('180'), 180);
  assert.strictEqual(parsePeriodDays('45'), 90);
});

test('frota vazia', () => {
  const s = summarizeMaintenance([], new Map(), 90, now);
  assert.strictEqual(s.totalAtivos, 0);
  assert.strictEqual(s.percentualSemManutencao, 0);
});

for (const [n, ok, err] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${err ? `\n      ${err}` : ''}`);
const failed = results.filter(r => !r[1]).length;
console.log(`${results.length - failed} testes passaram`);
process.exit(failed ? 1 : 0);
