/**
 * Fluxo de Manutenção do Portal do Gestor de Frota.
 *
 *   1. Cliente envia uma solicitação de orçamento (veículo + descrição).
 *   2. Oficina recebe, analisa e elabora o orçamento na tela de orçamento já
 *      existente (Quote). O orçamento é vinculado à solicitação e fica
 *      disponível para o cliente, que aprova ou recusa pelo fluxo existente.
 *   3. Após a aprovação, o cliente informa a quilometragem e gera a OS
 *      (uma única OS por orçamento).
 *
 * Não altera regras de orçamento: cálculos, status e recebíveis continuam no
 * QuoteController / aprovação do portal. Este serviço só acompanha o processo,
 * registra o histórico e gera as notificações (tabela portal_notificacoes).
 */
import { Prisma } from '@prisma/client';
import { basePrisma } from '../lib/prisma';
import { isPendingQuoteStatus } from '../utils/quoteReceivables.helper';
import { isServiceOrderStatus } from '../portalGestor/portalGestor.financials';

export const SOLICITACAO_STATUS = {
  AGUARDANDO_ANALISE: 'Aguardando Análise da Oficina',
  RECEBIDA: 'Recebido pela oficina',
  EM_ANALISE: 'Em análise',
  ORCAMENTO_DISPONIVEL: 'Orçamento disponível',
  APROVADA: 'Aprovado pelo cliente',
  RECUSADA_OFICINA: 'Recusado pela oficina',
  RECUSADA_CLIENTE: 'Recusado pelo cliente',
  OS_GERADA: 'Ordem de Serviço gerada',
} as const;
export type SolicitacaoStatus = keyof typeof SOLICITACAO_STATUS;

/** Status em que a oficina ainda pode agir (receber, analisar, recusar, vincular orçamento). */
export const OFICINA_ABERTA: SolicitacaoStatus[] = ['AGUARDANDO_ANALISE', 'RECEBIDA', 'EM_ANALISE'];

export const NOTIFICACAO_MODULO = 'MANUTENCAO';

export interface Actor {
  userId?: string | null;
  nome: string;
  perfil: 'CLIENTE' | 'OFICINA' | 'SISTEMA';
}

export class FlowError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient | typeof basePrisma;

const solicitacaoInclude = {
  client: { select: { id: true, nome: true, empresa: true, cnpj: true } },
  vehicle: { select: { id: true, placa: true, marca: true, modelo: true, kmAtual: true } },
  quote: { select: { id: true, numeroOrcamento: true, status: true, total: true, createdAt: true, updatedAt: true } },
  historico: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.SolicitacaoOrcamentoInclude;

export type SolicitacaoFull = Prisma.SolicitacaoOrcamentoGetPayload<{ include: typeof solicitacaoInclude }>;

// ---------------------------------------------------------------------------
// Histórico e notificações
// ---------------------------------------------------------------------------

async function addHistory(tx: Tx, solicitacaoId: string, actor: Actor, de: string | null, para: string, descricao: string) {
  await tx.solicitacaoHistorico.create({
    data: {
      solicitacaoId,
      usuarioId: actor.userId || null,
      responsavel: actor.nome,
      perfil: actor.perfil,
      statusAnterior: de,
      statusNovo: para,
      descricao,
    },
  });
}

/** Usuários da oficina que recebem os avisos: Administrador ou Orçamentista ativos. */
async function oficinaRecipients(tx: Tx, companyId: string) {
  const users = await tx.user.findMany({
    where: { companyId, clientId: null, status: 'ATIVO', OR: [{ roleAdmin: true }, { roleOrcamentista: true }] },
    select: { id: true },
  });
  return users.map(u => u.id);
}

/** Usuários do portal do cliente (gestores de frota da empresa). */
async function clienteRecipients(tx: Tx, companyId: string, clientId: string) {
  const users = await tx.user.findMany({ where: { companyId, clientId, status: 'ATIVO' }, select: { id: true } });
  return users.map(u => u.id);
}

async function notify(tx: Tx, params: {
  userIds: string[]; companyId: string; solicitacaoId: string; tipoEvento: string;
  titulo: string; mensagem: string; urlDestino: string; cor?: string; createdById?: string | null;
}) {
  if (params.userIds.length === 0) return;
  await tx.portalNotificacao.createMany({
    data: params.userIds.map(usuarioId => ({
      usuarioId,
      companyId: params.companyId,
      referenciaId: params.solicitacaoId,
      modulo: NOTIFICACAO_MODULO,
      tipoEvento: params.tipoEvento,
      titulo: params.titulo,
      mensagem: params.mensagem,
      urlDestino: params.urlDestino,
      cor: params.cor || null,
      createdById: params.createdById || null,
    })),
  });
}

const veiculoTexto = (v: { marca: string; modelo: string; placa: string }) => `${v.marca} ${v.modelo} · Placa ${v.placa}`;
const clienteNome = (c: { empresa: string | null; nome: string }) => c.empresa || c.nome;
const urlOficina = (id: string) => `/solicitacoes-orcamento/${id}`;
const urlCliente = (id: string) => `/portal/manutencao?solicitacao=${id}`;

async function notifyOficina(tx: Tx, s: SolicitacaoFull, tipoEvento: string, titulo: string, linhas: string[], actor: Actor, cor?: string) {
  await notify(tx, {
    userIds: await oficinaRecipients(tx, s.companyId),
    companyId: s.companyId, solicitacaoId: s.id, tipoEvento, titulo, cor,
    mensagem: [`Cliente: ${clienteNome(s.client)}`, `Solicitação: #${s.protocolo}`, `Veículo: ${veiculoTexto(s.vehicle)}`, ...linhas].join('\n'),
    urlDestino: urlOficina(s.id), createdById: actor.userId,
  });
}

async function notifyCliente(tx: Tx, s: SolicitacaoFull, tipoEvento: string, titulo: string, linhas: string[], actor: Actor, cor?: string) {
  await notify(tx, {
    userIds: await clienteRecipients(tx, s.companyId, s.clientId),
    companyId: s.companyId, solicitacaoId: s.id, tipoEvento, titulo, cor,
    mensagem: [`Solicitação: #${s.protocolo}`, `Veículo: ${veiculoTexto(s.vehicle)}`, ...linhas].join('\n'),
    urlDestino: urlCliente(s.id), createdById: actor.userId,
  });
}

// ---------------------------------------------------------------------------
// Transições
// ---------------------------------------------------------------------------

/** Troca de status condicional (evita corrida entre ações simultâneas). */
async function transition(tx: Tx, s: SolicitacaoFull, de: SolicitacaoStatus[], para: SolicitacaoStatus, data: Prisma.SolicitacaoOrcamentoUncheckedUpdateManyInput = {}) {
  const r = await tx.solicitacaoOrcamento.updateMany({
    where: { id: s.id, status: { in: de } },
    data: { ...data, status: para },
  });
  if (r.count !== 1) {
    throw new FlowError(409, `Esta solicitação não pode ser alterada no status atual (${SOLICITACAO_STATUS[s.status as SolicitacaoStatus] || s.status}).`, 'INVALID_STATUS');
  }
}

async function reload(tx: Tx, id: string) {
  return tx.solicitacaoOrcamento.findUniqueOrThrow({ where: { id }, include: solicitacaoInclude }) as Promise<SolicitacaoFull>;
}

/**
 * Mantém a solicitação coerente com o orçamento vinculado quando a oficina
 * altera o orçamento pela tela existente (aprovação registrada pela oficina,
 * cancelamento ou exclusão do orçamento).
 */
export async function syncWithQuote(s: SolicitacaoFull): Promise<SolicitacaoFull> {
  if (s.status !== 'ORCAMENTO_DISPONIVEL') return s;
  const sistema: Actor = { nome: 'Sistema', perfil: 'SISTEMA' };
  if (!s.quote) {
    await basePrisma.$transaction(async tx => {
      await transition(tx, s, ['ORCAMENTO_DISPONIVEL'], 'EM_ANALISE');
      await addHistory(tx, s.id, sistema, 'ORCAMENTO_DISPONIVEL', 'EM_ANALISE', 'O orçamento vinculado foi removido pela oficina; solicitação voltou para análise.');
    }).catch(() => undefined);
    return reload(basePrisma, s.id);
  }
  if (isServiceOrderStatus(s.quote.status)) {
    await basePrisma.$transaction(async tx => {
      await transition(tx, s, ['ORCAMENTO_DISPONIVEL'], 'APROVADA');
      await addHistory(tx, s.id, sistema, 'ORCAMENTO_DISPONIVEL', 'APROVADA', `Orçamento #${s.quote!.numeroOrcamento} aprovado (status "${s.quote!.status}" registrado pela oficina).`);
    }).catch(() => undefined);
    return reload(basePrisma, s.id);
  }
  if (s.quote.status === 'Cancelado') {
    await basePrisma.$transaction(async tx => {
      await transition(tx, s, ['ORCAMENTO_DISPONIVEL'], 'RECUSADA_OFICINA', { motivoRecusa: 'Orçamento cancelado pela oficina.' });
      await addHistory(tx, s.id, sistema, 'ORCAMENTO_DISPONIVEL', 'RECUSADA_OFICINA', `Orçamento #${s.quote!.numeroOrcamento} cancelado pela oficina.`);
    }).catch(() => undefined);
    return reload(basePrisma, s.id);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------------

export interface ClientScope { userId: string; companyId: string; clientId: string }

export async function criarSolicitacao(scope: ClientScope, actor: Actor, input: { vehicleId: string; descricao: string }) {
  const vehicle = await basePrisma.vehicle.findFirst({
    where: { id: input.vehicleId, clienteId: scope.clientId, client: { companyId: scope.companyId } },
  });
  if (!vehicle) throw new FlowError(404, 'Veículo não encontrado para a sua empresa.');

  return basePrisma.$transaction(async tx => {
    const created = await tx.solicitacaoOrcamento.create({
      data: {
        companyId: scope.companyId, clientId: scope.clientId, vehicleId: vehicle.id,
        solicitanteId: scope.userId, descricao: input.descricao, status: 'AGUARDANDO_ANALISE',
      },
    });
    const s = await reload(tx, created.id);
    await addHistory(tx, s.id, actor, null, 'AGUARDANDO_ANALISE', 'Solicitação de orçamento enviada à oficina.');
    await notifyOficina(tx, s, 'NOVA_SOLICITACAO', 'Novo orçamento recebido', [`Problema: ${s.descricao}`], actor, 'primary');
    return reload(tx, s.id);
  });
}

export async function listarSolicitacoesCliente(scope: ClientScope) {
  const list = await basePrisma.solicitacaoOrcamento.findMany({
    where: { companyId: scope.companyId, clientId: scope.clientId },
    include: solicitacaoInclude,
    orderBy: { createdAt: 'desc' },
  }) as SolicitacaoFull[];
  return Promise.all(list.map(syncWithQuote));
}

export async function getSolicitacaoCliente(scope: ClientScope, id: string) {
  const s = await basePrisma.solicitacaoOrcamento.findFirst({
    where: { id, companyId: scope.companyId, clientId: scope.clientId },
    include: solicitacaoInclude,
  }) as SolicitacaoFull | null;
  if (!s) throw new FlowError(404, 'Solicitação não encontrada.');
  return syncWithQuote(s);
}

/** Gera a OS do orçamento aprovado: valida aprovação e KM, registra KM do veículo e notifica. */
export async function gerarOrdemServico(scope: ClientScope, actor: Actor, id: string, km: number) {
  const s = await getSolicitacaoCliente(scope, id);
  const existing = s.quoteId ? await basePrisma.ordemServico.findUnique({ where: { quoteId: s.quoteId } }) : null;
  if (existing || s.status === 'OS_GERADA') {
    throw new FlowError(409, `A Ordem de Serviço deste orçamento já foi gerada${existing ? ` (OS nº ${existing.numero})` : ''}.`, 'OS_DUPLICADA');
  }
  if (s.status !== 'APROVADA' || !s.quote || !isServiceOrderStatus(s.quote.status)) {
    throw new FlowError(409, 'A Ordem de Serviço só pode ser gerada depois que o orçamento for aprovado.', 'NOT_APPROVED');
  }
  if (!Number.isInteger(km) || km <= 0) throw new FlowError(400, 'Informe a quilometragem atual do veículo (número inteiro maior que zero).');
  if (km < s.vehicle.kmAtual) {
    throw new FlowError(400, `A quilometragem informada (${km.toLocaleString('pt-BR')} km) é menor que a última registrada para o veículo (${s.vehicle.kmAtual.toLocaleString('pt-BR')} km).`, 'KM_MENOR');
  }

  try {
    return await basePrisma.$transaction(async tx => {
      const os = await tx.ordemServico.create({
        data: {
          quoteId: s.quote!.id, companyId: s.companyId, clientId: s.clientId, vehicleId: s.vehicleId,
          km, geradaPorId: scope.userId,
        },
      });
      await tx.vehicle.update({ where: { id: s.vehicleId }, data: { kmAtual: km } });
      await tx.vehicleEvent.create({
        data: { veiculoId: s.vehicleId, tipo: 'KM', data: new Date(), km, descricao: `KM informado na geração da OS nº ${os.numero} (orçamento #${s.quote!.numeroOrcamento})` },
      });
      await transition(tx, s, ['APROVADA'], 'OS_GERADA');
      await addHistory(tx, s.id, actor, 'APROVADA', 'OS_GERADA', `Ordem de Serviço nº ${os.numero} gerada com ${km.toLocaleString('pt-BR')} km.`);
      const linhas = [`Orçamento: #${s.quote!.numeroOrcamento}`, `OS: nº ${os.numero}`, `Quilometragem: ${km.toLocaleString('pt-BR')} km`];
      await notifyOficina(tx, s, 'OS_GERADA', 'Nova Ordem de Serviço gerada', linhas, actor, 'success');
      await notifyCliente(tx, s, 'OS_GERADA', 'Ordem de Serviço gerada', linhas, actor, 'success');
      return { os, solicitacao: await reload(tx, s.id) };
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new FlowError(409, 'A Ordem de Serviço deste orçamento já foi gerada.', 'OS_DUPLICADA');
    }
    throw e;
  }
}

/**
 * Chamado pela aprovação/recusa do orçamento no portal (fluxo existente):
 * atualiza a solicitação vinculada (se houver), registra o histórico e avisa a oficina.
 */
export async function onClienteDecidiuOrcamento(quoteId: string, decisao: 'APROVADA' | 'RECUSADA_CLIENTE', actor: Actor, motivo?: string) {
  const found = await basePrisma.solicitacaoOrcamento.findUnique({ where: { quoteId }, include: solicitacaoInclude }) as SolicitacaoFull | null;
  if (!found || found.status !== 'ORCAMENTO_DISPONIVEL') return;
  await basePrisma.$transaction(async tx => {
    await transition(tx, found, ['ORCAMENTO_DISPONIVEL'], decisao, decisao === 'RECUSADA_CLIENTE' ? { motivoRecusa: motivo || null } : {});
    const num = found.quote ? `#${found.quote.numeroOrcamento}` : '';
    if (decisao === 'APROVADA') {
      await addHistory(tx, found.id, actor, 'ORCAMENTO_DISPONIVEL', 'APROVADA', `Orçamento ${num} aprovado pelo cliente.`);
      await notifyOficina(tx, found, 'ORCAMENTO_APROVADO', 'Orçamento aprovado pelo cliente', [`Orçamento: ${num}`], actor, 'success');
    } else {
      await addHistory(tx, found.id, actor, 'ORCAMENTO_DISPONIVEL', 'RECUSADA_CLIENTE', `Orçamento ${num} recusado pelo cliente.${motivo ? ` Motivo: ${motivo}` : ''}`);
      await notifyOficina(tx, found, 'ORCAMENTO_RECUSADO_CLIENTE', 'Orçamento recusado pelo cliente', [`Orçamento: ${num}`, ...(motivo ? [`Motivo: ${motivo}`] : [])], actor, 'danger');
    }
  });
}

// ---------------------------------------------------------------------------
// Oficina
// ---------------------------------------------------------------------------

export async function listarSolicitacoesOficina(companyId: string, filtros: { status?: string } = {}) {
  const list = await basePrisma.solicitacaoOrcamento.findMany({
    where: { companyId, ...(filtros.status ? { status: filtros.status } : {}) },
    include: solicitacaoInclude,
    orderBy: { createdAt: 'desc' },
  }) as SolicitacaoFull[];
  return Promise.all(list.map(syncWithQuote));
}

async function getOficina(companyId: string, id: string) {
  const s = await basePrisma.solicitacaoOrcamento.findFirst({ where: { id, companyId }, include: solicitacaoInclude }) as SolicitacaoFull | null;
  if (!s) throw new FlowError(404, 'Solicitação não encontrada.');
  return syncWithQuote(s);
}

/** Abre a solicitação; na primeira abertura marca como recebida e confirma ao cliente. */
export async function abrirSolicitacaoOficina(companyId: string, actor: Actor, id: string) {
  const s = await getOficina(companyId, id);
  if (s.status !== 'AGUARDANDO_ANALISE') return s;
  return basePrisma.$transaction(async tx => {
    await transition(tx, s, ['AGUARDANDO_ANALISE'], 'RECEBIDA');
    await addHistory(tx, s.id, actor, 'AGUARDANDO_ANALISE', 'RECEBIDA', 'Solicitação recebida pela oficina.');
    await notifyCliente(tx, s, 'SOLICITACAO_RECEBIDA', 'Solicitação recebida pela oficina', ['A oficina recebeu sua solicitação e vai elaborar o orçamento.'], actor);
    return reload(tx, s.id);
  });
}

export async function marcarEmAnalise(companyId: string, actor: Actor, id: string) {
  const s = await getOficina(companyId, id);
  return basePrisma.$transaction(async tx => {
    await transition(tx, s, ['AGUARDANDO_ANALISE', 'RECEBIDA'], 'EM_ANALISE');
    await addHistory(tx, s.id, actor, s.status, 'EM_ANALISE', 'Solicitação em análise pela oficina.');
    return reload(tx, s.id);
  });
}

export async function recusarPelaOficina(companyId: string, actor: Actor, id: string, motivo: string) {
  const s = await getOficina(companyId, id);
  return basePrisma.$transaction(async tx => {
    await transition(tx, s, OFICINA_ABERTA, 'RECUSADA_OFICINA', { motivoRecusa: motivo });
    await addHistory(tx, s.id, actor, s.status, 'RECUSADA_OFICINA', `Solicitação recusada pela oficina. Motivo: ${motivo}`);
    await notifyCliente(tx, s, 'SOLICITACAO_RECUSADA_OFICINA', 'Solicitação recusada pela oficina', [`Motivo: ${motivo}`], actor, 'danger');
    return reload(tx, s.id);
  });
}

/**
 * Vincula um orçamento elaborado na tela existente à solicitação e o
 * disponibiliza ao cliente. O orçamento deve ser da oficina, do mesmo cliente
 * e veículo, estar aguardando aprovação e não estar ligado a outra solicitação.
 */
export async function vincularOrcamento(companyId: string, actor: Actor, id: string, quoteId: string) {
  const s = await getOficina(companyId, id);
  const quote = await basePrisma.quote.findFirst({ where: { id: quoteId, companyId } });
  if (!quote) throw new FlowError(404, 'Orçamento não encontrado nesta oficina.');
  if (quote.clientId !== s.clientId) throw new FlowError(400, 'O orçamento é de outro cliente.');
  if (quote.veiculoId !== s.vehicleId && (quote.veiculoPlaca || '').toUpperCase().replace(/[\s-]/g, '') !== s.vehicle.placa) {
    throw new FlowError(400, 'O orçamento é de outro veículo.');
  }
  if (!isPendingQuoteStatus(quote.status)) throw new FlowError(400, `O orçamento precisa estar aguardando aprovação (status atual: ${quote.status}).`);
  const other = await basePrisma.solicitacaoOrcamento.findUnique({ where: { quoteId } });
  if (other && other.id !== s.id) throw new FlowError(409, `Este orçamento já está vinculado à solicitação #${other.protocolo}.`);

  try {
    return await basePrisma.$transaction(async tx => {
      await transition(tx, s, OFICINA_ABERTA, 'ORCAMENTO_DISPONIVEL', { quoteId });
      await addHistory(tx, s.id, actor, s.status, 'ORCAMENTO_DISPONIVEL', `Orçamento #${quote.numeroOrcamento} elaborado e disponibilizado ao cliente.`);
      await notifyCliente(tx, s, 'ORCAMENTO_DISPONIVEL', 'Orçamento disponível para análise', [`Orçamento: #${quote.numeroOrcamento}`, 'Acesse para visualizar os valores e aprovar ou recusar.'], actor, 'primary');
      return reload(tx, s.id);
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new FlowError(409, 'Este orçamento já está vinculado a outra solicitação.');
    }
    throw e;
  }
}

// ---------------------------------------------------------------------------
// Notificações (os dois perfis)
// ---------------------------------------------------------------------------

export async function listarNotificacoes(userId: string, companyId: string, opts: { limit?: number; apenasNaoLidas?: boolean } = {}) {
  const where: Prisma.PortalNotificacaoWhereInput = { usuarioId: userId, companyId, modulo: NOTIFICACAO_MODULO, ...(opts.apenasNaoLidas ? { lida: false } : {}) };
  const [itens, naoLidas] = await Promise.all([
    basePrisma.portalNotificacao.findMany({
      where, orderBy: { createdAt: 'desc' }, take: Math.min(Math.max(opts.limit || 30, 1), 100),
      select: { id: true, tipoEvento: true, titulo: true, mensagem: true, urlDestino: true, cor: true, lida: true, dataLeitura: true, referenciaId: true, createdAt: true },
    }),
    basePrisma.portalNotificacao.count({ where: { usuarioId: userId, companyId, modulo: NOTIFICACAO_MODULO, lida: false } }),
  ]);
  return { itens, naoLidas };
}

export async function marcarNotificacaoLida(userId: string, companyId: string, id: string) {
  const r = await basePrisma.portalNotificacao.updateMany({
    where: { id, usuarioId: userId, companyId, modulo: NOTIFICACAO_MODULO, lida: false },
    data: { lida: true, dataLeitura: new Date() },
  });
  if (r.count === 0) {
    const exists = await basePrisma.portalNotificacao.count({ where: { id, usuarioId: userId, companyId } });
    if (!exists) throw new FlowError(404, 'Notificação não encontrada.');
  }
}

export async function marcarTodasLidas(userId: string, companyId: string) {
  const r = await basePrisma.portalNotificacao.updateMany({
    where: { usuarioId: userId, companyId, modulo: NOTIFICACAO_MODULO, lida: false },
    data: { lida: true, dataLeitura: new Date() },
  });
  return r.count;
}

/** Resposta pública da solicitação (sem dados internos da oficina). */
export function toView(s: SolicitacaoFull, os?: { numero: number; km: number; createdAt: Date } | null) {
  return {
    id: s.id,
    protocolo: s.protocolo,
    status: s.status,
    statusLabel: SOLICITACAO_STATUS[s.status as SolicitacaoStatus] || s.status,
    descricao: s.descricao,
    motivoRecusa: s.motivoRecusa,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    cliente: { id: s.client.id, nome: clienteNome(s.client), cnpj: s.client.cnpj },
    veiculo: { id: s.vehicle.id, placa: s.vehicle.placa, marca: s.vehicle.marca, modelo: s.vehicle.modelo, kmAtual: s.vehicle.kmAtual },
    orcamento: s.quote ? { id: s.quote.id, numero: s.quote.numeroOrcamento, status: s.quote.status, total: s.quote.total } : null,
    ordemServico: os ? { numero: os.numero, km: os.km, createdAt: os.createdAt } : null,
    historico: s.historico.map(h => ({
      id: h.id, createdAt: h.createdAt, responsavel: h.responsavel, perfil: h.perfil,
      statusAnterior: h.statusAnterior, statusAnteriorLabel: h.statusAnterior ? (SOLICITACAO_STATUS[h.statusAnterior as SolicitacaoStatus] || h.statusAnterior) : null,
      statusNovo: h.statusNovo, statusNovoLabel: SOLICITACAO_STATUS[h.statusNovo as SolicitacaoStatus] || h.statusNovo,
      descricao: h.descricao,
    })),
  };
}

export async function withOs(list: SolicitacaoFull[]) {
  const quoteIds = list.map(s => s.quoteId).filter(Boolean) as string[];
  const oss = quoteIds.length ? await basePrisma.ordemServico.findMany({ where: { quoteId: { in: quoteIds } } }) : [];
  const byQuote = new Map(oss.map(o => [o.quoteId, o]));
  return list.map(s => toView(s, s.quoteId ? byQuote.get(s.quoteId) || null : null));
}
