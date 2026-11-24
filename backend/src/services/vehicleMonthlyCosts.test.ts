/**
 * Evolução de custos mensais por veículo (sem banco).
 *   npx ts-node --transpile-only src/services/vehicleMonthlyCosts.test.ts
 */
import assert from 'assert';
import { costWindowStart, monthlyCostsByVehicle, parseCostMonths } from './vehicleMonthlyCosts';

const now = new Date(2026, 10, 23); // 23/11/2026
const veh = (id: string, clienteId = 'c1') => ({ id, placa: id.toUpperCase(), marca: 'VW', modelo: 'Delivery', clienteId, cliente: clienteId });
const results: [string, boolean, string?][] = [];
const test = (n: string, fn: () => void) => { try { fn(); results.push([n, true]); } catch (e: any) { results.push([n, false, e.message]); } };

test('janela de meses inclui o mês atual e começa no dia 1', () => {
  assert.deepStrictEqual(costWindowStart(6, now), new Date(2026, 5, 1));
  const r = monthlyCostsByVehicle([], [], 6, now);
  assert.deepStrictEqual(r.months.map(m => m.label), ['Jun/26', 'Jul/26', 'Ago/26', 'Set/26', 'Out/26', 'Nov/26']);
});

test('soma por veículo e por mês; ignora fora da janela e veículos não selecionados', () => {
  const r = monthlyCostsByVehicle([veh('a'), veh('b'), veh('z')], [
    { veiculoId: 'a', data: new Date(2026, 10, 2), valor: 100 },
    { veiculoId: 'a', data: new Date(2026, 10, 20), valor: 50.555 },
    { veiculoId: 'a', data: new Date(2026, 5, 1), valor: 10 },
    { veiculoId: 'b', data: new Date(2026, 7, 15), valor: 300 },
    { veiculoId: 'b', data: new Date(2026, 4, 31), valor: 999 }, // antes da janela
    { veiculoId: 'x', data: new Date(2026, 10, 1), valor: 777 }, // veículo não selecionado
  ], 6, now);
  assert.deepStrictEqual(r.veiculos.map(v => [v.veiculoId, v.total]), [['b', 300], ['a', 160.56]]);
  assert.deepStrictEqual(r.veiculos.find(v => v.veiculoId === 'a')!.porMes, [10, 0, 0, 0, 0, 150.56]);
  assert.deepStrictEqual(r.totalPorMes, [10, 0, 300, 0, 0, 150.56]);
  assert.strictEqual(r.total, 460.56);
  assert.ok(!r.veiculos.some(v => v.veiculoId === 'z'), 'veículo sem custo não aparece');
});

test('período padrão', () => {
  assert.strictEqual(parseCostMonths('12'), 12);
  assert.strictEqual(parseCostMonths('7'), 6);
});

for (const [n, ok, err] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${err ? `\n      ${err}` : ''}`);
const failed = results.filter(r => !r[1]).length;
console.log(`${results.length - failed} testes passaram`);
process.exit(failed ? 1 : 0);
