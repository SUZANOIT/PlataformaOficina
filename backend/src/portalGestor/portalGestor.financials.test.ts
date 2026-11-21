import assert from 'assert';
import { computeFleetFinancials, itemCategories, FinQuote, FinAllocation } from './portalGestor.financials';

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
let failed = 0;
for (const [name, fn] of results) {
  try { fn(); console.log(`ok ${name}`); } catch (e: any) { failed++; console.log(`FALHOU ${name}: ${e.message}`); }
}
assert.strictEqual(failed, 0, `${failed} teste(s) falharam`);
console.log(`${results.length} testes passaram`);
