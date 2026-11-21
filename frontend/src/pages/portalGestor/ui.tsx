import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';

export const formatCurrency = (v: number | null | undefined) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

export const formatDate = (v?: string | Date | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

export const formatCnpj = (v?: string | null) => {
  const d = (v || '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : v || '—';
};

/** Carrega dados de uma função assíncrona com estados de loading/erro e recarga manual. */
export function useLoad<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fn());
    } catch (e) {
      setError(apiErrorMessage(e, 'Não foi possível carregar os dados.'));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-border bg-card text-card-foreground shadow-sm ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, tone = 'default' }: { label: string; value: React.ReactNode; hint?: string; tone?: 'default' | 'warn' | 'danger' | 'ok' }) {
  const toneClass = tone === 'danger' ? 'text-rose-600'
    : tone === 'warn' ? 'text-amber-600'
      : tone === 'ok' ? 'text-emerald-600' : 'text-foreground';
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
      <Loader2 size={16} className="animate-spin" /> Carregando…
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
      <AlertCircle size={28} className="text-rose-500" />
      <p>{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="text-primary hover:underline">Tentar novamente</button>}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center text-sm text-muted-foreground">
      <Inbox size={28} />
      <p>{message}</p>
    </div>
  );
}

export function Loadable<T>({ state, children }: { state: { data: T | null; loading: boolean; error: string | null; reload: () => void }; children: (data: T) => React.ReactNode }) {
  if (state.loading && !state.data) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={state.reload} />;
  if (!state.data) return null;
  return <>{children(state.data)}</>;
}

const STATUS_TONES: Record<string, string> = {
  'Aguardando Aprovação': 'bg-amber-500/15 text-amber-800',
  'Orçamento': 'bg-amber-500/15 text-amber-800',
  'Em Andamento': 'bg-amber-500/15 text-amber-800',
  'Aprovado': 'bg-sky-500/15 text-sky-800',
  'Aguardando Pagamento': 'bg-violet-500/15 text-violet-800',
  'Parcialmente Pago': 'bg-violet-500/15 text-violet-800',
  'Emitir Nota Fiscal': 'bg-indigo-500/15 text-indigo-800',
  'Cobertura': 'bg-teal-500/15 text-teal-800',
  'Pago': 'bg-emerald-500/15 text-emerald-800',
  'Cancelado': 'bg-rose-500/10 text-rose-800',
  ATIVO: 'bg-emerald-500/15 text-emerald-800',
  EM_MANUTENCAO: 'bg-amber-500/15 text-amber-800',
  INATIVO: 'bg-slate-500/15 text-slate-700',
  VENDIDO: 'bg-slate-500/15 text-slate-700',
  RECEBIDA: 'bg-emerald-500/15 text-emerald-800',
  LIQUIDADO: 'bg-emerald-500/15 text-emerald-800',
  PENDENTE: 'bg-amber-500/15 text-amber-800',
  VENCIDA: 'bg-rose-500/10 text-rose-800',
};

const STATUS_LABELS: Record<string, string> = {
  'Orçamento': 'Aguardando Aprovação',
  'Em Andamento': 'Aguardando Aprovação',
  EM_MANUTENCAO: 'Em manutenção',
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
  VENDIDO: 'Vendido',
  RECEBIDA: 'Pago',
  LIQUIDADO: 'Pago',
  PENDENTE: 'Em aberto',
};

export function StatusBadge({ status, overdue }: { status?: string | null; overdue?: boolean }) {
  const s = status || '—';
  const tone = overdue ? STATUS_TONES.VENCIDA : STATUS_TONES[s] || 'bg-muted text-muted-foreground';
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {overdue ? 'Vencido' : STATUS_LABELS[s] || s}
    </span>
  );
}

export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
          <tr>{head.map((h, i) => <th key={i} className="whitespace-nowrap px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}

export const inputClass = 'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring';
export const btnPrimary = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const btnSecondary = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
export const btnDanger = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-500/40 px-4 text-sm font-medium text-rose-700 hover:bg-rose-500/10 disabled:opacity-50';

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl ${wide ? 'max-w-5xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Filtro de veículos reutilizado nas listas do portal. */
export function VehicleFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  useEffect(() => {
    portalGestorApi.veiculos({ status: 'all' }).then(setVehicles).catch(() => setVehicles([]));
  }, []);
  return (
    <select aria-label="Filtrar por veículo" value={value} onChange={e => onChange(e.target.value)} className={`${inputClass} sm:w-64`}>
      <option value="">Todos os veículos</option>
      {vehicles.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.marca} {v.modelo}</option>)}
    </select>
  );
}
