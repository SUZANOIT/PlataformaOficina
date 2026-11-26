/**
 * Indicadores dos orçamentos por plataforma (sem banco).
 *   npx ts-node --transpile-only src/services/platformQuoteStats.test.ts
 */
import assert from 'assert';
import { summarizePlatformQuotes } from './platformQuoteStats';

const quotes = [
  { status: 'Pago', valor: 1000 },
  { status: 'Parcialmente Pago', valor: 500.5 },
  { status: 'Aguardando Aprovação', valor: 300 },
  { status: 'Aguardando Aprovação', valor: 200 },
  { status: 'Cancelado', valor: 99.99 },
];
const results: [string, boolean, string?][] = [];
const test = (n: string, fn: () => void) => { try { fn(); results.push([n, true]); } catch (e: any) { results.push([n, false, e.message]); } };

test('sem filtro: mesmos totais de antes (pagos = Pago + Parcialmente Pago)', () => {
  const s = summarizePlatformQuotes(quotes);
  assert.strictEqual(s.totalQuotesCount, 5);
  assert.strictEqual(s.totalValue, 2100.49);
  assert.strictEqual(s.paidQuotesCount, 2);
  assert.strictEqual(s.paidValue, 1500.5);
  assert.strictEqual(s.openValue, 599.99);
});

test('quebra por status, do status com mais orçamentos para o com menos', () => {
  const s = summarizePlatformQuotes(quotes);
  assert.deepStrictEqual(s.porStatus[0], { status: 'Aguardando Aprovação', quantidade: 2, valor: 500 });
  assert.strictEqual(s.porStatus.reduce((t, r) => t + r.quantidade, 0), 5);
});

test('filtro por status do orçamento', () => {
  const s = summarizePlatformQuotes(quotes, 'Aguardando Aprovação');
  assert.strictEqual(s.totalQuotesCount, 2);
  assert.strictEqual(s.totalValue, 500);
  assert.strictEqual(s.paidValue, 0);
  assert.deepStrictEqual(s.porStatus.map(r => r.status), ['Aguardando Aprovação']);
  assert.strictEqual(summarizePlatformQuotes(quotes, 'Inexistente').totalQuotesCount, 0);
});

for (const [n, ok, err] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${err ? `\n      ${err}` : ''}`);
const failed = results.filter(r => !r[1]).length;
console.log(`${results.length - failed} testes passaram`);
process.exit(failed ? 1 : 0);
