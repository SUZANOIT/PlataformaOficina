import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Printer, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { QuotePdfTemplate } from '../../components/QuotePdfTemplate';
import { useGeneratePdf } from '../../hooks/useGeneratePdf';
import {
  Card, Field, LoadingState, Modal, StatusBadge, Table,
  btnDanger, btnPrimary, btnSecondary, formatCurrency, formatDate, inputClass, useLoad,
} from './ui';
import { splitOsItems } from './osFilters';

/**
 * Detalhe do orçamento/OS no portal: visualizar, imprimir (PDF), aprovar ou recusar.
 * Usado na tela Ordens de Serviço (consulta unificada de orçamentos e OS).
 */
export function QuoteDetailModal({ id, onClose, onChanged, initialMode = 'view' }: {
  id: string; onClose: () => void; onChanged: () => void;
  /** 'approve' abre direto na confirmação (botão "Aprovar OS" da lista). */
  initialMode?: 'view' | 'approve';
}) {
  const state = useLoad(() => portalGestorApi.orcamento(id), [id]);
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>(initialMode);
  // Confirmação explícita exigida antes de aprovar
  const [confirmado, setConfirmado] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGeneratingPdf } = useGeneratePdf();
  const q: any = state.data;

  // OS que já não aguarda aprovação (ex.: aprovada em outra aba) volta para a visualização
  useEffect(() => {
    if (q && mode === 'approve' && !q.aguardandoAprovacao) setMode('view');
  }, [q, mode]);
  useEffect(() => { setConfirmado(false); }, [mode]);
  const act = async () => {
    setBusy(true);
    try {
      if (mode === 'approve') {
        await portalGestorApi.aprovar(id);
        toast.success(`OS #${q.numeroOrcamento} aprovada. A aprovação ficou registrada no histórico da oficina.`);
      } else {
        await portalGestorApi.recusar(id, motivo);
        toast.success(`Orçamento #${q.numeroOrcamento} recusado.`);
      }
      onChanged();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, mode === 'approve' ? 'Não foi possível aprovar a OS. Tente novamente.' : 'Não foi possível recusar a OS.'));
      state.reload();
      setMode('view');
    } finally {
      setBusy(false);
    }
  };

  const footer = !q ? null : mode === 'view' ? (
    <>
      <button type="button" className={btnSecondary} disabled={isGeneratingPdf} onClick={() => generatePdf(pdfRef.current, `orcamento-${q.numeroOrcamento}.pdf`, { viewerPath: `/portal/orcamentos/${q.numeroOrcamento}/pdf`, title: `Orçamento #${q.numeroOrcamento}` })}>
        <Printer size={15} /> {isGeneratingPdf ? 'Gerando…' : 'Imprimir / PDF'}
      </button>
      {q.aguardandoAprovacao && (
        <>
          <button type="button" className={btnDanger} onClick={() => setMode('reject')}><XCircle size={15} /> Recusar</button>
          <button type="button" className={btnPrimary} onClick={() => setMode('approve')}><CheckCircle2 size={15} /> Aprovar OS</button>
        </>
      )}
    </>
  ) : (
    <>
      <button type="button" className={btnSecondary} disabled={busy} onClick={() => setMode('view')}>Voltar</button>
      <button
        type="button"
        className={mode === 'approve' ? btnPrimary : btnDanger}
        disabled={busy || (mode === 'reject' && motivo.trim().length < 3) || (mode === 'approve' && !confirmado)}
        onClick={act}
      >
        {busy ? (mode === 'approve' ? 'Aprovando…' : 'Enviando…') : mode === 'approve' ? 'Confirmar aprovação' : 'Confirmar recusa'}
      </button>
    </>
  );

  return (
    <Modal title={q ? `Orçamento #${q.numeroOrcamento}` : 'Orçamento'} onClose={onClose} footer={footer} wide>
      {state.loading && !q ? <LoadingState /> : state.error ? <p className="text-sm text-rose-600">{state.error}</p> : q && (
        <div className="space-y-6">
          {mode === 'approve' && (() => {
            const { servicos, pecas } = splitOsItems(q.items || []);
            return (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-foreground">Confirme a aprovação da OS</p>
                <dl className="grid gap-3 sm:grid-cols-4">
                  <div><dt className="text-xs text-muted-foreground">Nº da OS</dt><dd className="font-semibold">#{q.numeroOrcamento}</dd></div>
                  <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Veículo</dt><dd className="font-medium">{[q.veiculoMarca, q.veiculoModelo].filter(Boolean).join(' ') || '—'}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">Placa</dt><dd className="font-medium">{q.veiculoPlaca || '—'}</dd></div>
                </dl>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Serviços</p>
                    {servicos.length ? (
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">{servicos.map((i: any) => <li key={i.id}>{i.descricao}{i.quantidade > 1 ? ` (${i.quantidade}x)` : ''}</li>)}</ul>
                    ) : <p className="mt-1 text-muted-foreground">Nenhum serviço</p>}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Peças e materiais</p>
                    {pecas.length ? (
                      <ul className="mt-1 list-disc space-y-0.5 pl-4">{pecas.map((i: any) => <li key={i.id}>{i.descricao}{i.quantidade > 1 ? ` (${i.quantidade}x)` : ''}</li>)}</ul>
                    ) : <p className="mt-1 text-muted-foreground">Nenhuma peça</p>}
                  </div>
                </div>
                <p className="flex flex-wrap items-baseline justify-between gap-2 border-t border-primary/20 pt-3">
                  <span className="text-muted-foreground">Valor total{q.condicaoPagamento ? ` · ${q.condicaoPagamento}` : ''}</span>
                  <strong className="text-lg text-foreground">{formatCurrency(q.total)}</strong>
                </p>
                <label className="flex items-start gap-2 rounded-md bg-card p-3">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={confirmado} onChange={e => setConfirmado(e.target.checked)} />
                  <span>Li os dados acima e autorizo a oficina a executar esta Ordem de Serviço no valor de <strong>{formatCurrency(q.total)}</strong>.</span>
                </label>
              </div>
            );
          })()}
          {mode === 'reject' && (
            <Field label="Motivo da recusa" hint="O motivo fica registrado no histórico do orçamento para a oficina.">
              <textarea autoFocus rows={3} className={`${inputClass} h-auto py-2`} value={motivo} onChange={e => setMotivo(e.target.value)} />
            </Field>
          )}

          <div className="grid gap-4 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={q.status} /></div></div>
            <div><p className="text-xs text-muted-foreground">Data</p><p className="mt-1 font-medium">{formatDate(q.createdAt)}</p></div>
            <div><p className="text-xs text-muted-foreground">Veículo</p><p className="mt-1 font-medium">{q.veiculoPlaca || '—'} {q.veiculoModelo ? `· ${q.veiculoMarca || ''} ${q.veiculoModelo}` : ''}</p></div>
            <div><p className="text-xs text-muted-foreground">Validade</p><p className="mt-1 font-medium">{q.validade || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Pagamento</p><p className="mt-1 font-medium">{q.condicaoPagamento}{q.parcelas ? ` · ${q.parcelas}x` : ''}</p></div>
            <div><p className="text-xs text-muted-foreground">Prazo de execução</p><p className="mt-1 font-medium">{q.prazoExecucao || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Garantia</p><p className="mt-1 font-medium">{q.garantia || '—'}</p></div>
            <div><p className="text-xs text-muted-foreground">Oficina executora</p><p className="mt-1 font-medium">{q.oficina?.nome || '—'}</p></div>
          </div>

          <Card>
            <Table head={['Descrição', 'Tipo', 'Qtd', 'Valor unit.', 'Total']}>
              {q.items.map((i: any) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5">{i.descricao}{i.codigoPeca && <span className="block text-xs text-muted-foreground">Cód. {i.codigoPeca}{i.tipoPeca ? ` · ${i.tipoPeca}` : ''}</span>}</td>
                  <td className="px-4 py-2.5">{i.tipo}</td>
                  <td className="px-4 py-2.5 tabular-nums">{i.quantidade}</td>
                  <td className="px-4 py-2.5 tabular-nums">{formatCurrency(i.valorUnitario)}</td>
                  <td className="px-4 py-2.5 tabular-nums">{formatCurrency(i.valorTotal)}</td>
                </tr>
              ))}
            </Table>
            <div className="flex justify-end gap-8 border-t border-border px-4 py-3 text-sm">
              <span className="text-muted-foreground">Subtotal <strong className="ml-2 text-foreground">{formatCurrency(q.subtotal)}</strong></span>
              <span className="text-muted-foreground">Total <strong className="ml-2 text-base text-foreground">{formatCurrency(q.total)}</strong></span>
            </div>
          </Card>

          {q.observacao && <p className="whitespace-pre-line rounded-lg bg-muted/50 p-3 text-sm">{q.observacao}</p>}

          {q.history?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold">Histórico</h3>
              <p className="text-xs text-muted-foreground">Ações realizadas pela sua empresa neste orçamento.</p>
              <ol className="mt-2 space-y-2 border-l border-border pl-4 text-sm">
                {q.history.map((h: any) => (
                  <li key={h.id}>
                    <span className="font-medium">{h.description}</span>
                    <span className="text-muted-foreground"> · {new Date(h.createdAt).toLocaleString('pt-BR')} · {h.userName}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="absolute left-[-9999px] top-[-9999px]" aria-hidden="true">
            <QuotePdfTemplate ref={pdfRef} data={q} company={q.company} />
          </div>
        </div>
      )}
    </Modal>
  );
}
