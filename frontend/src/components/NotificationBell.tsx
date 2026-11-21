import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { api } from '../services/api';

/**
 * Sino de notificações (persistidas no banco) — usado na oficina e no Portal
 * do Gestor de Frota. `basePath` define a API:
 *   oficina: /notificacoes-usuario
 *   portal:  /portal-gestor/notificacoes
 */
interface Notificacao {
  id: string;
  tipoEvento: string;
  titulo: string;
  mensagem: string;
  urlDestino?: string | null;
  cor?: string | null;
  lida: boolean;
  createdAt: string;
}

const ACTION_LABEL: Record<string, string> = {
  NOVA_SOLICITACAO: 'Analisar Orçamento',
  ORCAMENTO_DISPONIVEL: 'Ver orçamento',
  ORCAMENTO_APROVADO: 'Ver solicitação',
  ORCAMENTO_RECUSADO_CLIENTE: 'Ver solicitação',
  SOLICITACAO_RECEBIDA: 'Acompanhar',
  SOLICITACAO_RECUSADA_OFICINA: 'Ver detalhes',
  OS_GERADA: 'Ver Ordem de Serviço',
};

const DOT: Record<string, string> = { primary: 'bg-primary', success: 'bg-emerald-500', danger: 'bg-rose-500' };

const timeAgo = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export function NotificationBell({ basePath, align = 'right', className = '' }: { basePath: string; align?: 'left' | 'right'; className?: string }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filtro, setFiltro] = useState<'naoLidas' | 'todas'>('naoLidas');
  const [itens, setItens] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(basePath, { params: { limit: 50 } });
      setItens(data.itens);
      setNaoLidas(data.naoLidas);
    } catch (e: any) {
      // Perfis sem acesso ao recurso: o sino fica oculto
      if (e?.response?.status === 403) setDisabled(true);
    }
  }, [basePath]);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => { if (open) load(); }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const marcarLida = async (n: Notificacao) => {
    if (n.lida) return;
    setItens(list => list.map(i => (i.id === n.id ? { ...i, lida: true } : i)));
    setNaoLidas(c => Math.max(0, c - 1));
    try { await api.post(`${basePath}/${n.id}/lida`); } catch { load(); }
  };

  const marcarTodas = async () => {
    setItens(list => list.map(i => ({ ...i, lida: true })));
    setNaoLidas(0);
    try { await api.post(`${basePath}/lidas`); } catch { load(); }
  };

  const abrir = async (n: Notificacao) => {
    await marcarLida(n);
    setOpen(false);
    if (n.urlDestino) navigate(n.urlDestino);
  };

  if (disabled) return null;
  const visiveis = filtro === 'naoLidas' ? itens.filter(i => !i.lida) : itens;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={naoLidas ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell size={19} aria-hidden="true" />
        {naoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-semibold leading-none text-white">
            {naoLidas > 99 ? '99+' : naoLidas}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notificações"
          className={`absolute z-50 mt-2 w-[min(92vw,24rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl ${align === 'right' ? 'right-0' : 'left-0'}`}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Notificações</p>
              <p className="text-xs text-muted-foreground">{naoLidas ? `${naoLidas} não lida${naoLidas > 1 ? 's' : ''}` : 'Tudo em dia'}</p>
            </div>
            <button type="button" onClick={marcarTodas} disabled={!naoLidas}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40">
              <CheckCheck size={14} aria-hidden="true" /> Marcar todas como lidas
            </button>
          </div>
          <div role="tablist" className="flex gap-1 border-b border-border px-3 py-2 text-xs">
            {([['naoLidas', 'Não lidas'], ['todas', 'Histórico']] as const).map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={filtro === k} onClick={() => setFiltro(k)}
                className={`rounded-md px-2.5 py-1 font-medium ${filtro === k ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}
              </button>
            ))}
          </div>
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {visiveis.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                {filtro === 'naoLidas' ? 'Nenhuma notificação nova.' : 'Nenhuma notificação.'}
              </li>
            )}
            {visiveis.map(n => (
              <li key={n.id} className={`px-4 py-3 ${n.lida ? '' : 'bg-primary/5'}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lida ? 'bg-transparent' : DOT[n.cor || ''] || 'bg-primary'}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${n.lida ? 'font-medium text-foreground' : 'font-semibold text-foreground'}`}>
                        {n.titulo}
                        {!n.lida && <span className="ml-1.5 rounded bg-primary/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase text-primary">Nova</span>}
                      </p>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-line break-words text-xs leading-relaxed text-muted-foreground">{n.mensagem}</p>
                    <div className="mt-2 flex items-center gap-3">
                      {n.urlDestino && (
                        <button type="button" onClick={() => abrir(n)} className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary hover:underline">
                          {ACTION_LABEL[n.tipoEvento] || 'Abrir'} <ChevronRight size={13} aria-hidden="true" />
                        </button>
                      )}
                      {!n.lida && (
                        <button type="button" onClick={() => marcarLida(n)} className="text-xs text-muted-foreground hover:text-foreground">Marcar como lida</button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
