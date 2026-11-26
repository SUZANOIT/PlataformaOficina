/**
 * Testes unitários (sem banco) do limite de tentativas e do mascaramento de logs.
 *   npx ts-node --transpile-only src/security/security.unit.test.ts
 */
import assert from 'assert';
import { LoginRateLimiter, clearLoginBlock } from '../lib/security/loginRateLimiter';
import { redactText, redactValue } from '../lib/security/logRedaction';
import { isPlatformAdmin, PLATFORM_COMPANY_ID } from '../lib/security/platform';

const results: [string, boolean, string?][] = [];
const test = (name: string, fn: () => void) => {
  try { fn(); results.push([name, true]); } catch (e: any) { results.push([name, false, e.message]); }
};

test('limite por IP bloqueia após o máximo e libera quando a janela expira', () => {
  const l = new LoginRateLimiter({ windowMs: 1000, ipMax: 3, accountMaxFailures: 99 });
  const t0 = 1_000_000;
  for (let i = 0; i < 3; i++) assert.ok(l.attempt('1.1.1.1', null, t0).allowed);
  const blocked = l.attempt('1.1.1.1', null, t0);
  assert.strictEqual(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec > 0);
  assert.ok(l.attempt('2.2.2.2', null, t0).allowed, 'outro IP não pode ser afetado');
  assert.ok(l.attempt('1.1.1.1', null, t0 + 1001).allowed, 'janela expirada deve liberar');
});

test('limite por conta: falhas bloqueiam a conta; sucesso zera o contador', () => {
  const l = new LoginRateLimiter({ windowMs: 1000, ipMax: 999, accountMaxFailures: 2 });
  const t0 = 2_000_000;
  l.attempt('ip', 'id:a@x', t0); l.fail('id:a@x', t0);
  l.attempt('ip', 'id:a@x', t0); l.fail('id:a@x', t0);
  assert.strictEqual(l.attempt('ip', 'id:a@x', t0).allowed, false);
  assert.ok(l.attempt('ip', 'id:b@x', t0).allowed);
  l.succeed('id:a@x');
  assert.ok(l.attempt('ip', 'id:a@x', t0).allowed);
});

test('clearLoginBlock libera a conta (CNPJ com ou sem máscara, e-mail sem diferenciar maiúsculas)', () => {
  const l = new LoginRateLimiter({ windowMs: 60_000, ipMax: 999, accountMaxFailures: 1 });
  const t0 = 3_000_000;
  l.attempt('ip', 'cnpj:11222333000181', t0); l.fail('cnpj:11222333000181', t0);
  assert.strictEqual(l.attempt('ip', 'cnpj:11222333000181', t0).allowed, false);
  clearLoginBlock('11.222.333/0001-81', l);
  assert.ok(l.attempt('ip', 'cnpj:11222333000181', t0).allowed);
  l.attempt('ip', 'id:joao@x.com', t0); l.fail('id:joao@x.com', t0);
  clearLoginBlock('Joao@X.com', l);
  assert.ok(l.attempt('ip', 'id:joao@x.com', t0).allowed);
});

test('mascaramento de texto: Bearer, JWT, password=, "senha":', () => {
  const jwtLike = 'eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMzQ1Njc4In0.c2lnbmF0dXJlLXZhbHVl';
  const out = redactText(`Authorization: Bearer ${jwtLike} password=Segredo123 {"senha":"Outra#1"} token: abc123def`);
  for (const secret of [jwtLike, 'Segredo123', 'Outra#1', 'abc123def']) assert.ok(!out.includes(secret), `${secret} vazou: ${out}`);
});

test('mascaramento de objetos: chaves sensíveis em qualquer nível, demais campos preservados', () => {
  const v: any = redactValue({ email: 'a@b.c', password: 'x1', nested: { tempToken: 't', ok: 1, list: [{ secretKey: 'k' }] } });
  assert.strictEqual(v.email, 'a@b.c');
  assert.strictEqual(v.password, '[REDACTED]');
  assert.strictEqual(v.nested.tempToken, '[REDACTED]');
  assert.strictEqual(v.nested.ok, 1);
  assert.strictEqual(v.nested.list[0].secretKey, '[REDACTED]');
  const e = redactValue(new Error('falha com password=abc')) as Error;
  assert.ok(e instanceof Error && !e.message.includes('abc'));
});

test('administrador da plataforma é avaliado pelo cadastro, não pela empresa da requisição', () => {
  assert.strictEqual(isPlatformAdmin({ roleAdmin: true, companyId: 'outra' }), false);
  assert.strictEqual(isPlatformAdmin({ roleAdmin: true, companyId: PLATFORM_COMPANY_ID }), true);
  assert.strictEqual(isPlatformAdmin({ role: 'SUPER_ADMIN', companyId: null }), true);
  assert.strictEqual(isPlatformAdmin({ roleAdmin: true, companyId: PLATFORM_COMPANY_ID, clientId: 'c' }), false);
  assert.strictEqual(isPlatformAdmin({ roleAdmin: false, companyId: PLATFORM_COMPANY_ID }), false);
});

for (const [n, ok, err] of results) console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${err ? `\n      ${err}` : ''}`);
const failed = results.filter(r => !r[1]).length;
console.log(`${results.length - failed} testes passaram`);
process.exit(failed ? 1 : 0);
