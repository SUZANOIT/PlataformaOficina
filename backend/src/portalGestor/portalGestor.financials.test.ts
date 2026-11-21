import assert from 'assert';
import { computeFleetFinancials, itemCategories, computeVehicleMonthlySpend, spendMonths, parseMonthRange, FinQuote, FinAllocation } from './portalGestor.financials';

const d = (y: number, m: number, day = 10) => new Date(y, m - 1, day);
const now = d(2026, 11, 21);
const item = (tipo: string, valorTotal: number) => ({ tipo, valorTotal });
const q = (id: string, status: string, total: number, items: any[], createdAt: Date, extra: Partial<FinQuote> = {}): FinQuote =>
  ({ id, status, total, items, createdAt, veiculoId: 'v1', veiculoPlaca: 'ABC1D23', ...extra });

const quotes: FinQuote[] = [
  q('pago', 'Pago', 1000, [item('Peça', 600), item('Mão de Obra', 400)], d(2026, 3)),
  q('cobertura', 'Cobertura', 500, [item('Mão de Obra', 500)], d(2026, 4)),
  q('parcial', 'Parcialmente Pago', 3000, [item('Peça', 2000), item('Mão de Obra', 1000)], d(2026, 5), { veiculoId: 'v2', veiculoPlaca: 'DEF4G56' }),
  q('aguardando', 'Aguardando Pagamento', 2000, [item('Peça', 1500), item('Serviço', 500)], d(2026, 6), { valorEntrada: 800 }),
  q('aprovado-desconto', 'Aprovado', 900, [item('Peça', 600), item('Mão de Obra', 400)], d(2026, 7)), // desconto de 100
  q('emitir-nf', 'Emitir Nota Fiscal', 700, [item('Produto', 700)], d(2026, 8)),
  q('pendente', 'Aguardando Aprovação', 9999, [item('Peça', 9999)], d(2026, 8)),
  q('cancelado', 'Cancelado', 8888, [item('Peça', 8888)], d(2026, 8)),
  q('ano-anterior', 'Pago', 7777, [item('Peça', 7777)], d(2025, 12, 31)),
];
const allocations: FinAllocation[] = [
  { quoteId: 'parcial', valor: 1000, status: 'RECEBIDA', vencimento: d(2026, 5) },
  { quoteId: 'parcial', valor: 1000, status: 'PENDENTE', vencimento: d(2026, 6) }, // vencido
  { quoteId: 'parcial', valor: 1000, status: 'PENDENTE', vencimento: d(2026, 12) }, // a vencer
  { quoteId: 'aprovado-desconto', valor: 900, status: 'CANCELADA', vencimento: d(2026, 7) }, // ignorado
  { quoteId: 'emitir-nf', valor: 700, status: 'PENDENTE', vencimento: d(2026, 10) }, // vencido
];
const vehicles = [{ id: 'v1', placa: 'ABC1D23', marca: 'VW', modelo: 'Delivery' }, { id: 'v2', placa: 'DEF4G56', marca: 'MB', modelo: 'Accelo' }];

const r = computeFleetFinancials({ quotes, allocations, vehicles, period: { inicio: d(2026, 1, 1), fim: d(2027, 1, 1) }, now });
const s = r.resumo;
const results: [string, () => void][] = [
  ['Considera só OS do ano (sem pendentes, cancelados e outro ano)', () => { assert.strictEqual(s.quantidadeOs, 6); assert.strictEqual(s.totalOs, 8100); }],
  ['Total das OS = Peças + Mão de obra + Ajustes', () => { assert.strictEqual(s.pecas, 5400); assert.strictEqual(s.servicos, 2800); assert.strictEqual(s.ajustes, -100); assert.strictEqual(s.pecas + s.servicos + s.ajustes, s.totalOs); }],
  ['Custo total = total das OS (sem outras manutenções)', () => { assert.strictEqual(s.total, 8100); assert.strictEqual((s as any).manutencaoExterna, undefined); }],
  ['Pago + Em aberto + Coberto = Total das OS', () => { assert.strictEqual(Math.round((s.pago + s.emAberto + s.coberto) * 100) / 100, s.totalOs); }],
  ['Pago: OS paga + títulos recebidos + entrada sem título', () => { assert.strictEqual(s.pago, 1000 + 1000 + 800); }],
  ['Coberto separado do valor devido', () => { assert.strictEqual(s.coberto, 500); }],
  ['Em aberto inclui OS sem título lançado', () => { assert.strictEqual(s.emAberto, 2000 + 1200 + 900 + 700); }],
  ['Vencido só com títulos vencidos e nunca maior que o em aberto', () => { assert.strictEqual(s.vencido, 1000 + 700); assert.ok(s.vencido <= s.emAberto); }],
  ['Soma dos meses = resumo', () => { assert.strictEqual(r.meses.reduce((a, m) => a + m.total, 0), s.total); assert.strictEqual(r.meses.reduce((a, m) => a + m.emAberto, 0), s.emAberto); }],
  ['Soma por veículo = resumo', () => { assert.strictEqual(r.porVeiculo.reduce((a, v) => a + v.total, 0), s.total); assert.strictEqual(r.porVeiculo.find(v => v.veiculoId === 'v2')!.totalOs, 3000); }],
  ['Sem período considera todos os anos', () => {
    const all = computeFleetFinancials({ quotes, allocations, vehicles, now });
    assert.strictEqual(all.resumo.totalOs, 8100 + 7777);
  }],
];
results.push(['Serviços da OS: Peças, Mão de Obra ou ambos, conforme os itens', () => {
  assert.deepStrictEqual(itemCategories([{ tipo: 'Peça' }, { tipo: 'Peça' }]), ['Peças']);
  assert.deepStrictEqual(itemCategories([{ tipo: 'Mão de Obra' }]), ['Mão de Obra']);
  assert.deepStrictEqual(itemCategories([{ tipo: 'Mão de Obra' }, { tipo: 'Peça' }]), ['Peças', 'Mão de Obra']);
  assert.deepStrictEqual(itemCategories([{ tipo: 'Produto' }, { tipo: 'Serviço' }]), ['Peças', 'Mão de Obra']);
  assert.deepStrictEqual(itemCategories([]), []);
}]);
results.push(['Gastos por veículo: meses em ordem cronológica por período', () => {
  const m6 = spendMonths('6m', now).map(m => m.chave);
  assert.deepStrictEqual(m6, ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
  const m12 = spendMonths('12m', now).map(m => m.chave);
  assert.strictEqual(m12.length, 12);
  assert.strictEqual(m12[0], '2025-12');
  assert.strictEqual(m12[11], '2026-11');
  assert.deepStrictEqual(spendMonths('ano', now).map(m => m.chave)[0], '2026-01');
  assert.strictEqual(spendMonths('ano', now).length, 11);
  assert.strictEqual(spendMonths('6m', d(2026, 2, 3)).map(m => m.chave)[0], '2025-09');
}]);
results.push(['Gastos por veículo: só OS (sem pendentes/cancelados), cada orçamento uma vez, por veículo e mês', () => {
  const dup = [...quotes, quotes[0]];
  const r = computeVehicleMonthlySpend({ quotes: dup, vehicles, period: 'ano', now });
  const v1 = r.veiculos.find(v => v.veiculoId === 'v1')!;
  const v2 = r.veiculos.find(v => v.veiculoId === 'v2')!;
  assert.strictEqual(v1.placa, 'ABC1D23');
  assert.strictEqual(v1.modelo, 'VW Delivery');
  // v1: pago (mar) 1000, cobertura (abr) 500, aguardando pag. (jun) 2000, aprovado (jul) 900, emitir NF (ago) 700
  assert.deepStrictEqual(v1.valores.slice(0, 8), [0, 0, 1000, 500, 0, 2000, 900, 700]);
  assert.strictEqual(v1.total, 5100);
  assert.deepStrictEqual(v2.valores[4], 3000);
  assert.strictEqual(r.total, 8100);
  // mesmo total do "Custo total" de Finanças / DRE no ano
  assert.strictEqual(r.total, computeFleetFinancials({ quotes, allocations, vehicles, period: { inicio: d(2026, 1, 1), fim: d(2027, 1, 1) }, now }).resumo.totalOs);
  // ordenado do maior gasto para o menor
  assert.ok(r.veiculos[0].total >= r.veiculos[r.veiculos.length - 1].total);
}]);
results.push(['Gastos por veículo: período sem gastos retorna lista vazia', () => {
  const r = computeVehicleMonthlySpend({ quotes, vehicles, period: '6m', now: d(2030, 1, 1) });
  assert.strictEqual(r.veiculos.length, 0);
  assert.strictEqual(r.total, 0);
  assert.strictEqual(r.meses.length, 6);
}]);
results.push(['Gastos por veículo: período por mês (um mês ou intervalo), com validação', () => {
  assert.deepStrictEqual(spendMonths({ de: '2026-07', ate: '2026-07' }, now).map(m => m.chave), ['2026-07']);
  assert.deepStrictEqual(spendMonths({ de: '2025-11', ate: '2026-02' }, now).map(m => m.chave), ['2025-11', '2025-12', '2026-01', '2026-02']);
  const jul = computeVehicleMonthlySpend({ quotes, vehicles, period: { de: '2026-07', ate: '2026-07' }, now });
  assert.strictEqual(jul.total, 900);
  assert.strictEqual(jul.meses.length, 1);
  const q2 = computeVehicleMonthlySpend({ quotes, vehicles, period: { de: '2026-03', ate: '2026-05' }, now });
  assert.strictEqual(q2.total, 1000 + 500 + 3000);
  assert.deepStrictEqual(parseMonthRange('2026-01', '2026-03'), { de: '2026-01', ate: '2026-03' });
  assert.ok('error' in parseMonthRange('2026-05', '2026-01'));
  assert.ok('error' in parseMonthRange('2026-13', '2026-12'));
  assert.ok('error' in parseMonthRange('2024-01', '2026-01'));
  assert.ok(!('error' in parseMonthRange('2024-02', '2026-01')));
  assert.ok('error' in parseMonthRange(undefined, '2026-01'));
}]);
results.push(['Gastos por veículo: divisão Peças/Serviços x Mão de Obra soma o total (com desconto proporcional)', () => {
  const r = computeVehicleMonthlySpend({ quotes, vehicles, period: 'ano', now });
  for (const v of r.veiculos) {
    v.valores.forEach((val, i) => assert.strictEqual(Math.round((v.pecas[i] + v.maoDeObra[i]) * 100) / 100, val, `${v.placa} mês ${i}`));
    assert.strictEqual(Math.round((v.totalPecas + v.totalMaoDeObra) * 100) / 100, v.total);
  }
  const v1 = r.veiculos.find(v => v.veiculoId === 'v1')!;
  // mar: Pago 1000 = peça 600 + mão de obra 400
  assert.strictEqual(v1.pecas[2], 600); assert.strictEqual(v1.maoDeObra[2], 400);
  // jul: Aprovado 900 com desconto de 100 sobre itens 600 peça + 400 MO -> 540 + 360
  assert.strictEqual(v1.pecas[6], 540); assert.strictEqual(v1.maoDeObra[6], 360);
  // ago: Emitir NF 700 só produto
  assert.strictEqual(v1.pecas[7], 700); assert.strictEqual(v1.maoDeObra[7], 0);
  // abr: Cobertura 500 só mão de obra
  assert.strictEqual(v1.pecas[3], 0); assert.strictEqual(v1.maoDeObra[3], 500);
  // OS sem itens: valor todo em Mão de Obra
  const semItens = computeVehicleMonthlySpend({ quotes: [{ id: 'x', status: 'Pago', total: 123.45, createdAt: d(2026, 5), veiculoId: 'v1', veiculoPlaca: 'ABC1D23', items: [] }], vehicles, period: 'ano', now });
  assert.strictEqual(semItens.veiculos[0].maoDeObra[4], 123.45);
  // Arredondamento: 3 itens iguais em 100,00 continua fechando
  const tri = computeVehicleMonthlySpend({ quotes: [{ id: 'y', status: 'Pago', total: 100, createdAt: d(2026, 5), veiculoId: 'v1', veiculoPlaca: 'ABC1D23', items: [item('Peça', 1), item('Peça', 1), item('Mão de Obra', 1)] }], vehicles, period: 'ano', now });
  assert.strictEqual(tri.veiculos[0].pecas[4] + tri.veiculos[0].maoDeObra[4], 100);
}]);
let failed = 0;
for (const [name, fn] of results) {
  try { fn(); console.log(`ok ${name}`); } catch (e: any) { failed++; console.log(`FALHOU ${name}: ${e.message}`); }
}
assert.strictEqual(failed, 0, `${failed} teste(s) falharam`);
console.log(`${results.length} testes passaram`);
