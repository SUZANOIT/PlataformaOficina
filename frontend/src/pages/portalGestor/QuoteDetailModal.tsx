import { useRef, useState } from 'react';
import { CheckCircle2, Printer, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { QuotePdfTemplate } from '../../components/QuotePdfTemplate';
import { useGeneratePdf } from '../../hooks/useGeneratePdf';
import {
  Card, Field, LoadingState, Modal, StatusBadge, Table,
  btnDanger, btnPrimary, btnSecondary, formatCurrency, formatDate, inputClass, useLoad,
} from './ui';

/**
 * Detalhe do orçamento/OS no portal: visualizar, imprimir (PDF), aprovar ou recusar.
 * Usado na tela Ordens de Serviço (consulta unificada de orçamentos e OS).
 */
export function QuoteDetailModal({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged: () => void }) {
  const state = useLoad(() => portalGestorApi.orcamento(id), [id]);
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGeneratingPdf } = useGeneratePdf();
  const q: any = state.data;

  const act = async () => {
    setBusy(true);
    try {
      if (mode === 'approve') {
        await portalGestorApi.aprovar(id);
        toast.success(`Orçamento #${q.numeroOrcamento} aprovado. A aprovação fica registrada no histórico da oficina.`);
      } else {
        await portalGestorApi.recusar(id, motivo);
        toast.success(`Orçamento #${q.numeroOrcamento} recusado.`);
      }
      onChanged();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e));
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
          <button type="button" className={btnPrimary} onClick={() => setMode('approve')}><CheckCircle2 size={15} /> Aprovar</button>
        </>
      )}
    </>
  ) : (
    <>
      <button type="button" className={btnSecondary} disabled={busy} onClick={() => setMode('view')}>Voltar</button>
      <button
        type="button"
        className={mode === 'approve' ? btnPrimary : btnDanger}
        disabled={busy || (mode === 'reject' && motivo.trim().length < 3)}
        onClick={act}
      >
        {busy ? 'Enviando…' : mode === 'approve' ? 'Confirmar aprovação' : 'Confirmar recusa'}
      </button>
    </>
  );

  return (
    <Modal title={q ? `Orçamento #${q.numeroOrcamento}` : 'Orçamento'} onClose={onClose} footer={footer} wide>
      {state.loading && !q ? <LoadingState /> : state.error ? <p className="text-sm text-rose-600">{state.error}</p> : q && (
        <div className="space-y-6">
          {mode === 'approve' && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
              Ao confirmar, você autoriza a oficina a executar os serviços deste orçamento no valor de <strong>{formatCurrency(q.total)}</strong>
              {q.condicaoPagamento ? <> com condição de pagamento <strong>{q.condicaoPagamento}</strong></> : null}.
            </div>
          )}
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
