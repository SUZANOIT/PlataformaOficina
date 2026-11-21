/**
 * Fluxo de Manutenção (solicitação -> orçamento -> OS) — teste de integração.
 *
 *   PORTAL_GESTOR_TEST_DB=1 DATABASE_URL=postgresql://... npx ts-node --transpile-only src/manutencao/manutencao.flow.test.ts
 */
import assert from 'assert';
import { AddressInfo } from 'net';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

if (process.env.PORTAL_GESTOR_TEST_DB !== '1') {
  console.error('Defina PORTAL_GESTOR_TEST_DB=1 e um DATABASE_URL de teste para executar.');
  process.exit(1);
}
process.env.JWT_SECRET = process.env.JWT_SECRET || 'manutencao-test-secret';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { app } = require('../app');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { basePrisma: db } = require('../lib/prisma');

const SFX = Math.random().toString(36).slice(2, 8);
const rnd = () => String(Math.floor(Math.random() * 9e7) + 1e7);
const CNPJ_X = `${rnd()}000191`.slice(0, 14);
const CNPJ_Y = `${rnd()}000172`.slice(0, 14);
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
  try { await fn(); results.push({ name, ok: true }); } catch (e: any) { results.push({ name, ok: false, err: e?.message || String(e) }); }
}

async function main() {
  const server = app.listen(0);
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const pwd = await bcrypt.hash('x', 4);
  const tok = (u: any) => jwt.sign({ id: u.id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

  // ---------------- Dados ----------------
  const compA = await db.company.create({ data: { razaoSocial: `Oficina A ${SFX}`, cnpj: `MA${SFX}`, cnpjSemMascara: `MA${SFX}` } });
  const compB = await db.company.create({ data: { razaoSocial: `Oficina B ${SFX}`, cnpj: `MB${SFX}`, cnpjSemMascara: `MB${SFX}` } });
  const adminA = await db.user.create({ data: { name: 'Admin A', email: `m.admina.${SFX}@t.local`, password: pwd, roleAdmin: true, companyId: compA.id } });
  const orcA = await db.user.create({ data: { name: 'Orc A', email: `m.orca.${SFX}@t.local`, password: pwd, roleOrcamentista: true, companyId: compA.id } });
  const finA = await db.user.create({ data: { name: 'Fin A', email: `m.fina.${SFX}@t.local`, password: pwd, roleContasPagar: true, companyId: compA.id } });
  const adminB = await db.user.create({ data: { name: 'Admin B', email: `m.adminb.${SFX}@t.local`, password: pwd, roleAdmin: true, companyId: compB.id } });

  const clientX = await db.client.create({ data: { nome: 'Frota X', empresa: 'Frota X LTDA', cnpj: CNPJ_X, companyId: compA.id } });
  const clientY = await db.client.create({ data: { nome: 'Frota Y', empresa: 'Frota Y LTDA', cnpj: CNPJ_Y, companyId: compA.id } });
  const vX = await db.vehicle.create({ data: { clienteId: clientX.id, companyId: compA.id, placa: `MX${SFX}`.toUpperCase().slice(0, 7), marca: 'Volkswagen', modelo: 'Delivery', anoFabricacao: 2022, anoModelo: 2022, kmAtual: 50000 } });
  // KM atual registrada do veículo (a solicitação exige KM ≥ a última registrada)
  const kmDe = async (v: any) => (await db.vehicle.findUnique({ where: { id: v.id } })).kmAtual as number;
  const vY = await db.vehicle.create({ data: { clienteId: clientY.id, companyId: compA.id, placa: `MY${SFX}`.toUpperCase().slice(0, 7), marca: 'Ford', modelo: 'Cargo', anoFabricacao: 2021, anoModelo: 2021 } });
  const gestorX = await db.user.create({ data: { name: 'Gestor X', email: `m.gx.${SFX}@portal.local`, password: pwd, companyId: compA.id, clientId: clientX.id } });
  const gestorY = await db.user.create({ data: { name: 'Gestor Y', email: `m.gy.${SFX}@portal.local`, password: pwd, companyId: compA.id, clientId: clientY.id } });
  const pt = (u: any) => jwt.sign({ id: u.id, portal: true }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  const tX = pt(gestorX), tY = pt(gestorY), tA = tok(adminA), tOrc = tok(orcA), tFin = tok(finA), tB = tok(adminB);

  const notifs = async (token: string, portal: boolean) => (await http('GET', portal ? '/portal-gestor/notificacoes?limit=100' : '/notificacoes-usuario?limit=100', token)).body;

  // Orçamento elaborado pela REGRA EXISTENTE (POST /quotes)
  const criarOrcamento = async (placa: string, cnpj: string, nome: string) => {
    const r = await http('POST', '/quotes', tA, {
      companyId: compA.id,
      client: { nome, cnpj },
      condicaoPagamento: 'À vista', validade: '7 dias', status: 'Aguardando Aprovação',
      veiculoPlaca: placa, veiculoMarca: 'Volkswagen', veiculoModelo: 'Delivery',
      items: [
        { descricao: 'Pastilha de freio', quantidade: 2, valorUnitario: 150, valorTotal: 300, tipo: 'Peça', tipoPeca: 'Original' },
        { descricao: 'Mão de obra freio', quantidade: 1, valorUnitario: 200, valorTotal: 200, tipo: 'Mão de Obra' },
      ],
      subtotal: 500, total: 500,
    });
    assert.strictEqual(r.status, 201, r.text);
    return r.body;
  };

  let sol: any; // solicitação principal

  // 1
  await test('1. Cliente seleciona veículo e solicita orçamento (protocolo, data, status)', async () => {
    assert.strictEqual((await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: '', km: 50000 })).status, 400);
    assert.strictEqual((await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vY.id, descricao: 'Barulho no freio', km: 50000 })).status, 404);
    // KM atual é obrigatória e não pode ser menor que a última registrada
    const semKm = await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Barulho ao frear' });
    assert.strictEqual(semKm.status, 400);
    const kmMenor = await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Barulho ao frear', km: 49999 });
    assert.strictEqual(kmMenor.status, 400);
    assert.strictEqual(kmMenor.body.code, 'KM_MENOR');
    const r = await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Barulho ao frear e pedal baixo', km: 50500 });
    assert.strictEqual(r.status, 201, r.text);
    sol = r.body;
    assert.strictEqual(sol.km, 50500);
    assert.strictEqual(sol.veiculo.kmAtual, 50500, 'KM do veículo deve ser atualizada');
    assert.ok(await db.vehicleEvent.findFirst({ where: { veiculoId: vX.id, tipo: 'KM', km: 50500 } }));
    assert.ok(sol.historico[0].descricao.includes('50.500 km'));
    assert.ok(Number.isInteger(sol.protocolo) && sol.protocolo > 0);
    assert.strictEqual(sol.status, 'AGUARDANDO_ANALISE');
    assert.strictEqual(sol.statusLabel, 'Aguardando Análise da Oficina');
    assert.strictEqual(sol.veiculo.placa, vX.placa);
    assert.strictEqual(sol.cliente.nome, 'Frota X LTDA');
    assert.ok(sol.createdAt);
  });

  // 2
  await test('2. Oficina recebe notificação automática (Admin e Orçamentista; outra oficina não)', async () => {
    for (const t of [tA, tOrc]) {
      const n = await notifs(t, false);
      const item = n.itens.find((i: any) => i.referenciaId === sol.id && i.tipoEvento === 'NOVA_SOLICITACAO');
      assert.ok(item, 'sem notificação');
      assert.strictEqual(item.titulo, 'Novo orçamento recebido');
      for (const part of ['Frota X LTDA', `#${sol.protocolo}`, 'Volkswagen Delivery', vX.placa, 'Barulho ao frear']) assert.ok(item.mensagem.includes(part), part);
      assert.strictEqual(item.urlDestino, `/solicitacoes-orcamento/${sol.id}`);
      assert.ok(n.naoLidas >= 1);
    }
    assert.strictEqual((await notifs(tB, false)).itens.length, 0);
    assert.strictEqual((await notifs(tFin, false)).itens.length, 0);
  });

  // 3
  await test('3. Oficina abre a solicitação (vira "Recebido" e o cliente recebe confirmação)', async () => {
    const list = await http('GET', '/oficina/solicitacoes', tOrc);
    assert.strictEqual(list.status, 200);
    assert.ok(list.body.some((s: any) => s.id === sol.id));
    const d = await http('GET', `/oficina/solicitacoes/${sol.id}`, tA);
    assert.strictEqual(d.status, 200, d.text);
    assert.strictEqual(d.body.status, 'RECEBIDA');
    const nx = await notifs(tX, true);
    assert.ok(nx.itens.some((i: any) => i.referenciaId === sol.id && i.tipoEvento === 'SOLICITACAO_RECEBIDA'));
    assert.strictEqual((await http('GET', `/oficina/solicitacoes/${sol.id}`, tB)).status, 404);
    assert.strictEqual((await http('GET', '/oficina/solicitacoes', tFin)).status, 403);
  });

  let quote: any;
  // 4 e 5
  await test('4/5. Oficina elabora o orçamento pela regra atual e disponibiliza; cliente é notificado', async () => {
    assert.strictEqual((await http('POST', `/oficina/solicitacoes/${sol.id}/em-analise`, tA)).body.status, 'EM_ANALISE');
    quote = await criarOrcamento(vX.placa, CNPJ_X, 'Frota X');
    assert.strictEqual(quote.total, 500);
    assert.strictEqual(quote.clientId, clientX.id);
    // Orçamento de outro cliente não pode ser vinculado
    const qY = await criarOrcamento(vY.placa, CNPJ_Y, 'Frota Y');
    assert.strictEqual((await http('POST', `/oficina/solicitacoes/${sol.id}/vincular`, tA, { quoteId: qY.id })).status, 400);
    const v = await http('POST', `/oficina/solicitacoes/${sol.id}/vincular`, tA, { quoteId: quote.id });
    assert.strictEqual(v.status, 200, v.text);
    assert.strictEqual(v.body.status, 'ORCAMENTO_DISPONIVEL');
    assert.strictEqual(v.body.orcamento.numero, quote.numeroOrcamento);
    const nx = await notifs(tX, true);
    assert.ok(nx.itens.some((i: any) => i.referenciaId === sol.id && i.tipoEvento === 'ORCAMENTO_DISPONIVEL'));
    // O cliente vê os valores pelo fluxo existente
    const q = await http('GET', `/portal-gestor/orcamentos/${quote.id}`, tX);
    assert.strictEqual(q.status, 200);
    assert.strictEqual(q.body.total, 500);
    assert.strictEqual(q.body.aguardandoAprovacao, true);
    // Não gera OS sem aprovação
    assert.strictEqual((await http('POST', `/portal-gestor/solicitacoes/${sol.id}/ordem-servico`, tX, { km: 51000 })).status, 409);
    // Mesmo orçamento não pode ir para outra solicitação
    const s2 = await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Outra solicitação', km: await kmDe(vX) });
    assert.strictEqual((await http('POST', `/oficina/solicitacoes/${s2.body.id}/vincular`, tA, { quoteId: quote.id })).status, 409);
  });

  // 6 e 7
  await test('6/7. Cliente aprova pelo fluxo existente; solicitação "Aprovado" e oficina notificada', async () => {
    const r = await http('POST', `/portal-gestor/orcamentos/${quote.id}/aprovar`, tX);
    assert.strictEqual(r.status, 200, r.text);
    assert.strictEqual(r.body.status, 'Aprovado');
    const d = await http('GET', `/portal-gestor/solicitacoes/${sol.id}`, tX);
    assert.strictEqual(d.body.status, 'APROVADA');
    const na = await notifs(tA, false);
    assert.ok(na.itens.some((i: any) => i.referenciaId === sol.id && i.tipoEvento === 'ORCAMENTO_APROVADO'));
  });

  await test('6b. Cliente recusa outro orçamento; solicitação "Recusado pelo cliente" e oficina notificada', async () => {
    const s = (await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Revisão geral', km: await kmDe(vX) })).body;
    const q = await criarOrcamento(vX.placa, CNPJ_X, 'Frota X');
    await http('POST', `/oficina/solicitacoes/${s.id}/vincular`, tA, { quoteId: q.id });
    const r = await http('POST', `/portal-gestor/orcamentos/${q.id}/recusar`, tX, { motivo: 'Valor acima do previsto' });
    assert.strictEqual(r.status, 200, r.text);
    const d = await http('GET', `/portal-gestor/solicitacoes/${s.id}`, tX);
    assert.strictEqual(d.body.status, 'RECUSADA_CLIENTE');
    assert.strictEqual(d.body.motivoRecusa, 'Valor acima do previsto');
    const na = await notifs(tOrc, false);
    assert.ok(na.itens.some((i: any) => i.referenciaId === s.id && i.tipoEvento === 'ORCAMENTO_RECUSADO_CLIENTE' && i.mensagem.includes('Valor acima')));
  });

  await test('6c. Oficina recusa a solicitação com motivo; cliente notificado; não pode recusar de novo', async () => {
    const s = (await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Pintura', km: await kmDe(vX) })).body;
    assert.strictEqual((await http('POST', `/oficina/solicitacoes/${s.id}/recusar`, tA, {})).status, 400);
    const r = await http('POST', `/oficina/solicitacoes/${s.id}/recusar`, tA, { motivo: 'Não realizamos pintura' });
    assert.strictEqual(r.body.status, 'RECUSADA_OFICINA');
    assert.ok((await notifs(tX, true)).itens.some((i: any) => i.referenciaId === s.id && i.tipoEvento === 'SOLICITACAO_RECUSADA_OFICINA' && i.mensagem.includes('pintura')));
    assert.strictEqual((await http('POST', `/oficina/solicitacoes/${s.id}/recusar`, tA, { motivo: 'de novo' })).status, 409);
  });

  // 8, 9 e 10
  let osNumero = 0;
  await test('8/9. Cliente informa KM e gera a OS vinculada ao orçamento (KM do veículo atualizado)', async () => {
    assert.strictEqual((await http('POST', `/portal-gestor/solicitacoes/${sol.id}/ordem-servico`, tX, {})).status, 400);
    const menor = await http('POST', `/portal-gestor/solicitacoes/${sol.id}/ordem-servico`, tX, { km: 40000 });
    assert.strictEqual(menor.status, 400);
    assert.strictEqual(menor.body.code, 'KM_MENOR');
    const r = await http('POST', `/portal-gestor/solicitacoes/${sol.id}/ordem-servico`, tX, { km: 51234 });
    assert.strictEqual(r.status, 201, r.text);
    assert.strictEqual(r.body.status, 'OS_GERADA');
    assert.strictEqual(r.body.ordemServico.km, 51234);
    osNumero = r.body.ordemServico.numero;
    const os = await db.ordemServico.findUnique({ where: { quoteId: quote.id } });
    assert.ok(os && os.vehicleId === vX.id && os.clientId === clientX.id && os.companyId === compA.id);
    assert.strictEqual((await db.vehicle.findUnique({ where: { id: vX.id } })).kmAtual, 51234);
    assert.ok(await db.vehicleEvent.findFirst({ where: { veiculoId: vX.id, tipo: 'KM', km: 51234 } }));
    for (const [t, portal] of [[tA, false], [tX, true]] as const) {
      assert.ok((await notifs(t, portal)).itens.some((i: any) => i.referenciaId === sol.id && i.tipoEvento === 'OS_GERADA'));
    }
    // Status e valores do orçamento continuam os da regra existente
    const q = await db.quote.findUnique({ where: { id: quote.id } });
    assert.strictEqual(q.status, 'Aprovado');
    assert.strictEqual(q.total, 500);
  });

  await test('10. Sistema impede OS duplicada (inclusive em requisições simultâneas)', async () => {
    const again = await http('POST', `/portal-gestor/solicitacoes/${sol.id}/ordem-servico`, tX, { km: 52000 });
    assert.strictEqual(again.status, 409);
    assert.ok(String(again.body.error).includes(String(osNumero)));
    // Corrida: duas gerações ao mesmo tempo para outro orçamento aprovado
    const s = (await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Troca de óleo', km: await kmDe(vX) })).body;
    const q = await criarOrcamento(vX.placa, CNPJ_X, 'Frota X');
    await http('POST', `/oficina/solicitacoes/${s.id}/vincular`, tA, { quoteId: q.id });
    await http('POST', `/portal-gestor/orcamentos/${q.id}/aprovar`, tX);
    const [r1, r2] = await Promise.all([
      http('POST', `/portal-gestor/solicitacoes/${s.id}/ordem-servico`, tX, { km: 52000 }),
      http('POST', `/portal-gestor/solicitacoes/${s.id}/ordem-servico`, tX, { km: 52000 }),
    ]);
    assert.deepStrictEqual([r1.status, r2.status].sort(), [201, 409]);
    assert.strictEqual(await db.ordemServico.count({ where: { quoteId: q.id } }), 1);
  });

  // 11
  await test('11. Histórico registra todas as movimentações (data, responsável, de/para, descrição)', async () => {
    const d = await http('GET', `/portal-gestor/solicitacoes/${sol.id}`, tX);
    const steps = d.body.historico.map((h: any) => `${h.statusAnterior || '-'}>${h.statusNovo}`);
    assert.deepStrictEqual(steps, [
      '->AGUARDANDO_ANALISE',
      'AGUARDANDO_ANALISE>RECEBIDA',
      'RECEBIDA>EM_ANALISE',
      'EM_ANALISE>ORCAMENTO_DISPONIVEL',
      'ORCAMENTO_DISPONIVEL>APROVADA',
      'APROVADA>OS_GERADA',
    ]);
    for (const h of d.body.historico) assert.ok(h.createdAt && h.responsavel && h.descricao && h.statusNovoLabel);
    assert.deepStrictEqual(d.body.historico.map((h: any) => h.perfil), ['CLIENTE', 'OFICINA', 'OFICINA', 'OFICINA', 'CLIENTE', 'CLIENTE']);
  });

  // 12
  await test('12. Ninguém acessa dados de outro cliente ou de outra oficina', async () => {
    assert.strictEqual((await http('GET', `/portal-gestor/solicitacoes/${sol.id}`, tY)).status, 404);
    assert.strictEqual((await http('POST', `/portal-gestor/solicitacoes/${sol.id}/ordem-servico`, tY, { km: 99999 })).status, 404);
    assert.ok(!(await http('GET', '/portal-gestor/solicitacoes', tY)).text.includes(sol.id));
    assert.ok(!(await http('GET', '/oficina/solicitacoes', tB)).text.includes(sol.id));
    for (const p of [`/oficina/solicitacoes/${sol.id}/em-analise`, `/oficina/solicitacoes/${sol.id}/recusar`]) {
      assert.strictEqual((await http('POST', p, tB, { motivo: 'xxx' })).status, 404, p);
    }
    // Notificação de X não pode ser lida/marcada por Y nem pela oficina B
    const nx = (await notifs(tX, true)).itens[0];
    assert.strictEqual((await http('POST', `/portal-gestor/notificacoes/${nx.id}/lida`, tY)).status, 404);
    assert.strictEqual((await http('POST', `/notificacoes-usuario/${nx.id}/lida`, tB)).status, 404);
    assert.ok(!(await notifs(tY, true)).itens.some((i: any) => i.referenciaId === sol.id));
    // Cliente não usa rotas da oficina e oficina não usa rotas do portal
    assert.strictEqual((await http('GET', '/oficina/solicitacoes', tX)).status, 403);
    assert.strictEqual((await http('GET', '/portal-gestor/solicitacoes', tA)).status, 403);
  });

  await test('Notificações: marcar como lida, marcar todas e contador', async () => {
    const before = await notifs(tX, true);
    assert.ok(before.naoLidas > 0);
    const first = before.itens.find((i: any) => !i.lida);
    assert.strictEqual((await http('POST', `/portal-gestor/notificacoes/${first.id}/lida`, tX)).status, 204);
    const mid = await notifs(tX, true);
    assert.strictEqual(mid.naoLidas, before.naoLidas - 1);
    assert.ok(mid.itens.find((i: any) => i.id === first.id).lida);
    const all = await http('POST', '/portal-gestor/notificacoes/lidas', tX);
    assert.strictEqual(all.body.atualizadas, before.naoLidas - 1);
    const after = await notifs(tX, true);
    assert.strictEqual(after.naoLidas, 0);
    assert.strictEqual(after.itens.length, before.itens.length, 'histórico mantido');
    assert.strictEqual((await http('POST', '/notificacoes-usuario/lidas', tA)).status, 200);
    assert.strictEqual((await notifs(tA, false)).naoLidas, 0);
  });

  await test('Oficina altera o orçamento pela tela existente: solicitação acompanha (aprovado / removido)', async () => {
    const s = (await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Alinhamento', km: await kmDe(vX) })).body;
    const q = await criarOrcamento(vX.placa, CNPJ_X, 'Frota X');
    await http('POST', `/oficina/solicitacoes/${s.id}/vincular`, tA, { quoteId: q.id });
    await db.quote.update({ where: { id: q.id }, data: { status: 'Aprovado' } });
    assert.strictEqual((await http('GET', `/portal-gestor/solicitacoes/${s.id}`, tX)).body.status, 'APROVADA');
    const s2 = (await http('POST', '/portal-gestor/solicitacoes', tX, { vehicleId: vX.id, descricao: 'Suspensão', km: await kmDe(vX) })).body;
    const q2 = await criarOrcamento(vX.placa, CNPJ_X, 'Frota X');
    await http('POST', `/oficina/solicitacoes/${s2.id}/vincular`, tA, { quoteId: q2.id });
    assert.strictEqual((await http('DELETE', `/quotes/${q2.id}`, tA)).status, 204);
    const after = await http('GET', `/portal-gestor/solicitacoes/${s2.id}`, tX);
    assert.strictEqual(after.body.status, 'EM_ANALISE');
    assert.strictEqual(after.body.orcamento, null);
  });

  // ---------------- Limpeza ----------------
  const companyIds = [compA.id, compB.id];
  await db.portalNotificacao.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.ordemServico.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.solicitacaoOrcamento.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.financialReceivable.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.quote.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.vehicle.deleteMany({ where: { clienteId: { in: [clientX.id, clientY.id] } } });
  await db.user.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.client.deleteMany({ where: { companyId: { in: companyIds } } });
  await db.company.deleteMany({ where: { id: { in: companyIds } } });
  server.close();
  await db.$disconnect();

  results.forEach(r => console.log(`${r.ok ? '✔' : '✘'} ${r.name}${r.ok ? '' : `\n    ${r.err}`}`));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} testes passaram`);
  process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
