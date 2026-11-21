import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, FileText, Lock, Plus, Send, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { QuoteDetailModal } from './QuoteDetailModal';
import { Card, EmptyState, LoadingState, PageHeader, btnPrimary, btnSecondary, inputClass } from './ui';
import {
  SolicitacaoHistorico, SolicitacaoStatusBadge, SolicitacaoTimeline, formatBRL, formatDateTime, type Solicitacao,
} from '../../components/manutencao/SolicitacaoShared';

/**
 * Manutenção (Portal do Gestor de Frota): solicitar orçamento à oficina,
 * acompanhar a análise, aprovar o orçamento (fluxo existente) e gerar a
 * Ordem de Serviço informando a quilometragem.
 */

// Fluxo: Solicitação de Orçamento -> Análise da Oficina -> Orçamento / Ordem de Serviço
const STEPS = [
  { n: 1, label: 'Solicitação de Orçamento', icon: FileText },
  { n: 2, label: 'Análise da Oficina', icon: ClipboardCheck },
  { n: 3, label: 'Orçamento / Ordem de Serviço', icon: Wrench },
];

/**
 * Etapa atual do indicador:
 * 1 = nova solicitação; 2 = com a oficina (aguardando, recebida, em análise);
 * 3 = orçamento disponível/aprovado até gerar a OS; 4 = OS gerada (concluído).
 */
function currentStep(s: Solicitacao | null) {
  if (!s) return 1;
  if (s.status === 'OS_GERADA') return 4;
  if (['ORCAMENTO_DISPONIVEL', 'APROVADA', 'RECUSADA_CLIENTE'].includes(s.status)) return 3;
  return 2;
}

function Stepper({ s }: { s: Solicitacao | null }) {
  const step = currentStep(s);
  const recusada = !!s && (s.status === 'RECUSADA_OFICINA' || s.status === 'RECUSADA_CLIENTE');
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Etapas do processo">
      {STEPS.map(({ n, label, icon: Icon }) => {
        const done = step > n;
        const active = step === n;
        // Recusa pela oficina encerra na etapa 2; recusa do orçamento pelo cliente, na etapa 3
        const failed = recusada && n === (s?.status === 'RECUSADA_CLIENTE' ? 3 : 2);
        return (
          <li key={n} aria-current={active ? 'step' : undefined}
            className={`flex items-center gap-3 rounded-xl border px-3 py-3 sm:px-4 ${
              failed ? 'border-rose-300 bg-rose-50' : active ? 'border-primary bg-primary/5' : done ? 'border-emerald-300 bg-emerald-50' : 'border-border bg-card'}`}>
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              failed ? 'bg-rose-500 text-white' : active ? 'bg-primary text-primary-foreground' : done ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>
              {done ? <CheckCircle2 size={18} aria-hidden="true" /> : <Icon size={17} aria-hidden="true" />}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Etapa {n}</p>
              <p className={`text-xs font-semibold leading-tight sm:text-sm ${active ? 'text-primary' : 'text-foreground'}`}>{label}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function NovaSolicitacao({ onCreated }: { onCreated: (s: Solicitacao) => void }) {
  const [vehicles, setVehicles] = useState<any[] | null>(null);
  const [vehicleId, setVehicleId] = useState('');
  const [descricao, setDescricao] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { portalGestorApi.veiculos({ status: 'all' }).then(setVehicles).catch(() => setVehicles([])); }, []);
  const v = vehicles?.find(x => x.id === vehicleId);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return toast.error('Selecione o veículo.');
    if (descricao.trim().length < 5) return toast.error('Descreva o problema ou serviço desejado.');
    setSending(true);
    try {
      const s = await portalGestorApi.criarSolicitacao({ vehicleId, descricao: descricao.trim() });
      toast.success(`Solicitação #${s.protocolo} enviada à oficina.`);
      setDescricao('');
      setVehicleId('');
      onCreated(s);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally { setSending(false); }
  };

  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Plus size={16} className="text-primary" /> Novo Orçamento</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Selecione o veículo e descreva o problema. A oficina recebe na hora.</p>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Veículo</span>
          <select required className={inputClass} value={vehicleId} onChange={e => setVehicleId(e.target.value)} disabled={!vehicles}>
            <option value="">{vehicles ? 'Selecione o veículo' : 'Carregando…'}</option>
            {(vehicles || []).map(x => <option key={x.id} value={x.id}>{x.placa} — {x.marca} {x.modelo}</option>)}
          </select>
        </label>
        {v && (
          <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2.5 text-xs">
            <div><dt className="text-muted-foreground">Placa</dt><dd className="font-semibold">{v.placa}</dd></div>
            <div><dt className="text-muted-foreground">Marca</dt><dd className="font-semibold">{v.marca}</dd></div>
            <div><dt className="text-muted-foreground">Modelo</dt><dd className="truncate font-semibold" title={v.modelo}>{v.modelo}</dd></div>
          </dl>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Descrição do problema ou serviço desejado</span>
          <textarea required minLength={5} rows={4} className={`${inputClass} h-auto py-2`} value={descricao} onChange={e => setDescricao(e.target.value)}
            placeholder="Ex.: barulho ao frear e pedal baixo; revisão dos 60.000 km…" />
        </label>
        <button type="submit" disabled={sending} className={`${btnPrimary} w-full`}>
          <Send size={15} /> {sending ? 'Enviando…' : 'Enviar orçamento para a oficina'}
        </button>
      </form>
    </Card>
  );
}

function GerarOS({ s, onDone }: { s: Solicitacao; onDone: (s: Solicitacao) => void }) {
  const [km, setKm] = useState('');
  const [busy, setBusy] = useState(false);
  const kmNum = Number(km.replace(/\D/g, ''));

  if (s.status === 'OS_GERADA' && s.ordemServico) {
    return (
      <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="flex items-center gap-2 font-semibold"><CheckCircle2 size={17} /> Ordem de Serviço nº {s.ordemServico.numero} gerada</p>
        <p className="mt-1">Em {formatDateTime(s.ordemServico.createdAt)} com {s.ordemServico.km.toLocaleString('pt-BR')} km. A oficina foi notificada.</p>
      </div>
    );
  }
  if (s.status !== 'APROVADA') {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <Lock size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          {s.status === 'RECUSADA_OFICINA' || s.status === 'RECUSADA_CLIENTE'
            ? 'Esta solicitação foi encerrada; não é possível gerar Ordem de Serviço.'
            : 'A geração da Ordem de Serviço é liberada depois que você aprovar o orçamento elaborado pela oficina.'}
        </p>
      </div>
    );
  }
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!kmNum) return toast.error('Informe a quilometragem atual do veículo.');
    setBusy(true);
    try {
      const updated = await portalGestorApi.gerarOrdemServico(s.id, kmNum);
      toast.success(`Ordem de Serviço nº ${updated.ordemServico.numero} gerada.`);
      onDone(updated);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="rounded-lg border border-emerald-300 bg-emerald-50/60 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900"><CheckCircle2 size={17} /> Orçamento aprovado!</p>
      <p className="mt-1 text-sm text-emerald-900">Agora informe a quilometragem atual do veículo para gerar a Ordem de Serviço.</p>
      <div className="mt-3 flex flex-col gap-2">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-emerald-900">Quilometragem atual (KM)</span>
          <input required inputMode="numeric" className={inputClass} value={km}
            onChange={e => setKm(e.target.value.replace(/\D/g, '') ? Number(e.target.value.replace(/\D/g, '')).toLocaleString('pt-BR') : '')}
            placeholder={`Mínimo ${s.veiculo.kmAtual.toLocaleString('pt-BR')} km`} />
        </label>
        <button type="submit" disabled={busy || !kmNum} className={`${btnPrimary} w-full`}>
          <Wrench size={15} /> {busy ? 'Gerando…' : 'Gerar Ordem de Serviço'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-emerald-900/80">Última quilometragem registrada: {s.veiculo.kmAtual.toLocaleString('pt-BR')} km.</p>
    </form>
  );
}

export function PortalManutencao() {
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('solicitacao');
  const [list, setList] = useState<Solicitacao[] | null>(null);
  const [detail, setDetail] = useState<Solicitacao | null>(null);
  const [error, setError] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);

  const loadList = useCallback(() => {
    portalGestorApi.solicitacoes().then(l => { setList(l); setError(''); }).catch(e => setError(apiErrorMessage(e, 'Não foi possível carregar as solicitações.')));
  }, []);
  useEffect(() => { loadList(); }, [loadList]);

  const loadDetail = useCallback((id: string) => {
    portalGestorApi.solicitacao(id).then(setDetail).catch(e => { setDetail(null); toast.error(apiErrorMessage(e, 'Solicitação não encontrada.')); });
  }, []);
  useEffect(() => { if (selectedId) loadDetail(selectedId); else setDetail(null); }, [selectedId, loadDetail]);

  const select = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('solicitacao', id); else next.delete('solicitacao');
    setParams(next);
  };

  const refresh = (s: Solicitacao) => { setDetail(s); loadList(); };
  const active = useMemo(() => (list || []).filter(s => !['OS_GERADA', 'RECUSADA_OFICINA', 'RECUSADA_CLIENTE'].includes(s.status)).length, [list]);

  return (
    <>
      <PageHeader title="Manutenção" description="Gerencie seus orçamentos e ordens de serviço de forma simples e rápida." />
      <div className="space-y-5">
        <Stepper s={detail} />

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Coluna esquerda: novo orçamento + solicitações */}
          <div className="space-y-5">
            <NovaSolicitacao onCreated={s => { loadList(); select(s.id); }} />
            <Card>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">Minhas solicitações</h2>
                <span className="text-xs text-muted-foreground">{list ? `${active} em andamento` : ''}</span>
              </div>
              {error ? <p className="p-6 text-center text-sm text-rose-600">{error}</p> : !list ? <LoadingState /> : list.length === 0 ? (
                <EmptyState message="Você ainda não enviou solicitações de orçamento." />
              ) : (
                <ul className="max-h-[28rem] divide-y divide-border overflow-y-auto">
                  {list.map(s => (
                    <li key={s.id}>
                      <button type="button" onClick={() => select(s.id)} aria-current={s.id === selectedId ? 'true' : undefined}
                        className={`w-full px-4 py-3 text-left hover:bg-muted/50 ${s.id === selectedId ? 'bg-primary/5' : ''}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">#{s.protocolo} · {s.veiculo.placa}</span>
                          <SolicitacaoStatusBadge status={s.status} label={s.statusLabel} />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.descricao}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDateTime(s.createdAt)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Coluna direita: acompanhamento da solicitação selecionada */}
          <div className="space-y-5 lg:col-span-2">
            {!detail ? (
              <Card className="flex min-h-[16rem] flex-col items-center justify-center p-8 text-center">
                <ClipboardCheck size={30} className="text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">Selecione uma solicitação para acompanhar</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">Ou envie um novo orçamento ao lado. Você será avisado no sino quando a oficina responder.</p>
              </Card>
            ) : (
              <>
                <Card className="p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-base font-semibold">Solicitação #{detail.protocolo}</h2>
                      <p className="text-xs text-muted-foreground">Enviada em {formatDateTime(detail.createdAt)} · {detail.veiculo.placa} · {detail.veiculo.marca} {detail.veiculo.modelo}</p>
                    </div>
                    <SolicitacaoStatusBadge status={detail.status} label={detail.statusLabel} />
                  </div>
                  <p className="mt-3 whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm">{detail.descricao}</p>
                  {detail.motivoRecusa && <p className="mt-2 text-sm text-rose-700">Motivo da recusa: {detail.motivoRecusa}</p>}

                  {detail.orcamento && (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm">
                        <p className="font-semibold">Orçamento #{detail.orcamento.numero} · {formatBRL(detail.orcamento.total)}</p>
                        <p className="text-xs text-muted-foreground">Status: {detail.orcamento.status}</p>
                      </div>
                      <button type="button" onClick={() => setQuoteOpen(true)} className={detail.status === 'ORCAMENTO_DISPONIVEL' ? btnPrimary : btnSecondary}>
                        {detail.status === 'ORCAMENTO_DISPONIVEL' ? 'Ver valores e aprovar' : 'Ver orçamento'}
                      </button>
                    </div>
                  )}
                </Card>

                <div className="grid gap-5 md:grid-cols-2">
                  <Card className="p-4">
                    <h3 className="mb-3 text-sm font-semibold">Acompanhamento</h3>
                    <SolicitacaoTimeline s={detail} />
                  </Card>
                  <Card className="p-4">
                    <h3 className="mb-3 text-sm font-semibold">Ordem de Serviço</h3>
                    <GerarOS s={detail} onDone={refresh} />
                  </Card>
                </div>

                <Card>
                  <h3 className="border-b border-border px-4 py-3 text-sm font-semibold">Histórico de movimentações</h3>
                  <SolicitacaoHistorico historico={detail.historico} />
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {quoteOpen && detail?.orcamento && (
        <QuoteDetailModal
          id={detail.orcamento.id}
          onClose={() => setQuoteOpen(false)}
          onChanged={() => { loadDetail(detail.id); loadList(); }}
        />
      )}
    </>
  );
}
