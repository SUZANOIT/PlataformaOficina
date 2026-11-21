/**
 * Teste de integração do Portal do Gestor de Frota: isolamento entre empresas,
 * bloqueio de rotas administrativas, operações e ocultação de dados internos.
 *
 * Cria dados próprios (sufixo aleatório) e remove ao final. Exige um banco de
 * TESTE explicitamente sinalizado:
 *
 *   PORTAL_GESTOR_TEST_DB=1 DATABASE_URL=postgresql://... npx ts-node --transpile-only src/portalGestor/portalGestor.isolation.test.ts
 */
import assert from 'assert';
import { AddressInfo } from 'net';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

if (process.env.PORTAL_GESTOR_TEST_DB !== '1') {
  console.error('Defina PORTAL_GESTOR_TEST_DB=1 e um DATABASE_URL de teste para executar.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'portal-gestor-test-secret';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { basePrisma: db } = require('../lib/prisma');

const SFX = Math.random().toString(36).slice(2, 8);
const cnpjFrom = (n: number) => `${String(n).padStart(8, '0')}0001${String(n % 100).padStart(2, '0')}`.slice(0, 14);
const CNPJ_X = cnpjFrom(Math.floor(Math.random() * 9e7) + 1e7);
const CNPJ_Y = cnpjFrom(Math.floor(Math.random() * 9e7) + 1e7);
const mask = (c: string) => `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;

let base = '';
const results: { name: string; ok: boolean; err?: string }[] = [];

async function http(method: string, path: string, token?: string, body?: any) {
  const r = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = text; }
  return { status: r.status, body: json, text };
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
  } catch (e: any) {
    results.push({ name, ok: false, err: e?.message || String(e) });
  }
}

async function main() {
  const server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // ---------------- Seed ----------------
  const pwd = await bcrypt.hash('Admin@123', 10);
  const compA = await db.company.create({ data: { razaoSocial: `Oficina A ${SFX}`, cnpj: `A${SFX}`, cnpjSemMascara: `A${SFX}` } });
  const compB = await db.company.create({ data: { razaoSocial: `Oficina B ${SFX}`, cnpj: `B${SFX}`, cnpjSemMascara: `B${SFX}` } });
  const adminA = await db.user.create({ data: { name: 'Admin A', email: `admina.${SFX}@t.local`, password: pwd, roleAdmin: true, companyId: compA.id } });
  const adminB = await db.user.create({ data: { name: 'Admin B', email: `adminb.${SFX}@t.local`, password: pwd, roleAdmin: true, companyId: compB.id } });
  const orcA = await db.user.create({ data: { name: 'Orc A', email: `orca.${SFX}@t.local`, password: pwd, roleOrcamentista: true, companyId: compA.id } });
  const tok = (u: any) => jwt.sign({ id: u.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

  const clientX = await db.client.create({ data: { nome: 'Transportes X', empresa: 'Transportes X LTDA', cnpj: mask(CNPJ_X), companyId: compA.id } });
  const clientY = await db.client.create({ data: { nome: 'Logística Y', empresa: 'Logística Y SA', cnpj: CNPJ_Y, companyId: compA.id } });
  const clientXinB = await db.client.create({ data: { nome: 'Transportes X (B)', cnpj: CNPJ_X, companyId: compB.id } });
  const clientXdup = await db.client.create({ data: { nome: 'Transportes X duplicado', cnpj: CNPJ_X, companyId: compA.id } });

  const vX = await db.vehicle.create({ data: { clienteId: clientX.id, companyId: compA.id, placa: `X${SFX}1`.toUpperCase(), marca: 'VW', modelo: 'Delivery', anoFabricacao: 2022, anoModelo: 2023 } });
  const vY = await db.vehicle.create({ data: { clienteId: clientY.id, companyId: compA.id, placa: `Y${SFX}1`.toUpperCase(), marca: 'MB', modelo: 'Accelo', anoFabricacao: 2021, anoModelo: 2021 } });

  const mkQuote = (clientId: string, v: any, status: string, extra: any = {}) => db.quote.create({
    data: {
      companyId: compA.id, clientId, condicaoPagamento: 'À vista', validade: '7 dias', subtotal: 1000, total: 1000, status,
      veiculoId: v.id, veiculoPlaca: v.placa,
      items: { create: [
        { descricao: 'Filtro de óleo', quantidade: 2, valorUnitario: 100, valorTotal: 200, tipo: 'Peça', tipoPeca: 'Original', valorCompraFornecedor: 37.77 },
        { descricao: 'Mão de obra', quantidade: 1, valorUnitario: 800, valorTotal: 800, tipo: 'Serviço' },
      ] },
      ...extra,
    },
  });
  const qXpending = await mkQuote(clientX.id, vX, 'Aguardando Aprovação');
  const qXparcelado = await mkQuote(clientX.id, vX, 'Aguardando Aprovação', { condicaoPagamento: 'Parcelado', parcelas: 2, valorEntrada: 200 });
  const qXreject = await mkQuote(clientX.id, vX, 'Aguardando Aprovação');
  const qXpaid = await mkQuote(clientX.id, vX, 'Pago');
  const qYpending = await mkQuote(clientY.id, vY, 'Aguardando Aprovação');
  const qYpaid = await mkQuote(clientY.id, vY, 'Pago');

  // Conta a pagar (custo interno) vinculada à OS paga de X, com anexo de fornecedor
  const payable = await db.financialPayable.create({ data: {
    companyId: compA.id, fornecedor: 'Fornecedor Secreto', categoria: 'Peças', centroCusto: 'Oficina', descricao: 'NF fornecedor SEGREDO-INTERNO',
    valor: 75.54, dataEmissao: new Date(), vencimento: new Date(), formaPagamento: 'Boleto', responsavel: 'x',
    attachments: { create: [{ fileName: 'nf-fornecedor-SEGREDO.pdf', fileType: 'PDF', fileUrl: 'https://internal/SEGREDO.pdf' }] },
  } });
  await db.payableQuoteLink.create({ data: { payableId: payable.id, quoteId: qXpaid.id, valorVinculado: 75.54 } });

  // Recebível direto da OS de X (com anexo) e recebível conjunto X+Y (faturamento único)
  const recX = await db.financialReceivable.create({ data: {
    companyId: compA.id, cliente: 'Transportes X', categoria: 'Serviços', descricao: 'Fatura OS X', valor: 1000,
    dataEmissao: new Date(), vencimento: new Date(), formaRecebimento: 'Boleto', responsavel: 'x', status: 'RECEBIDA', quoteId: qXpaid.id,
    attachments: { create: [{ fileName: 'boleto-x.pdf', fileType: 'PDF', fileUrl: 'https://files/boleto-x.pdf' }] },
  }, include: { attachments: true } });
  const recYAttachment = await db.financialReceivable.create({ data: {
    companyId: compA.id, cliente: 'Logística Y', categoria: 'Serviços', descricao: 'Fatura OS Y', valor: 1000,
    dataEmissao: new Date(), vencimento: new Date(), formaRecebimento: 'Boleto', responsavel: 'x', quoteId: qYpaid.id,
    attachments: { create: [{ fileName: 'boleto-y.pdf', fileType: 'PDF', fileUrl: 'https://files/boleto-y.pdf' }] },
  }, include: { attachments: true } });
  const recJoint = await db.financialReceivable.create({ data: {
    companyId: compA.id, cliente: 'Plataforma', categoria: 'Serviços', descricao: 'Faturamento conjunto', valor: 9999,
    dataEmissao: new Date(), vencimento: new Date(), formaRecebimento: 'Boleto', responsavel: 'x',
  } });
  await db.receivableQuoteLink.create({ data: { receivableId: recJoint.id, quoteId: qXpaid.id, valorVinculado: 123 } });
  await db.receivableQuoteLink.create({ data: { receivableId: recJoint.id, quoteId: qYpaid.id, valorVinculado: 9876 } });

  const anexoY = await db.anexoNF.create({ data: { quoteId: qYpaid.id, tipo: 'NF_PDF', nomeOriginal: 'nf-y.pdf', arquivo: 'nf/y.pdf', bucket: 'b', contentType: 'application/pdf', tamanho: 10, usuarioUpload: 'x' } });
  const anexoX = await db.anexoNF.create({ data: { quoteId: qXpaid.id, tipo: 'NF_PDF', nomeOriginal: 'nf-x.pdf', arquivo: 'nf/x.pdf', bucket: process.env.STORAGE_BUCKET || 'b', contentType: 'application/pdf', tamanho: 10, usuarioUpload: 'x' } });
  const anexoXMissing = await db.anexoNF.create({ data: { quoteId: qXpaid.id, tipo: 'NF_PDF', nomeOriginal: 'nf-sumida.pdf', arquivo: 'nf/nao-existe.pdf', bucket: 'bucket-antigo', contentType: 'application/pdf', tamanho: 10, usuarioUpload: 'x' } });

  await db.vehicleEvent.create({ data: { veiculoId: vX.id, tipo: 'MANUTENCAO', data: new Date(), descricao: 'Troca de pneus', valor: 1500 } });

  let tokenX = '';
  let tokenY = '';

  // ---------------- Geração do acesso (oficina) ----------------
  await test('Não-admin não gera acesso ao portal', async () => {
    const r = await http('POST', `/registry/clients/${clientX.id}/portal-access`, tok(orcA));
    assert.strictEqual(r.status, 403);
  });
  await test('Admin de outra oficina não gera acesso para cliente da oficina A', async () => {
    const r = await http('POST', `/registry/clients/${clientX.id}/portal-access`, tok(adminB));
    assert.strictEqual(r.status, 404);
  });
  await test('Admin A gera acesso para X com senha inicial', async () => {
    const r = await http('POST', `/registry/clients/${clientX.id}/portal-access`, tok(adminA));
    assert.strictEqual(r.status, 201, r.text);
    assert.strictEqual(r.body.login, CNPJ_X);
    assert.strictEqual(r.body.senhaInicial, '#12345678*');
    assert.strictEqual(r.body.mustChangePassword, true);
  });
  await test('Duplicidade: outro cadastro com o mesmo CNPJ na mesma oficina é bloqueado', async () => {
    const r = await http('POST', `/registry/clients/${clientXdup.id}/portal-access`, tok(adminA));
    assert.strictEqual(r.status, 409, r.text);
  });
  await test('Usuário do portal não aparece na lista de usuários da oficina', async () => {
    const r = await http('GET', '/users', tok(adminA));
    assert.strictEqual(r.status, 200);
    assert.ok(!r.text.includes('portal-gestor.local'));
  });

  // ---------------- Login / primeiro acesso ----------------
  await test('Login por CNPJ com senha inicial exige troca; token temporário não acessa o portal', async () => {
    const r = await http('POST', '/auth/portal-login', undefined, { cnpj: mask(CNPJ_X), password: '#12345678*' });
    assert.strictEqual(r.status, 403, r.text);
    assert.strictEqual(r.body.error, 'REQUIRE_PASSWORD_CHANGE');
    const blocked = await http('GET', '/portal-gestor/dashboard', r.body.tempToken);
    assert.strictEqual(blocked.status, 401);
    const weak = await http('POST', '/auth/force-password-change', undefined, { tempToken: r.body.tempToken, newPassword: '#12345678*' });
    assert.strictEqual(weak.status, 400);
    const ch = await http('POST', '/auth/force-password-change', undefined, { tempToken: r.body.tempToken, newPassword: 'NovaSenha@2026' });
    assert.strictEqual(ch.status, 200, ch.text);
  });
  await test('Senha errada é recusada', async () => {
    const r = await http('POST', '/auth/portal-login', undefined, { cnpj: CNPJ_X, password: 'errada' });
    assert.strictEqual(r.status, 400);
  });
  await test('Login por CNPJ após troca de senha', async () => {
    const r = await http('POST', '/auth/portal-login', undefined, { cnpj: CNPJ_X, password: 'NovaSenha@2026' });
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.user.clientId, clientX.id);
    tokenX = r.body.token;
  });
  await test('Usuário do portal não entra pelo login de e-mail da oficina', async () => {
    const u = await db.user.findFirst({ where: { clientId: clientX.id } });
    const r = await http('POST', '/auth/login', undefined, { email: u.email, password: 'NovaSenha@2026' });
    assert.strictEqual(r.status, 400);
  });
  await test('/auth/me do portal não expõe dados internos da oficina', async () => {
    const r = await http('GET', '/auth/me', tokenX);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.role, 'GESTOR_FROTA');
    assert.ok(r.body.planDetails === undefined && r.body.company === undefined);
  });

  // Acesso de Y para testes cruzados
  {
    await http('POST', `/registry/clients/${clientY.id}/portal-access`, tok(adminA));
    await db.user.updateMany({ where: { clientId: clientY.id }, data: { mustChangePassword: false } });
    const r = await http('POST', '/auth/portal-login', undefined, { cnpj: CNPJ_Y, password: '#12345678*' });
    tokenY = r.body.token;
  }

  // ---------------- Bloqueio de rotas administrativas ----------------
  await test('Gestor não acessa APIs administrativas (inclusive com ?tenantId)', async () => {
    for (const p of ['/quotes', '/financial/payables', '/fleet/vehicles', '/registry/clients', '/users', `/fleet/tree/vehicles/${vX.id}/details`, `/quotes/${qXpaid.id}`, `/registry/clients?tenantId=${compB.id}`, '/portal-contabilidade/impostos']) {
      const r = await http('GET', p, tokenX);
      assert.strictEqual(r.status, 403, `${p} -> ${r.status}`);
    }
    const put = await http('PUT', `/quotes/${qXpending.id}`, tokenX, {});
    assert.strictEqual(put.status, 403);
  });
  await test('Usuário da oficina não acessa /portal-gestor', async () => {
    const r = await http('GET', '/portal-gestor/dashboard', tok(adminA));
    assert.strictEqual(r.status, 403);
  });

  // ---------------- Isolamento de dados ----------------
  await test('Veículos: apenas os da própria empresa; veículo de outra empresa retorna 404', async () => {
    const r = await http('GET', '/portal-gestor/veiculos', tokenX);
    assert.deepStrictEqual(r.body.map((v: any) => v.id), [vX.id]);
    assert.strictEqual((await http('GET', `/portal-gestor/veiculos/${vY.id}`, tokenX)).status, 404);
    assert.strictEqual((await http('GET', `/portal-gestor/veiculos/${vX.id}`, tokenY)).status, 404);
  });
  await test('Orçamentos: lista só da empresa; acesso/aprovação/recusa de outra empresa retorna 404', async () => {
    const r = await http('GET', '/portal-gestor/orcamentos', tokenX);
    const ids = r.body.map((q: any) => q.id);
    assert.ok(ids.includes(qXpending.id) && !ids.includes(qYpending.id) && !ids.includes(qYpaid.id));
    assert.strictEqual((await http('GET', `/portal-gestor/orcamentos/${qYpending.id}`, tokenX)).status, 404);
    assert.strictEqual((await http('POST', `/portal-gestor/orcamentos/${qYpending.id}/aprovar`, tokenX)).status, 404);
    assert.strictEqual((await http('POST', `/portal-gestor/orcamentos/${qYpending.id}/recusar`, tokenX, { motivo: 'teste' })).status, 404);
    const y = await db.quote.findUnique({ where: { id: qYpending.id } });
    assert.strictEqual(y.status, 'Aguardando Aprovação');
  });
  await test('Orçamento pelo número (URL legível do PDF): só a própria empresa', async () => {
    const own = await http('GET', `/portal-gestor/orcamentos/${qXpaid.numeroOrcamento}`, tokenX);
    assert.strictEqual(own.status, 200, own.text);
    assert.strictEqual(own.body.id, qXpaid.id);
    assert.ok(!own.text.includes('37.77'));
    assert.strictEqual((await http('GET', `/portal-gestor/orcamentos/${qYpaid.numeroOrcamento}`, tokenX)).status, 404);
    assert.strictEqual((await http('GET', `/portal-gestor/orcamentos/${qXpaid.numeroOrcamento}`, tokenY)).status, 404);
    assert.strictEqual((await http('GET', '/portal-gestor/orcamentos/99999999999999999999', tokenX)).status, 404);
  });
  await test('Oficina: orçamento pelo número só dentro da própria oficina', async () => {
    const own = await http('GET', `/quotes/${qXpaid.numeroOrcamento}`, tok(adminA));
    assert.strictEqual(own.status, 200, own.text);
    assert.strictEqual(own.body.id, qXpaid.id);
    assert.strictEqual((await http('GET', `/quotes/${qXpaid.numeroOrcamento}`, tok(adminB))).status, 404);
    assert.strictEqual((await http('GET', `/quotes/${qXpaid.numeroOrcamento}`, tokenX)).status, 403);
  });
  await test('Cockpit do veículo no portal não expõe contas a pagar, anexos de fornecedor nem custo de peças', async () => {
    const r = await http('GET', `/portal-gestor/veiculos/${vX.id}`, tokenX);
    assert.strictEqual(r.status, 200, r.text);
    for (const secret of ['SEGREDO', 'valorCompraFornecedor', '37.77', '75.54', 'Fornecedor Secreto']) {
      assert.ok(!r.text.includes(secret), `vazou: ${secret}`);
    }
    assert.ok(!r.body.financeiro.some((f: any) => f.tipo === 'DESPESA'));
    assert.ok(!r.body.financeiro.some((f: any) => f.tipo === 'DESPESA_MANUTENCAO'));
    assert.ok(r.body.documentos.some((d: any) => d.nome === 'boleto-x.pdf'));
    assert.ok(r.body.pecas.some((p: any) => p.descricao === 'Filtro de óleo'));
  });
  await test('Detalhe do orçamento no portal não expõe custo de compra', async () => {
    const r = await http('GET', `/portal-gestor/orcamentos/${qXpaid.id}`, tokenX);
    assert.strictEqual(r.status, 200);
    assert.ok(!r.text.includes('valorCompraFornecedor') && !r.text.includes('37.77'));
  });
  await test('Cockpit administrativo continua com contas a pagar (sem regressão)', async () => {
    const r = await http('GET', `/fleet/tree/vehicles/${vX.id}/details`, tok(adminA));
    assert.strictEqual(r.status, 200, r.text);
    assert.ok(r.body.financeiro.some((f: any) => f.tipo === 'DESPESA' && f.valor === 75.54));
    assert.ok(r.body.documentos.some((d: any) => d.nome === 'nf-fornecedor-SEGREDO.pdf'));
  });
  await test('Peças, manutenção e OS filtradas pela empresa', async () => {
    const p = await http('GET', '/portal-gestor/pecas', tokenX);
    assert.ok(p.body.pecas.every((x: any) => x.veiculoId === vX.id));
    assert.ok(!p.text.includes('37.77'));
    const m = await http('GET', '/portal-gestor/manutencoes', tokenX);
    assert.ok(m.body.historico.every((x: any) => x.veiculoId === vX.id));
    assert.ok(m.body.historico.some((x: any) => x.descricao === 'Troca de pneus'));
    const os = await http('GET', '/portal-gestor/ordens-servico?pageSize=100', tokenX);
    assert.ok(os.body.items.every((x: any) => x.id !== qYpaid.id && x.id !== qYpending.id));
    assert.ok(os.body.items.some((x: any) => x.id === qXpaid.id));
  });
  await test('Documentos: só da empresa; download de anexo de outra empresa ou de conta a pagar retorna 404', async () => {
    const r = await http('GET', '/portal-gestor/documentos', tokenX);
    const nomes = r.body.map((d: any) => d.nome);
    assert.ok(nomes.includes('nf-x.pdf') && nomes.includes('boleto-x.pdf'));
    assert.ok(!nomes.includes('nf-y.pdf') && !nomes.includes('boleto-y.pdf') && !r.text.includes('SEGREDO'));
    assert.strictEqual((await http('GET', `/portal-gestor/documentos/os/${anexoY.id}/download`, tokenX)).status, 404);
    assert.strictEqual((await http('GET', `/portal-gestor/documentos/financeiro/${recYAttachment.attachments[0].id}/download`, tokenX)).status, 404);
    const payAtt = await db.financialAttachment.findFirst({ where: { payableId: payable.id } });
    assert.strictEqual((await http('GET', `/portal-gestor/documentos/financeiro/${payAtt.id}/download`, tokenX)).status, 404);
    const ok = await http('GET', `/portal-gestor/documentos/os/${anexoX.id}/download`, tokenX);
    if (process.env.STORAGE_ACCESS_KEY || process.env.GUIA_IMPOSTO_STORAGE_ACCESS_KEY) {
      // Storage configurado (STORAGE_* ou credenciais das guias de imposto): arquivo existente gera link no bucket correto
      assert.strictEqual(ok.status, 200, ok.text);
      assert.ok(ok.body.url.includes('/nf/x.pdf') && ok.body.url.includes('X-Amz-Credential=') && !ok.body.url.includes('X-Amz-Credential=%2F'), ok.body.url);
      const file = await fetch(ok.body.url);
      assert.strictEqual(file.status, 200);
      // Arquivo ausente no storage: mensagem clara em vez de link quebrado
      const missing = await http('GET', `/portal-gestor/documentos/os/${anexoXMissing.id}/download`, tokenX);
      assert.strictEqual(missing.status, 404, missing.text);
      assert.strictEqual(missing.body.code, 'STORAGE_NOT_FOUND');
      assert.ok(String(missing.body.error).includes('indisponível'));
    } else {
      // Storage sem credenciais: não entrega link quebrado
      assert.strictEqual(ok.status, 503, ok.text);
      assert.strictEqual(ok.body.code, 'STORAGE_NOT_CONFIGURED');
      assert.ok(!ok.text.includes('X-Amz'));
    }
    const okFin = await http('GET', `/portal-gestor/documentos/financeiro/${recX.attachments[0].id}/download`, tokenX);
    assert.strictEqual(okFin.status, 200);
  });
  await test('Finanças: só títulos da empresa; faturamento conjunto mostra apenas a parcela vinculada', async () => {
    const r = await http('GET', '/portal-gestor/financeiro', tokenX);
    assert.strictEqual(r.status, 200, r.text);
    const joint = r.body.titulos.find((t: any) => t.id === recJoint.id);
    assert.ok(joint && joint.valor === 123, JSON.stringify(joint));
    assert.ok(!r.body.titulos.some((t: any) => t.id === recYAttachment.id));
    for (const secret of ['9999', '9876', '75.54', 'SEGREDO']) assert.ok(!r.text.includes(secret), `vazou: ${secret}`);
    // Finanças do portal não incluem "outras manutenções" (somente valores das OS)
    assert.strictEqual(r.body.resumo.manutencaoExterna, undefined);
    assert.strictEqual(r.body.resumo.total, r.body.resumo.totalOs);
    assert.strictEqual(Math.round((r.body.resumo.pago + r.body.resumo.emAberto + r.body.resumo.coberto) * 100) / 100, r.body.resumo.totalOs);
  });

  // ---------------- Operações ----------------
  await test('Aprovar orçamento: status Aprovado + histórico; segunda aprovação é bloqueada', async () => {
    const r = await http('POST', `/portal-gestor/orcamentos/${qXpending.id}/aprovar`, tokenX);
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.status, 'Aprovado');
    const h = await db.quoteHistory.findFirst({ where: { quoteId: qXpending.id, action: 'STATUS_ALTERADO' } });
    assert.ok(h && h.description.includes('APROVADO PELO CLIENTE'));
    assert.strictEqual((await http('POST', `/portal-gestor/orcamentos/${qXpending.id}/aprovar`, tokenX)).status, 409);
  });
  await test('Aprovar orçamento parcelado gera recebíveis pela mesma regra da oficina', async () => {
    const r = await http('POST', `/portal-gestor/orcamentos/${qXparcelado.id}/aprovar`, tokenX);
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.status, 'Parcialmente Pago');
    const recs = await db.financialReceivable.findMany({ where: { quoteId: qXparcelado.id }, orderBy: { valor: 'asc' } });
    assert.strictEqual(recs.length, 3); // entrada + 2 parcelas
    assert.strictEqual(recs.reduce((s: number, x: any) => s + x.valor, 0), 1000);
  });
  await test('Recusar orçamento exige motivo e grava Cancelado + histórico', async () => {
    assert.strictEqual((await http('POST', `/portal-gestor/orcamentos/${qXreject.id}/recusar`, tokenX, {})).status, 400);
    const r = await http('POST', `/portal-gestor/orcamentos/${qXreject.id}/recusar`, tokenX, { motivo: 'Valor acima do esperado' });
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.status, 'Cancelado');
    const h = await db.quoteHistory.findFirst({ where: { quoteId: qXreject.id } });
    assert.ok(h.description.includes('RECUSADO PELO CLIENTE') && h.details.includes('Valor acima do esperado'));
  });
  await test('Histórico: cliente vê só as próprias ações; administrador vê tudo; sem acesso por requisição manipulada', async () => {
    // Registros de outros responsáveis no orçamento que o cliente X já aprovou
    const userY = await db.user.findFirst({ where: { clientId: clientY.id } });
    const t0 = Date.now();
    await db.quoteHistory.createMany({ data: [
      { quoteId: qXpending.id, companyId: compA.id, userId: adminA.id, userName: 'Admin A', action: 'PECA_ADICIONADA', description: 'LOG INTERNO DO ADMIN', createdAt: new Date(t0 + 1000) },
      { quoteId: qXpending.id, companyId: compA.id, userId: orcA.id, userName: 'Orc A', action: 'EDITADO', description: 'LOG INTERNO DO FUNCIONARIO', createdAt: new Date(t0 + 2000) },
      { quoteId: qXpending.id, companyId: compA.id, userId: null, userName: 'Sistema', action: 'EDITADO', description: 'LOG INTERNO DO SISTEMA', createdAt: new Date(t0 + 3000) },
      { quoteId: qXpending.id, companyId: compA.id, userId: userY.id, userName: 'Portal Y', action: 'EDITADO', description: 'LOG DE OUTRO CLIENTE', createdAt: new Date(t0 + 4000) },
    ] });
    const userX = await db.user.findFirst({ where: { clientId: clientX.id } });

    // Cliente: somente os próprios registros, ordem cronológica decrescente
    const q = await http('GET', `/portal-gestor/orcamentos/${qXpending.id}`, tokenX);
    assert.strictEqual(q.status, 200, q.text);
    assert.ok(q.body.history.length >= 1, 'deveria ter a aprovação do cliente');
    for (const h of q.body.history) assert.ok(h.description.includes('PELO CLIENTE'), h.description);
    for (const secret of ['LOG INTERNO', 'LOG DE OUTRO CLIENTE', 'Admin A', 'Orc A']) assert.ok(!q.text.includes(secret), `vazou: ${secret}`);
    const ownCount = await db.quoteHistory.count({ where: { quoteId: qXpending.id, userId: userX.id } });
    assert.strictEqual(q.body.history.length, ownCount);
    const dates = q.body.history.map((h: any) => new Date(h.createdAt).getTime());
    assert.deepStrictEqual(dates, [...dates].sort((a, b) => b - a));

    // Pelo número do orçamento e pela listagem de OS também não vaza
    const byNumber = await http('GET', `/portal-gestor/orcamentos/${qXpending.numeroOrcamento}`, tokenX);
    assert.ok(!byNumber.text.includes('LOG INTERNO'));
    const os = await http('GET', '/portal-gestor/ordens-servico?pageSize=100', tokenX);
    assert.ok(!os.text.includes('LOG INTERNO') && !os.text.includes('LOG DE OUTRO CLIENTE') && !os.text.includes('PELO CLIENTE'));

    // Requisições manipuladas para a API de histórico da oficina são bloqueadas
    for (const path of [`/quotes/${qXpending.id}/history`, `/quotes/${qXpending.id}/history?tenantId=${compA.id}`, `/quotes/${qXpending.id}`]) {
      assert.strictEqual((await http('GET', path, tokenX)).status, 403, path);
    }

    // Administrador: histórico completo (cliente, admin, funcionário, sistema), em ordem cronológica
    const adm = await http('GET', `/quotes/${qXpending.id}/history`, tok(adminA));
    assert.strictEqual(adm.status, 200, adm.text);
    for (const d of ['LOG INTERNO DO ADMIN', 'LOG INTERNO DO FUNCIONARIO', 'LOG INTERNO DO SISTEMA', 'LOG DE OUTRO CLIENTE', 'APROVADO PELO CLIENTE']) {
      assert.ok(adm.body.some((h: any) => h.description.includes(d)), `admin deveria ver: ${d}`);
    }
    // Oficina de outro tenant não lê histórico nem anexos de orçamento da oficina A
    assert.strictEqual((await http('GET', `/quotes/${qXpending.id}/history`, tok(adminB))).status, 404);
    assert.strictEqual((await http('GET', `/quotes/${qXpaid.id}/s3-attachments`, tok(adminB))).status, 404);
    assert.strictEqual((await http('DELETE', `/quotes/${qXpaid.id}/s3-attachments/${anexoX.id}`, tok(adminB))).status, 404);
    assert.ok(await db.anexoNF.findUnique({ where: { id: anexoX.id } }), 'anexo não pode ser apagado por outra oficina');
    const ownAtt = await http('GET', `/quotes/${qXpaid.id}/s3-attachments`, tok(adminA));
    assert.strictEqual(ownAtt.status, 200, ownAtt.text);
    assert.ok(ownAtt.body.some((a: any) => a.id === anexoX.id));
    const all = await db.quoteHistory.count({ where: { quoteId: qXpending.id } });
    assert.strictEqual(adm.body.length, all);
    const admDates = adm.body.map((h: any) => new Date(h.createdAt).getTime());
    assert.deepStrictEqual(admDates, [...admDates].sort((a, b) => b - a));
  });
  await test('Atualização feita pela oficina aparece no portal', async () => {
    await db.quote.update({ where: { id: qXpending.id }, data: { status: 'Emitir Nota Fiscal' } });
    const os = await http('GET', '/portal-gestor/ordens-servico?pageSize=100', tokenX);
    assert.strictEqual(os.body.items.find((q: any) => q.id === qXpending.id).status, 'Emitir Nota Fiscal');
  });
  await test('OS unificada: filtros por Serviços e Status, combinação e paginação', async () => {
    const STATUSES = ['Aguardando Aprovação', 'Aprovado', 'Aguardando Pagamento', 'Parcialmente Pago', 'Emitir Nota Fiscal', 'Cobertura', 'Pago', 'Cancelado'];
    const KINDS = ['pecas', 'mao', 'ambos'] as const;
    const clientZ = await db.client.create({ data: { nome: 'Frota Z', empresa: 'Frota Z LTDA', cnpj: cnpjFrom(Math.floor(Math.random() * 9e7) + 1e7), companyId: compA.id } });
    const vZ = await db.vehicle.create({ data: { clienteId: clientZ.id, companyId: compA.id, placa: `Z${SFX}9`.toUpperCase(), marca: 'X', modelo: 'Y', anoFabricacao: 2020, anoModelo: 2020 } });
    const created: { id: string; status: string; kind: string }[] = [];
    // 25 registros: todos os status (inclui o legado "Orçamento") x três combinações de itens
    for (let i = 0; i < 25; i++) {
      const status = i === 24 ? 'Orçamento' : STATUSES[i % STATUSES.length];
      const kind = KINDS[i % KINDS.length];
      const items = kind === 'pecas' ? [{ descricao: 'Peça', quantidade: 1, valorUnitario: 10, valorTotal: 10, tipo: 'Peça', tipoPeca: 'Original' }]
        : kind === 'mao' ? [{ descricao: 'MO', quantidade: 1, valorUnitario: 10, valorTotal: 10, tipo: 'Mão de Obra' }]
        : [{ descricao: 'Peça', quantidade: 1, valorUnitario: 10, valorTotal: 10, tipo: 'Peça', tipoPeca: 'Original' }, { descricao: 'MO', quantidade: 1, valorUnitario: 10, valorTotal: 10, tipo: 'Mão de Obra' }];
      const qz = await db.quote.create({ data: { companyId: compA.id, clientId: clientZ.id, veiculoId: vZ.id, veiculoPlaca: vZ.placa, condicaoPagamento: 'À vista', validade: '7d', subtotal: 10, total: 10, status, updatedAt: new Date(Date.now() - i * 60000), items: { create: items } } });
      created.push({ id: qz.id, status: status === 'Orçamento' ? 'Aguardando Aprovação' : status, kind });
    }
    await http('POST', `/registry/clients/${clientZ.id}/portal-access`, tok(adminA));
    await db.user.updateMany({ where: { clientId: clientZ.id }, data: { mustChangePassword: false } });
    const login = await http('POST', '/auth/portal-login', undefined, { cnpj: clientZ.cnpj, password: '#12345678*' });
    const tz = login.body.token;
    const list = async (qs: string) => {
      const r = await http('GET', `/portal-gestor/ordens-servico${qs}`, tz);
      assert.strictEqual(r.status, 200, r.text);
      return r.body;
    };
    const ids = (arr: any[]) => arr.map(x => x.id).sort();
    const expect = (f: (c: typeof created[number]) => boolean) => created.filter(f).map(c => c.id).sort();
    const hasPecas = (c: any) => c.kind !== 'mao';
    const hasMao = (c: any) => c.kind !== 'pecas';

    // 1) Sem filtros: todos os orçamentos/OS (inclui aguardando aprovação e cancelados), 10 por página
    const all = await list('');
    assert.strictEqual(all.total, 25);
    assert.strictEqual(all.items.length, 10);
    assert.strictEqual(all.pageSize, 10);
    assert.strictEqual(all.totalPages, 3);
    assert.deepStrictEqual(all.statusOptions, STATUSES);
    assert.ok(all.items.some((x: any) => x.aguardandoAprovacao));
    const full = await list('?pageSize=100');
    assert.deepStrictEqual(ids(full.items), expect(() => true));
    // Serviços exibidos conferem com os itens reais
    for (const it of full.items) {
      const c = created.find(cc => cc.id === it.id)!;
      assert.deepStrictEqual(it.servicos, c.kind === 'pecas' ? ['Peças'] : c.kind === 'mao' ? ['Mão de Obra'] : ['Peças', 'Mão de Obra']);
    }

    // 2) e 3) Serviços: Peças e Mão de Obra (OS com os dois tipos aparece nos dois filtros)
    const pecas = await list('?servico=pecas&pageSize=100');
    assert.deepStrictEqual(ids(pecas.items), expect(hasPecas));
    assert.strictEqual(pecas.total, expect(hasPecas).length);
    const mao = await list('?servico=mao-de-obra&pageSize=100');
    assert.deepStrictEqual(ids(mao.items), expect(hasMao));
    const ambos = created.filter(c => c.kind === 'ambos').map(c => c.id);
    assert.ok(ambos.every(id => pecas.items.some((x: any) => x.id === id) && mao.items.some((x: any) => x.id === id)));
    assert.strictEqual((await list('?servico=todos&pageSize=100')).total, 25);

    // 4) Cada status ("Aguardando Aprovação" inclui o status legado "Orçamento")
    for (const st of STATUSES) {
      const r = await list(`?status=${encodeURIComponent(st)}&pageSize=100`);
      assert.deepStrictEqual(ids(r.items), expect(c => c.status === st), st);
      assert.ok(r.items.every((x: any) => st === 'Aguardando Aprovação' ? x.aguardandoAprovacao : x.status === st), st);
    }
    assert.strictEqual((await list('?status=all')).total, 25);

    // 5) Combinação Serviços + Status
    for (const st of STATUSES) {
      const r = await list(`?servico=pecas&status=${encodeURIComponent(st)}&pageSize=100`);
      assert.deepStrictEqual(ids(r.items), expect(c => hasPecas(c) && c.status === st), `pecas+${st}`);
      const r2 = await list(`?servico=mao-de-obra&status=${encodeURIComponent(st)}&pageSize=100`);
      assert.deepStrictEqual(ids(r2.items), expect(c => hasMao(c) && c.status === st), `mao+${st}`);
    }

    // 6) Paginação com filtro ativo: páginas sem repetição, cobrindo todos os registros filtrados
    const p1 = await list('?servico=pecas&pageSize=10&page=1');
    const p2 = await list('?servico=pecas&pageSize=10&page=2');
    assert.strictEqual(p1.total, expect(hasPecas).length);
    assert.strictEqual(p1.totalPages, Math.ceil(p1.total / 10));
    assert.strictEqual(p1.items.length, 10);
    assert.strictEqual(p2.page, 2);
    assert.strictEqual(p2.items.length, p1.total - 10);
    assert.deepStrictEqual([...ids(p1.items), ...ids(p2.items)].sort(), expect(hasPecas));
    assert.strictEqual(new Set([...p1.items, ...p2.items].map((x: any) => x.id)).size, p1.total);
    const beyond = await list('?servico=pecas&pageSize=10&page=99');
    assert.strictEqual(beyond.page, p1.totalPages);
    for (const size of [25, 50, 100]) assert.strictEqual((await list(`?pageSize=${size}`)).pageSize, size);
    assert.strictEqual((await list('?pageSize=7')).pageSize, 10);
    const empty = await list('?servico=pecas&status=Pago&veiculoId=inexistente');
    assert.strictEqual(empty.total, 0);
    assert.strictEqual(empty.items.length, 0);

    // Parâmetros inválidos
    assert.strictEqual((await http('GET', '/portal-gestor/ordens-servico?status=Inventado', tz)).status, 400);
    assert.strictEqual((await http('GET', '/portal-gestor/ordens-servico?servico=xpto', tz)).status, 400);

    // Isolamento: outra empresa não vê nada de Z, com qualquer filtro
    const fromX = await http('GET', '/portal-gestor/ordens-servico?pageSize=100&servico=pecas', tokenX);
    assert.ok(fromX.body.items.every((x: any) => !created.some(c => c.id === x.id)));

    // 7) Painel administrativo: não usa a rota do portal e continua vendo os orçamentos normalmente
    assert.strictEqual((await http('GET', '/portal-gestor/ordens-servico', tok(adminA))).status, 403);
    const adminQuotes = await http('GET', '/quotes', tok(adminA));
    assert.strictEqual(adminQuotes.status, 200);
    assert.ok(created.every(c => adminQuotes.body.some((x: any) => x.id === c.id)));

    await db.quote.deleteMany({ where: { clientId: clientZ.id } });
    await db.vehicle.deleteMany({ where: { clienteId: clientZ.id } });
    await db.user.deleteMany({ where: { clientId: clientZ.id } });
    await db.client.delete({ where: { id: clientZ.id } });
  });
  await test('Cadastro da empresa: atualiza contato, não altera CNPJ nem dados de outra empresa', async () => {
    const r = await http('PUT', '/portal-gestor/empresa', tokenX, { telefone: '11999990000', cnpj: '00000000000000', nome: 'Hack' });
    assert.strictEqual(r.status, 200, r.text);
    const c = await db.client.findUnique({ where: { id: clientX.id } });
    assert.strictEqual(c.telefone, '11999990000');
    assert.strictEqual(c.cnpj, mask(CNPJ_X));
    assert.strictEqual(c.nome, 'Transportes X');
  });

  // ---------------- Motoristas ----------------
  let driverId = '';
  await test('Motoristas: cria vinculado a veículo próprio; veículo de outra empresa é recusado', async () => {
    const bad = await http('POST', '/portal-gestor/motoristas', tokenX, { nome: 'João Silva', cpf: '123.456.789-01', vehicleId: vY.id });
    assert.strictEqual(bad.status, 400);
    const r = await http('POST', '/portal-gestor/motoristas', tokenX, { nome: 'João Silva', cpf: '123.456.789-01', vehicleId: vX.id, validadeCnh: '2026-12-01' });
    assert.strictEqual(r.status, 201, r.text);
    driverId = r.body.id;
    const dup = await http('POST', '/portal-gestor/motoristas', tokenX, { nome: 'João Silva', cpf: '12345678901' });
    assert.strictEqual(dup.status, 409);
  });
  await test('Motoristas: outra empresa não lista, edita nem exclui', async () => {
    const list = await http('GET', '/portal-gestor/motoristas', tokenY);
    assert.ok(!list.body.some((d: any) => d.id === driverId));
    assert.strictEqual((await http('PUT', `/portal-gestor/motoristas/${driverId}`, tokenY, { nome: 'Hack Hack', cpf: '12345678901' })).status, 404);
    assert.strictEqual((await http('DELETE', `/portal-gestor/motoristas/${driverId}`, tokenY)).status, 404);
    const v = await http('GET', `/portal-gestor/veiculos/${vX.id}`, tokenX);
    assert.ok(v.body.infoCadastral.motoristas.some((m: any) => m.id === driverId));
  });

  // ---------------- Banco de dados ----------------
  await test('Banco: trigger impede motorista com veículo de outro cliente', async () => {
    await assert.rejects(db.fleetDriver.create({ data: { companyId: compA.id, clientId: clientX.id, vehicleId: vY.id, nome: 'X', cpf: '99999999999' } }));
  });
  await test('Banco: trigger impede perfil administrativo ou oficina divergente no usuário do portal', async () => {
    const u = await db.user.findFirst({ where: { clientId: clientX.id } });
    await assert.rejects(db.user.update({ where: { id: u.id }, data: { roleAdmin: true } }));
    await assert.rejects(db.user.update({ where: { id: u.id }, data: { companyId: compB.id } }));
  });

  // ---------------- Mesmo CNPJ em duas oficinas / bloqueio ----------------
  await test('Mesmo CNPJ em duas oficinas: login pede seleção da oficina e respeita o escopo', async () => {
    await http('POST', `/registry/clients/${clientXinB.id}/portal-access`, tok(adminB));
    const uB = await db.user.findFirst({ where: { clientId: clientXinB.id } });
    await db.user.update({ where: { id: uB.id }, data: { password: await bcrypt.hash('NovaSenha@2026', 10), mustChangePassword: false } });
    const r = await http('POST', '/auth/portal-login', undefined, { cnpj: CNPJ_X, password: 'NovaSenha@2026' });
    assert.strictEqual(r.status, 409, r.text);
    assert.strictEqual(r.body.oficinas.length, 2);
    const rb = await http('POST', '/auth/portal-login', undefined, { cnpj: CNPJ_X, password: 'NovaSenha@2026', companyId: compB.id });
    assert.strictEqual(rb.status, 200);
    const veic = await http('GET', '/portal-gestor/veiculos', rb.body.token);
    assert.strictEqual(veic.body.length, 0);
    assert.strictEqual((await http('GET', `/portal-gestor/orcamentos/${qXpaid.id}`, rb.body.token)).status, 404);
  });
  await test('Acesso inativado pela oficina bloqueia o token imediatamente', async () => {
    const r = await http('PUT', `/registry/clients/${clientY.id}/portal-access/status`, tok(adminA), { status: 'INATIVO' });
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual((await http('GET', '/portal-gestor/dashboard', tokenY)).status, 403);
  });
  await test('Dashboard do portal responde com dados da empresa', async () => {
    const r = await http('GET', '/portal-gestor/dashboard', tokenX);
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.veiculos.total, 1);
    assert.strictEqual(r.body.motoristas.total, 1);
  });

  // ---------------- Cleanup ----------------
  const companyIds = [compA.id, compB.id];
  const clientIds = [clientX.id, clientY.id, clientXinB.id, clientXdup.id];
  await db.fleetDriver.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.financialReceivable.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.financialPayable.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.quote.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.vehicle.deleteMany({ where: { clienteId: { in: clientIds } } });
  await db.user.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.client.deleteMany({ where: { id: { in: clientIds } } });
  await db.company.deleteMany({ where: { id: { in: companyIds } } });

  server.close();
  await db.$disconnect();

  results.forEach(r => console.log(`${r.ok ? '✔' : '✘'} ${r.name}${r.ok ? '' : `\n    ${r.err}`}`));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch(async e => {
  console.error(e);
  process.exit(1);
});
