import { Check, Circle, X } from 'lucide-react';

/**
 * Peças visuais compartilhadas do fluxo de Manutenção (solicitação -> orçamento -> OS),
 * usadas na tela da oficina e no Portal do Gestor de Frota.
 */

export interface HistoricoItem {
  id: string; createdAt: string; responsavel: string; perfil: string;
  statusAnterior: string | null; statusAnteriorLabel: string | null;
  statusNovo: string; statusNovoLabel: string; descricao: string;
}

export interface Solicitacao {
  id: string;
  protocolo: number;
  status: string;
  statusLabel: string;
  descricao: string;
  /** KM informada pelo gestor ao solicitar o orçamento */
  km: number | null;
  motivoRecusa: string | null;
  createdAt: string;
  updatedAt: string;
  cliente: { id: string; nome: string; cnpj: string | null };
  veiculo: { id: string; placa: string; marca: string; modelo: string; kmAtual: number };
  orcamento: { id: string; numero: number; status: string; total: number } | null;
  ordemServico: { numero: number; km: number; createdAt: string } | null;
  historico: HistoricoItem[];
}

const TONES: Record<string, string> = {
  AGUARDANDO_ANALISE: 'bg-amber-500/15 text-amber-800',
  RECEBIDA: 'bg-sky-500/15 text-sky-800',
  EM_ANALISE: 'bg-sky-500/15 text-sky-800',
  ORCAMENTO_DISPONIVEL: 'bg-violet-500/15 text-violet-800',
  APROVADA: 'bg-emerald-500/15 text-emerald-800',
  OS_GERADA: 'bg-emerald-600/20 text-emerald-900',
  RECUSADA_OFICINA: 'bg-rose-500/10 text-rose-800',
  RECUSADA_CLIENTE: 'bg-rose-500/10 text-rose-800',
};

export function SolicitacaoStatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TONES[status] || 'bg-muted text-muted-foreground'}`}>
      {label}
    </span>
  );
}

export const formatDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

const TIMELINE = [
  { status: 'AGUARDANDO_ANALISE', label: 'Orçamento enviado' },
  { status: 'RECEBIDA', label: 'Recebido pela oficina' },
  { status: 'EM_ANALISE', label: 'Em análise' },
  { status: 'ORCAMENTO_DISPONIVEL', label: 'Orçamento disponibilizado' },
  { status: 'APROVADA', label: 'Aprovado pelo cliente' },
  { status: 'OS_GERADA', label: 'Ordem de Serviço gerada' },
];
const ORDER = TIMELINE.map(t => t.status);

/** Linha do tempo do processo (datas tiradas do histórico). */
export function SolicitacaoTimeline({ s }: { s: Solicitacao }) {
  const recusada = s.status === 'RECUSADA_OFICINA' || s.status === 'RECUSADA_CLIENTE';
  const reached = (st: string) => s.historico.find(h => h.statusNovo === st);
  // Etapa mais avançada alcançada (etapas puladas antes dela contam como concluídas)
  const furthest = Math.max(-1, ...s.historico.map(h => ORDER.indexOf(h.statusNovo)));
  const recusa = recusada ? s.historico.filter(h => h.statusNovo === s.status).pop() : undefined;

  return (
    <ol className="relative space-y-0">
      {TIMELINE.map((t, i) => {
        const h = reached(t.status);
        const done = i <= furthest;
        const current = !recusada && i === furthest + 1;
        return (
          <li key={t.status} className="relative flex gap-3 pb-4 last:pb-0">
            {i < TIMELINE.length - 1 && (
              <span className={`absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px ${i < furthest ? 'bg-emerald-500' : 'bg-border'}`} aria-hidden="true" />
            )}
            <span className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
              done ? 'border-emerald-500 bg-emerald-500 text-white' : current ? 'border-primary bg-card text-link' : 'border-border bg-card text-muted-foreground'}`}>
              {done ? <Check size={13} strokeWidth={3} aria-hidden="true" /> : <Circle size={7} fill="currentColor" aria-hidden="true" />}
            </span>
            <div className="min-w-0 pt-0.5">
              <p className={`text-sm ${done ? 'font-medium text-foreground' : current ? 'font-semibold text-link' : 'text-muted-foreground'}`}>
                {t.label}{current && <span className="ml-1.5 text-xs font-normal">(etapa atual)</span>}
              </p>
              {h && <p className="text-xs text-muted-foreground">{formatDateTime(h.createdAt)} · {h.responsavel}</p>}
            </div>
          </li>
        );
      })}
      {recusa && (
        <li className="relative flex gap-3">
          <span className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-rose-500 bg-rose-500 text-white">
            <X size={13} strokeWidth={3} aria-hidden="true" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-sm font-semibold text-rose-700">{recusa.statusNovoLabel}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(recusa.createdAt)} · {recusa.responsavel}</p>
            {s.motivoRecusa && <p className="mt-0.5 text-xs text-foreground">Motivo: {s.motivoRecusa}</p>}
          </div>
        </li>
      )}
    </ol>
  );
}

/** Histórico de movimentações (data, responsável, status anterior/novo, descrição). */
export function SolicitacaoHistorico({ historico }: { historico: HistoricoItem[] }) {
  const rows = [...historico].reverse();
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>
            {['Data e hora', 'Responsável', 'Status anterior', 'Novo status', 'Movimentação'].map(h => (
              <th key={h} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(h => (
            <tr key={h.id} className="align-top">
              <td className="whitespace-nowrap px-4 py-2">{formatDateTime(h.createdAt)}</td>
              <td className="px-4 py-2">{h.responsavel}</td>
              <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{h.statusAnteriorLabel || '—'}</td>
              <td className="whitespace-nowrap px-4 py-2"><SolicitacaoStatusBadge status={h.statusNovo} label={h.statusNovoLabel} /></td>
              <td className="min-w-[14rem] px-4 py-2">{h.descricao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
