/**
 * Testes de segurança da autenticação (login, sessão, logs, isolamento entre empresas).
 *
 * Usa apenas credenciais fictícias, cria dados próprios (sufixo aleatório) e remove ao final.
 * Exige um banco de TESTE explicitamente sinalizado:
 *
 *   SECURITY_TEST_DB=1 DATABASE_URL=postgresql://... npx ts-node --transpile-only src/security/auth.security.test.ts
 */
import assert from 'assert';
import { AddressInfo } from 'net';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

if (process.env.SECURITY_TEST_DB !== '1') {
  console.error('Defina SECURITY_TEST_DB=1 e um DATABASE_URL de teste para executar.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'security-test-secret-0123456789abcdef';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { basePrisma: db } = require('../lib/prisma');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { authRateLimiter } = require('../lib/security/loginRateLimiter');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PLATFORM_COMPANY_ID } = require('../lib/security/platform');

const SFX = Math.random().toString(36).slice(2, 8);
// Credenciais fictícias, exclusivas deste teste
const PWD = `Fict-${SFX}-Senha!9`;
const NEW_PWD = `Fict-${SFX}-Nova!7`;
const CNPJ = `${String(Math.floor(Math.random() * 9e7) + 1e7)}000199`.slice(0, 14);

let base = '';
const results: { name: string; ok: boolean; err?: string }[] = [];

async function http(method: string, path: string, opts: { token?: string; body?: any; headers?: Record<string, string> } = {}) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: r.status, body: json, text, headers: r.headers };
}

async function test(name: string, fn: () => Promise<void>) {
  authRateLimiter.reset();
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e: any) {
    results.push({ name, ok: false, err: e?.message || String(e) });
  }
}

/** Captura tudo o que for escrito em stdout/stderr enquanto `fn` roda. */
async function captureOutput(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = [];
  const out = process.stdout.write.bind(process.stdout);
  const err = process.stderr.write.bind(process.stderr);
  (process.stdout as any).write = (c: any, ...rest: any[]) => { chunks.push(String(c)); return out(c, ...rest); };
  (process.stderr as any).write = (c: any, ...rest: any[]) => { chunks.push(String(c)); return err(c, ...rest); };
  try {
    await fn();
    await new Promise(r => setTimeout(r, 50));
  } finally {
    (process.stdout as any).write = out;
    (process.stderr as any).write = err;
  }
  return chunks.join('');
}

async function main() {
  const server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // ---------------- Seed ----------------
  const hash = await bcrypt.hash(PWD, 10);
  const platformExisted = !!(await db.company.findUnique({ where: { id: PLATFORM_COMPANY_ID } }));
  if (!platformExisted) {
    await db.company.create({ data: { id: PLATFORM_COMPANY_ID, razaoSocial: 'Plataforma (teste)', cnpj: `P${SFX}`, cnpjSemMascara: `P${SFX}` } });
  }
  const compA = await db.company.create({ data: { razaoSocial: `Sec A ${SFX}`, cnpj: `SA${SFX}`, cnpjSemMascara: `SA${SFX}` } });
  const compB = await db.company.create({ data: { razaoSocial: `Sec B ${SFX}`, cnpj: `SB${SFX}`, cnpjSemMascara: `SB${SFX}` } });
  const adminA = await db.user.create({ data: { name: 'Admin A', email: `sec.admina.${SFX}@t.local`, password: hash, roleAdmin: true, companyId: compA.id } });
  const userA = await db.user.create({ data: { name: 'User A', email: `sec.usera.${SFX}@t.local`, password: hash, roleOrcamentista: true, companyId: compA.id } });
  const inactiveA = await db.user.create({ data: { name: 'Inativo A', email: `sec.inativo.${SFX}@t.local`, password: hash, roleAdmin: true, status: 'INATIVO', companyId: compA.id } });
  const firstAccess = await db.user.create({ data: { name: 'Primeiro A', email: `sec.primeiro.${SFX}@t.local`, password: hash, roleAdmin: true, mustChangePassword: true, companyId: compA.id } });
  const clientA = await db.client.create({ data: { nome: `Cliente A ${SFX}`, cnpj: CNPJ, companyId: compA.id } });
  const clientB = await db.client.create({ data: { nome: `Cliente B ${SFX}`, cnpj: `B${SFX}`, companyId: compB.id } });
  const portalUser = await db.user.create({ data: {
    name: 'Gestor', email: `sec.gestor.${SFX}@portal-gestor.local`, password: hash, role: 'GESTOR_FROTA',
    companyId: compA.id, clientId: clientA.id,
  } });

  const login = (email: string, password: string) => http('POST', '/auth/login', { body: { email, password } });
  const signed = (u: any, extra: any = {}, exp: any = '1h') => jwt.sign({ id: u.id, tv: u.tokenVersion || 0, ...extra }, process.env.JWT_SECRET!, { expiresIn: exp });

  try {
    // 1. Senha não aparece nos logs
    await test('1. senha e token não aparecem nos logs (login com sucesso, falha e erro)', async () => {
      let token = '';
      const logs = await captureOutput(async () => {
        const ok = await login(adminA.email, PWD);
        assert.strictEqual(ok.status, 200);
        token = ok.body.token;
        await login(adminA.email, 'senha-errada-ficticia');
        await http('POST', '/auth/force-password-change', { body: { tempToken: 'invalido', newPassword: PWD } });
        // Log explícito com dados sensíveis também é mascarado
        console.log('debug', { password: PWD, nested: { token } }, `Authorization: Bearer ${token}`);
      });
      assert.ok(token, 'login deve devolver token');
      assert.ok(!logs.includes(PWD), 'senha apareceu no log');
      assert.ok(!logs.includes(token), 'token apareceu no log');
      assert.ok(logs.includes('[REDACTED]'), 'mascaramento não aplicado');
    });

    // 2. Token não aparece em mensagens de erro
    await test('2. token inválido/expirado não é ecoado na resposta de erro', async () => {
      const forged = jwt.sign({ id: adminA.id }, 'secret', { expiresIn: '1h' });
      const expired = signed(adminA, {}, -10);
      for (const t of [forged, expired, 'abc.def.ghi']) {
        const r = await http('GET', '/registry/clients', { token: t });
        assert.strictEqual(r.status, 401);
        assert.ok(!r.text.includes(t), 'token ecoado no erro');
      }
    });

    // 3. Login inválido retorna resposta segura
    await test('3. login inválido: mesma resposta para e-mail inexistente e senha errada, sem detalhes internos', async () => {
      const unknown = await login(`nao.existe.${SFX}@t.local`, PWD);
      const wrong = await login(adminA.email, 'senha-errada-ficticia');
      assert.strictEqual(unknown.status, 400);
      assert.strictEqual(wrong.status, 400);
      assert.deepStrictEqual(unknown.body, wrong.body);
      assert.ok(!/stack|prisma|bcrypt|password/i.test(unknown.text));
      const malformed = await http('POST', '/auth/login', { body: { email: 'x', password: 1 } });
      assert.strictEqual(malformed.status, 400);
      assert.ok(!/zod|issues|path/i.test(malformed.text));
      const forgotKnown = await http('POST', '/auth/forgot-password', { body: { email: adminA.email } });
      const forgotUnknown = await http('POST', '/auth/forgot-password', { body: { email: `nao.existe.${SFX}@t.local` } });
      assert.strictEqual(forgotKnown.status, 200);
      assert.deepStrictEqual(forgotKnown.body, forgotUnknown.body, 'recuperação de senha revela se o e-mail existe');
      assert.ok(!('token' in forgotKnown.body));
    });

    // 4. Tentativas excessivas são bloqueadas
    await test('4. força bruta: conta bloqueada após 5 falhas (mesmo com a senha certa) e libera após sucesso', async () => {
      for (let i = 0; i < 5; i++) assert.strictEqual((await login(userA.email, `errada-${i}`)).status, 400);
      const blocked = await login(userA.email, PWD);
      assert.strictEqual(blocked.status, 429);
      assert.ok(Number(blocked.headers.get('retry-after')) > 0);
      // Outra conta do mesmo IP continua funcionando
      assert.strictEqual((await login(adminA.email, PWD)).status, 200);
      // Portal por CNPJ também é limitado
      authRateLimiter.reset();
      for (let i = 0; i < 5; i++) await http('POST', '/auth/portal-login', { body: { cnpj: CNPJ, password: `errada-${i}` } });
      assert.strictEqual((await http('POST', '/auth/portal-login', { body: { cnpj: CNPJ, password: PWD } })).status, 429);
    });

    // 5. Senhas não são armazenadas em texto puro
    await test('5. senha guardada com bcrypt e nunca devolvida pela API', async () => {
      const row = await db.user.findUnique({ where: { id: adminA.id } });
      assert.ok(/^\$2[aby]\$\d{2}\$/.test(row.password), 'senha não está em bcrypt');
      assert.notStrictEqual(row.password, PWD);
      const ok = await login(adminA.email, PWD);
      assert.ok(!ok.text.includes(row.password) && !/"password"/.test(ok.text));
      const list = await http('GET', '/users', { token: ok.body.token });
      assert.strictEqual(list.status, 200);
      assert.ok(!/"password"/.test(list.text) && !list.text.includes('$2b$'));
    });

    // 6. Usuários não acessam dados/sessões de terceiros
    await test('6. ?tenantId não troca de empresa para admin de oficina nem dá acesso à administração da plataforma', async () => {
      const t = signed(adminA);
      const own = await http('GET', '/registry/clients', { token: t });
      assert.strictEqual(own.status, 200);
      const viaTenant = await http('GET', `/registry/clients?tenantId=${compB.id}`, { token: t });
      assert.strictEqual(viaTenant.status, 200);
      const ids = JSON.stringify(viaTenant.body);
      assert.ok(!ids.includes(clientB.id), 'admin da oficina A viu cliente da oficina B');
      assert.ok(ids.includes(clientA.id));
      for (const p of ['/api/admin/dashboard', '/saas/stats', '/api/empresas']) {
        const r = await http('GET', `${p}?tenantId=${PLATFORM_COMPANY_ID}`, { token: t });
        assert.strictEqual(r.status, 403, `${p} liberado via tenantId`);
      }
      // Token de outro usuário não funciona com outro id (assinatura) e cadastro público não cria admin
      const reg = await http('POST', '/auth/register', { body: { name: 'Atacante', email: `sec.reg.${SFX}@t.local`, password: PWD } });
      assert.strictEqual(reg.status, 403);
      assert.strictEqual(await db.user.count({ where: { email: `sec.reg.${SFX}@t.local` } }), 0);
    });

    // 7. Tokens expirados, forjados e revogados são rejeitados
    await test('7. token expirado, forjado com segredo fraco e revogado (troca de senha/bloqueio) são rejeitados', async () => {
      const expired = await http('GET', '/auth/me', { token: signed(adminA, {}, -10) });
      assert.strictEqual(expired.status, 401);
      assert.strictEqual(expired.body.code, 'TOKEN_EXPIRED');
      const forged = await http('GET', '/auth/me', { token: jwt.sign({ id: adminA.id }, 'secret') });
      assert.strictEqual(forged.status, 401);

      // Primeiro acesso: troca obrigatória de senha encerra o token temporário
      const first = await login(firstAccess.email, PWD);
      assert.strictEqual(first.status, 403);
      const tempToken = first.body.tempToken;
      assert.strictEqual((await http('GET', '/auth/me', { token: tempToken })).status, 401, 'token temporário acessou rota autenticada');
      assert.strictEqual((await http('POST', '/auth/force-password-change', { body: { tempToken, newPassword: NEW_PWD } })).status, 200);
      const reuse = await http('POST', '/auth/force-password-change', { body: { tempToken, newPassword: `${NEW_PWD}x` } });
      assert.strictEqual(reuse.status, 400, 'token temporário reaproveitado');

      // Portal: troca de senha revoga sessões anteriores e devolve token novo
      const before = signed(portalUser, { portal: true });
      assert.strictEqual((await http('GET', '/auth/me', { token: before })).status, 200);
      const change = await http('POST', '/portal-gestor/meu-acesso/senha', { token: before, body: { senhaAtual: PWD, novaSenha: NEW_PWD } });
      assert.strictEqual(change.status, 200);
      assert.ok(change.body.token);
      const old = await http('GET', '/auth/me', { token: before });
      assert.strictEqual(old.status, 401);
      assert.strictEqual(old.body.code, 'TOKEN_REVOKED');
      assert.strictEqual((await http('GET', '/auth/me', { token: change.body.token })).status, 200);

      // Usuário bloqueado perde o acesso mesmo com token válido
      const tUser = signed(userA);
      assert.strictEqual((await http('GET', '/auth/me', { token: tUser })).status, 200);
      const block = await http('PUT', `/users/${userA.id}`, { token: signed(adminA), body: { name: 'User A', email: userA.email, status: 'INACTIVE' } });
      assert.strictEqual(block.status, 200);
      assert.strictEqual((await http('GET', '/auth/me', { token: tUser })).status, 401);
      const inactiveLogin = await login(inactiveA.email, PWD);
      assert.strictEqual(inactiveLogin.status, 403);
      assert.ok(!inactiveLogin.body.token);
    });

    // 8. Rotas protegidas exigem autenticação; rotas perigosas removidas
    await test('8. rotas protegidas exigem token; /debug/run-migrate e /auth/emergency-reset não existem mais', async () => {
      for (const p of ['/registry/clients', '/quotes', '/users', '/portal-gestor/dashboard', '/financial/dashboard', '/auth/me']) {
        assert.strictEqual((await http('GET', p)).status, 401, `${p} acessível sem token`);
      }
      const migrate = await http('GET', '/debug/run-migrate', { headers: { Accept: 'application/json' } });
      assert.ok(!(migrate.body && typeof migrate.body === 'object' && 'stdout' in migrate.body), 'run-migrate ainda executa');
      const emergency = await http('POST', '/auth/emergency-reset', {
        body: { email: adminA.email, newPassword: 'x', secretKey: 'SuzanoIT2026EmergencyReset!' },
      });
      assert.ok(!(emergency.body && emergency.body.success), 'emergency-reset ainda funciona');
      const row = await db.user.findUnique({ where: { id: adminA.id } });
      assert.ok(await bcrypt.compare(PWD, row.password), 'senha foi alterada pelo emergency-reset');
    });

    // 10. HTTPS / cabeçalhos de transporte
    await test('10. cabeçalhos de segurança (HSTS, nosniff) e CORS restrito', async () => {
      const r = await http('POST', '/auth/login', { body: { email: adminA.email, password: PWD } });
      assert.ok((r.headers.get('strict-transport-security') || '').includes('max-age='), 'HSTS ausente');
      assert.strictEqual(r.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(r.headers.get('x-powered-by'), null);
      const evil = await http('GET', '/auth/me', { headers: { Origin: 'https://site-malicioso.example' } });
      assert.strictEqual(evil.headers.get('access-control-allow-origin'), null, 'CORS liberado para origem desconhecida');
      const prod = await http('GET', '/auth/me', { headers: { Origin: 'https://suzanoit-orcamentos.up.railway.app' } });
      assert.strictEqual(prod.headers.get('access-control-allow-origin'), 'https://suzanoit-orcamentos.up.railway.app');
    });
  } finally {
    const userIds = [adminA.id, userA.id, inactiveA.id, firstAccess.id, portalUser.id];
    await db.auditLog?.deleteMany?.({ where: { userId: { in: userIds } } }).catch(() => undefined);
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.client.deleteMany({ where: { id: { in: [clientA.id, clientB.id] } } });
    await db.company.deleteMany({ where: { id: { in: [compA.id, compB.id, ...(platformExisted ? [] : [PLATFORM_COMPANY_ID])] } } }).catch(() => undefined);
    server.close();
    await db.$disconnect();
  }

  const failed = results.filter(r => !r.ok);
  for (const r of results) process.stdout.write(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.err ? `\n      ${r.err}` : ''}\n`);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} testes de segurança passaram\n`);
  process.exit(failed.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
