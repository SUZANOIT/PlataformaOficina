import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, FilePlus2, Inbox, Loader2, Search, Send, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import {
  SolicitacaoHistorico, SolicitacaoStatusBadge, SolicitacaoTimeline, formatBRL, formatDateTime, type Solicitacao,
} from '../../components/manutencao/SolicitacaoShared';

/**
 * Oficina — solicitações de orçamento enviadas pelos clientes no Portal do
 * Gestor de Frota. O orçamento é elaborado na tela de orçamento existente
 * (/quotes/new?solicitacao=...) e vinculado à solicitação ao salvar.
 */

const STATUS_FILTERS = [
  { value: '', label: 'Todas' },
  { value: 'AGUARDANDO_ANALISE', label: 'Aguardando Análise da Oficina' },
  { value: 'RECEBIDA', label: 'Recebido pela oficina' },
  { value: 'EM_ANALISE', label: 'Em análise' },
  { value: 'ORCAMENTO_DISPONIVEL', label: 'Orçamento disponível' },
  { value: 'APROVADA', label: 'Aprovado pelo cliente' },
  { value: 'OS_GERADA', label: 'Ordem de Serviço gerada' },
  { value: 'RECUSADA_OFICINA', label: 'Recusado pela oficina' },
  { value: 'RECUSADA_CLIENTE', label: 'Recusado pelo cliente' },
];
const ABERTA = ['AGUARDANDO_ANALISE', 'RECEBIDA', 'EM_ANALISE'];

const errMsg = (e: any, fb: string) => e?.response?.data?.error || fb;
const card = 'rounded-xl border border-border bg-card shadow-sm';
const btn = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium disabled:opacity-50';
const input = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

export function SolicitacoesOrcamento() {
  const { id } = useParams();
  return id ? <SolicitacaoDetalhe id={id} /> : <SolicitacoesLista />;
}

function SolicitacoesLista() {
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [list, setList] = useState<Solicitacao[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setList(null);
    api.get('/oficina/solicitacoes', { params: status ? { status } : {} })
      .then(r => { setList(r.data); setError(''); })
      .catch(e => setError(errMsg(e, 'Não foi possível carregar as solicitações.')));
  }, [status]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!list || !q) return list;
    return list.filter(s => [String(s.protocolo), s.cliente.nome, s.veiculo.placa, s.veiculo.modelo, s.descricao].some(v => v.toLowerCase().includes(q)));
  }, [list, busca]);

  const pendentes = (list || []).filter(s => ABERTA.includes(s.status)).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground"><Inbox size={22} className="text-primary" /> Solicitações do Portal</h1>
        <p className="text-sm text-muted-foreground">Pedidos de orçamento enviados pelos clientes no Portal do Gestor de Frota{list ? ` · ${pendentes} aguardando a oficina` : ''}.</p>
      </div>
      <div className={card}>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Buscar" className={`${input} pl-9`} placeholder="Buscar por protocolo, cliente, placa ou problema" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <select aria-label="Status" className={`${input} sm:w-72`} value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        {error ? <p className="p-8 text-center text-sm text-rose-600">{error}</p> : !filtered ? (
          <p className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma solicitação encontrada.</p>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>{['Protocolo', 'Recebida em', 'Cliente', 'Veículo', 'Problema', 'Orçamento', 'Status', ''].map(h => <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(s => (
                  <tr key={s.id} className={`hover:bg-muted/40 ${s.status === 'AGUARDANDO_ANALISE' ? 'bg-amber-500/5' : ''}`}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold">#{s.protocolo}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDateTime(s.createdAt)}</td>
                    <td className="px-4 py-2.5">{s.cliente.nome}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{s.veiculo.placa}<span className="block text-xs text-muted-foreground">{s.veiculo.marca} {s.veiculo.modelo}</span></td>
                    <td className="max-w-xs truncate px-4 py-2.5" title={s.descricao}>{s.descricao}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{s.orcamento ? `#${s.orcamento.numero}` : '—'}</td>
                    <td className="px-4 py-2.5"><SolicitacaoStatusBadge status={s.status} label={s.statusLabel} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <Link to={`/solicitacoes-orcamento/${s.id}`} className="text-sm font-semibold text-primary hover:underline">
                        {ABERTA.includes(s.status) ? 'Analisar Orçamento' : 'Abrir'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SolicitacaoDetalhe({ id }: { id: string }) {
  const navigate = useNavigate();
  const [s, setS] = useState<Solicitacao | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quoteId, setQuoteId] = useState('');

  const load = useCallback(() => {
    // Abrir a solicitação marca como "Recebido pela oficina" na primeira vez
    api.get(`/oficina/solicitacoes/${id}`).then(r => { setS(r.data); setError(''); })
      .catch(e => setError(errMsg(e, 'Solicitação não encontrada.')));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const aberta = !!s && ABERTA.includes(s.status);

  // Orçamentos já elaborados para o mesmo cliente e veículo, aguardando aprovação
  useEffect(() => {
    if (!s || !aberta) return;
    api.get('/quotes').then(r => {
      const placa = s.veiculo.placa;
      setQuotes(r.data.filter((q: any) =>
        q.clientId === s.cliente.id
        && ['Aguardando Aprovação', 'Orçamento', 'Em Andamento'].includes(q.status)
        && (q.veiculoId === s.veiculo.id || String(q.veiculoPlaca || '').toUpperCase().replace(/[\s-]/g, '') === placa)));
    }).catch(() => setQuotes([]));
  }, [s, aberta]);

  const act = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true);
    try {
      const r = await fn();
      setS(r.data);
      toast.success(ok);
      return true;
    } catch (e) {
      toast.error(errMsg(e, 'Não foi possível concluir a ação.'));
      load();
      return false;
    } finally { setBusy(false); }
  };

  if (error) return <div className="space-y-3"><BackLink /><p className={`${card} p-8 text-center text-sm text-rose-600`}>{error}</p></div>;
  if (!s) return <p className="flex items-center gap-2 p-10 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Carregando…</p>;

  return (
    <div className="space-y-5">
      <BackLink />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solicitação #{s.protocolo}</h1>
          <p className="text-sm text-muted-foreground">Recebida em {formatDateTime(s.createdAt)}</p>
        </div>
        <SolicitacaoStatusBadge status={s.status} label={s.statusLabel} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className={`${card} p-5`}>
            <dl className="grid gap-4 sm:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Cliente</dt><dd className="font-medium">{s.cliente.nome}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Veículo</dt><dd className="font-medium">{s.veiculo.marca} {s.veiculo.modelo}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Placa</dt><dd className="font-medium">{s.veiculo.placa}</dd></div>
              <div><dt className="text-xs text-muted-foreground">KM na solicitação</dt><dd className="font-medium tabular-nums">{s.km != null ? `${s.km.toLocaleString('pt-BR')} km` : '—'}</dd></div>
            </dl>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Problema / serviço desejado</p>
              <p className="mt-1 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm">{s.descricao}</p>
            </div>
            {s.orcamento && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
                <span>Orçamento <strong>#{s.orcamento.numero}</strong> · {formatBRL(s.orcamento.total)} · {s.orcamento.status}</span>
                <Link to={`/quotes/view/${s.orcamento.id}`} className="font-semibold text-primary hover:underline">Ver orçamento</Link>
              </div>
            )}
            {s.ordemServico && (
              <p className="mt-3 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-900">
                Ordem de Serviço nº <strong>{s.ordemServico.numero}</strong> gerada em {formatDateTime(s.ordemServico.createdAt)} com {s.ordemServico.km.toLocaleString('pt-BR')} km.
              </p>
            )}
          </div>

          {aberta && (
            <div className={`${card} p-5`}>
              <h2 className="text-sm font-semibold">Analisar orçamento</h2>
              <p className="mt-1 text-xs text-muted-foreground">Elabore o orçamento na tela de orçamentos (valores, peças, serviços e impostos seguem as regras atuais). Ao salvar, ele é disponibilizado ao cliente.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => navigate(`/quotes/new?solicitacao=${s.id}`)} className={`${btn} bg-primary text-primary-foreground hover:bg-primary/90`}>
                  <FilePlus2 size={15} /> Elaborar orçamento
                </button>
                {s.status !== 'EM_ANALISE' && (
                  <button type="button" disabled={busy} onClick={() => act(() => api.post(`/oficina/solicitacoes/${s.id}/em-analise`), 'Solicitação em análise.')} className={`${btn} border border-border hover:bg-muted`}>
                    <ClipboardList size={15} /> Manter em análise
                  </button>
                )}
                <button type="button" disabled={busy} onClick={() => setRecusando(true)} className={`${btn} border border-rose-500/40 text-rose-700 hover:bg-rose-500/10`}>
                  <XCircle size={15} /> Recusar solicitação
                </button>
              </div>

              {quotes.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-xs font-medium text-muted-foreground">Ou disponibilize um orçamento já elaborado para este cliente e veículo</p>
                  <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                    <select aria-label="Orçamento" className={input} value={quoteId} onChange={e => setQuoteId(e.target.value)}>
                      <option value="">Selecione o orçamento</option>
                      {quotes.map(q => <option key={q.id} value={q.id}>#{q.numeroOrcamento} · {formatBRL(q.total)} · {new Date(q.createdAt).toLocaleDateString('pt-BR')}</option>)}
                    </select>
                    <button type="button" disabled={!quoteId || busy} className={`${btn} shrink-0 bg-primary text-primary-foreground hover:bg-primary/90`}
                      onClick={() => act(() => api.post(`/oficina/solicitacoes/${s.id}/vincular`, { quoteId }), 'Orçamento disponibilizado ao cliente.')}>
                      <Send size={15} /> Disponibilizar ao cliente
                    </button>
                  </div>
                </div>
              )}

              {recusando && (
                <div className="mt-5 space-y-2 border-t border-border pt-4">
                  <label className="block text-sm font-medium" htmlFor="motivo">Motivo da recusa</label>
                  <textarea id="motivo" autoFocus rows={3} className={`${input} h-auto py-2`} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explique ao cliente por que a solicitação não será atendida." />
                  <div className="flex justify-end gap-2">
                    <button type="button" className={`${btn} border border-border hover:bg-muted`} onClick={() => { setRecusando(false); setMotivo(''); }}>Cancelar</button>
                    <button type="button" disabled={busy || motivo.trim().length < 3} className={`${btn} bg-rose-600 text-white hover:bg-rose-700`}
                      onClick={async () => { if (await act(() => api.post(`/oficina/solicitacoes/${s.id}/recusar`, { motivo }), 'Solicitação recusada.')) setRecusando(false); }}>
                      Confirmar recusa
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={card}>
            <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">Histórico de movimentações</h2>
            <SolicitacaoHistorico historico={s.historico} />
          </div>
        </div>

        <div className={`${card} h-fit p-5`}>
          <h2 className="mb-4 text-sm font-semibold">Acompanhamento</h2>
          <SolicitacaoTimeline s={s} />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/solicitacoes-orcamento" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft size={15} /> Solicitações do Portal
    </Link>
  );
}
