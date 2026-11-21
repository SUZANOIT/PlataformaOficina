import assert from 'assert';
import { isSpaNavigation } from './spa-navigation.middleware';

const nav = (p: string, headers: Record<string, string> = {}, method = 'GET') => ({ method, path: p, headers });
const chromeNav = { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'document', accept: 'text/html,application/xhtml+xml,*/*;q=0.8' };

const cases: [string, boolean, boolean][] = [
  ['F5 em /quotes/view/:id (Chrome)', isSpaNavigation(nav('/quotes/view/abc', chromeNav)), true],
  ['F5 em /financial/dashboard', isSpaNavigation(nav('/financial/dashboard', chromeNav)), true],
  ['F5 em /fleet/vehicles/1', isSpaNavigation(nav('/fleet/vehicles/1', chromeNav)), true],
  ['Navegador sem Sec-Fetch pedindo HTML', isSpaNavigation(nav('/users', { accept: 'text/html' })), true],
  ['axios (Accept JSON + Authorization)', isSpaNavigation(nav('/quotes', { accept: 'application/json', authorization: 'Bearer x' })), false],
  ['fetch() da página (cors/same-origin)', isSpaNavigation(nav('/auth/me', { 'sec-fetch-mode': 'cors', accept: '*/*' })), false],
  ['fetch() sem Accept HTML', isSpaNavigation(nav('/quotes', { accept: '*/*' })), false],
  ['Navegação com Authorization nunca é desviada', isSpaNavigation(nav('/quotes', { ...chromeNav, authorization: 'Bearer x' })), false],
  ['POST nunca é desviado', isSpaNavigation(nav('/auth/login', chromeNav, 'POST')), false],
  ['Arquivo estático', isSpaNavigation(nav('/assets/index.js', chromeNav)), false],
  ['iframe não é documento principal', isSpaNavigation(nav('/quotes', { 'sec-fetch-mode': 'navigate', 'sec-fetch-dest': 'iframe' })), false],
];

let failed = 0;
for (const [name, got, expected] of cases) {
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'ok' : 'FALHOU'} ${name}`);
}
assert.strictEqual(failed, 0, `${failed} caso(s) falharam`);
console.log(`${cases.length} testes passaram`);
