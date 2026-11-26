import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Loader2 } from 'lucide-react';
import { platformService } from '../../services/platformService';

interface DrillItem {
  id: string; tipo: 'OFICINA' | 'GUINCHO'; numero: string; status: string; valor: number;
  cliente: string; placa: string | null; createdAt: string; updatedAt: string;
}
interface DrillData {
  quoteStatus: string;
  resumo: { totalQuotesCount: number; totalValue: number; porStatus: { status: string; quantidade: number; valor: number }[] };
  itens: DrillItem[];
}

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const PAGE = 20;

/** Cores dos status (mesmas da lista de orçamentos). */
export const statusBadgeClasses = (status: string) => {
  switch (status) {
    case 'Orçamento': case 'Em Andamento': case 'Aguardando Aprovação': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
    case 'Aprovado': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
    case 'Aguardando Pagamento': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    case 'Emitir Nota Fiscal': return 'bg-teal-500/10 text-teal-600 border-teal-500/20';
    case 'Cobertura': return 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20';
    case 'Parcialmente Pago': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    case 'Pago': return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
    case 'Cancelado': case 'Rejeitado': return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
    default: return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  }
};

/** Drill da plataforma: orçamentos (oficina e guincho) da plataforma, com quebra por status. */
export function PlatformQuotesDrill({ platformId, quoteStatus }: { platformId: string; quoteStatus: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState<DrillData | null>(null);
  const [error, setError] = useState('');
  // Status escolhido dentro do drill (chips); começa no filtro da tela
  const [status, setStatus] = useState(quoteStatus);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => { setStatus(quoteStatus); }, [quoteStatus]);

  // Carrega todos os orçamentos da plataforma (o filtro da tela, se houver) e filtra os chips no cliente
  useEffect(() => {
    let alive = true;
    setData(null); setError('');
    platformService.listQuotes(platformId, quoteStatus)
      .then(d => { if (alive) setData(d); })
      .catch(() => { if (alive) setError('Não foi possível carregar os orçamentos desta plataforma.'); });
    return () => { alive = false; };
  }, [platformId, quoteStatus]);

  useEffect(() => { setLimit(PAGE); }, [status]);

  const itens = useMemo(
    () => (data?.itens || []).filter(i => status === 'TODOS' || i.status === status),
    [data, status],
  );
  const totalFiltrado = itens.reduce((s, i) => s + (i.valor || 0), 0);

  if (error) return <p className="px-6 py-4 text-sm text-rose-600">{error}</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 px-6 py-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando orçamentos da plataforma…
      </div>
    );
  }
  if (data.itens.length === 0) {
    return <p className="px-6 py-4 text-sm text-muted-foreground">Nenhum orçamento {quoteStatus !== 'TODOS' ? `com status "${quoteStatus}" ` : ''}nesta plataforma.</p>;
  }

  return (
    <div className="space-y-3 px-6 py-4">
      {/* Quebra por status: clique para filtrar a lista */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setStatus('TODOS')}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${status === 'TODOS' ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'}`}
        >
          Todos · {data.resumo.totalQuotesCount} · {brl(data.resumo.totalValue)}
        </button>
        {data.resumo.porStatus.map(s => (
          <button
            key={s.status}
            type="button"
            onClick={() => setStatus(s.status)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${statusBadgeClasses(s.status)} ${status === s.status ? 'ring-2 ring-primary/40' : 'opacity-90 hover:opacity-100'}`}
          >
            {s.status} · {s.quantidade} · {brl(s.valor)}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-background">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {['Nº', 'Tipo', 'Cliente', 'Placa', 'Abertura', 'Status', 'Valor', ''].map(h => (
                <th key={h} className="whitespace-nowrap px-4 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {itens.slice(0, limit).map(i => (
              <tr key={`${i.tipo}-${i.id}`} className="hover:bg-muted/20">
                <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-foreground">#{i.numero}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{i.tipo === 'GUINCHO' ? 'Guincho' : 'Oficina'}</td>
                <td className="max-w-[16rem] truncate px-4 py-2.5" title={i.cliente}>{i.cliente}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{i.placa || '—'}</td>
                <td className="whitespace-nowrap px-4 py-2.5">{new Date(i.createdAt).toLocaleDateString('pt-BR')}</td>
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClasses(i.status)}`}>{i.status}</span>
                </td>
                <td className="whitespace-nowrap px-4 py-2.5 font-medium tabular-nums">{brl(i.valor)}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => navigate(i.tipo === 'GUINCHO' ? `/towing/quotes/edit/${i.id}` : `/quotes/view/${i.id}`)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Abrir <ExternalLink className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/30 text-sm">
              <td colSpan={6} className="px-4 py-2.5 text-muted-foreground">{itens.length} {itens.length === 1 ? 'orçamento' : 'orçamentos'}{status !== 'TODOS' ? ` · ${status}` : ''}</td>
              <td colSpan={2} className="px-4 py-2.5 font-semibold tabular-nums">{brl(totalFiltrado)}</td>
            </tr>
          </tfoot>
        </table>
        {itens.length > limit && (
          <button type="button" onClick={() => setLimit(l => l + PAGE)} className="w-full border-t border-border py-2 text-sm font-medium text-primary hover:bg-secondary">
            Mostrar mais ({itens.length - limit} restantes)
          </button>
        )}
      </div>
    </div>
  );
}
