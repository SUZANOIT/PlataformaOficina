import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ChevronDown, Clock, Users, WrenchIcon, X } from 'lucide-react';
import { api } from '../../services/api';

interface Row {
  veiculoId: string; placa: string; marca: string; modelo: string; kmAtual: number;
  clienteId: string; cliente: string; ultimaManutencao: string | null; diasSemManutencao: number | null;
}
interface Summary {
  dias: number; periodos: number[]; totalAtivos: number; semManutencao: number; emDia: number;
  nuncaManutencao: number; percentualSemManutencao: number;
  faixas: { key: string; label: string; total: number }[];
  porCliente: { clienteId: string; cliente: string; total: number; semManutencao: number }[];
  veiculos: Row[];
  clienteId: string | null;
  clientes: { clienteId: string; cliente: string }[];
}

const FAIXA_COLOR: Record<string, string> = {
  ate30: 'bg-emerald-500', de31a90: 'bg-lime-500', de91a180: 'bg-amber-500',
  de181a365: 'bg-orange-500', mais365: 'bg-rose-500', nunca: 'bg-rose-700',
};
const PAGE = 10;
const fmtDate = (v: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const periodLabel = (d: number) => (d === 365 ? '1 ano' : `${d} dias`);

/** Dashboard: veículos ativos sem manutenção (OS, revisão, manutenção ou troca de óleo) no período. */
export function VehiclesWithoutMaintenance() {
  const [dias, setDias] = useState(90);
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState('');
  const [clienteId, setClienteId] = useState('');
  // Opções do filtro ficam guardadas entre as cargas (o select não pisca ao trocar)
  const [clientes, setClientes] = useState<Summary['clientes']>([]);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [limits, setLimits] = useState<Record<string, number>>({});
  const toggle = (id: string) => setClosed(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    api.get<Summary>('/fleet/dashboard/sem-manutencao', { params: { dias, clienteId: clienteId || undefined } })
      .then(r => { if (alive) { setData(r.data); setClientes(r.data.clientes || []); } })
      .catch(() => { if (alive) setError('Não foi possível carregar os veículos sem manutenção.'); });
    return () => { alive = false; };
  }, [dias, clienteId]);

  useEffect(() => { setLimits({}); }, [dias, clienteId]);

  // O backend já devolve só o cliente filtrado (indicadores, faixas e lista)
  const rows = data?.veiculos || [];
  // Clientes na ordem do backend (mais veículos sem manutenção primeiro); veículos mais críticos primeiro
  const groups = useMemo(() => (data?.porCliente || [])
    .map(c => ({ ...c, veiculos: rows.filter(r => r.clienteId === c.clienteId) }))
    .filter(g => g.veiculos.length > 0), [data, rows]);
  const clienteNome = clientes.find(c => c.clienteId === clienteId)?.cliente;
  const maxFaixa = Math.max(1, ...(data?.faixas || []).map(f => f.total));

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="flex flex-col gap-3 border-b border-gray-100 dark:border-gray-700 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-white">
            <AlertTriangle size={20} className="text-rose-500" /> Veículos sem manutenção
          </h3>
          <p className="text-sm text-gray-400">
            Veículos ativos sem Ordem de Serviço, revisão, manutenção ou troca de óleo no período.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Users size={16} className="shrink-0 text-gray-400" />
          <span className="sr-only">Cliente</span>
          <select
            aria-label="Filtrar por cliente"
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-800 dark:text-white sm:w-64"
          >
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.clienteId} value={c.clienteId}>{c.cliente}</option>)}
          </select>
          {clienteId && (
            <button type="button" onClick={() => setClienteId('')} aria-label="Limpar filtro de cliente" className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700">
              <X size={14} />
            </button>
          )}
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Clock size={16} className="shrink-0 text-gray-400" />
          <span className="whitespace-nowrap">Sem manutenção há mais de</span>
          <select
            aria-label="Período sem manutenção"
            value={dias}
            onChange={e => setDias(Number(e.target.value))}
            className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm font-semibold text-gray-800 dark:text-white"
          >
            {(data?.periodos || [30, 60, 90, 180, 365]).map(d => <option key={d} value={d}>{periodLabel(d)}</option>)}
          </select>
        </label>
        </div>
      </div>

      {error ? (
        <p className="p-6 text-sm text-rose-600">{error}</p>
      ) : !data ? (
        <div className="flex justify-center p-10"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500" /></div>
      ) : (
        <div className="space-y-6 p-6">
          {/* Indicadores */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-900/20">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">Sem manutenção</span>
              <p className="mt-1 text-3xl font-extrabold text-rose-700 dark:text-rose-300">{data.semManutencao}</p>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/80">
                {data.percentualSemManutencao.toLocaleString('pt-BR')}% dos {data.totalAtivos} veículos ativos{clienteNome ? ` de ${clienteNome}` : ''} · há mais de {periodLabel(data.dias)}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Nunca tiveram manutenção</span>
              <p className="mt-1 text-3xl font-extrabold text-gray-800 dark:text-white">{data.nuncaManutencao}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sem nenhuma OS ou registro de manutenção</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/40 dark:bg-emerald-900/20">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <CheckCircle size={13} /> Em dia
              </span>
              <p className="mt-1 text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">{data.emDia}</p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">Com manutenção nos últimos {periodLabel(data.dias)} ou em manutenção agora</p>
            </div>
          </div>

          {/* Tempo desde a última manutenção */}
          <div>
            <h4 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">Tempo desde a última manutenção</h4>
            <ul className="grid gap-x-8 gap-y-2.5 md:grid-cols-2">
              {data.faixas.map(f => (
                <li key={f.key} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 text-gray-600 dark:text-gray-400">{f.label}</span>
                  <span className="relative h-5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                    <span className={`absolute inset-y-0 left-0 rounded-full ${FAIXA_COLOR[f.key] || 'bg-indigo-500'}`} style={{ width: `${(f.total / maxFaixa) * 100}%` }} />
                  </span>
                  <span className="w-10 text-right font-bold tabular-nums text-gray-800 dark:text-white">{f.total}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Veículos sem manutenção separados por cliente */}
          <div>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                <Users size={15} /> Por cliente ({groups.length} {groups.length === 1 ? 'cliente' : 'clientes'} · {rows.length} {rows.length === 1 ? 'veículo' : 'veículos'})
              </h4>
            </div>

            {groups.length === 0 ? (
              <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                {clienteNome ? `Todos os veículos ativos de ${clienteNome}` : 'Todos os veículos ativos'} tiveram manutenção nos últimos {periodLabel(data.dias)}.
              </p>
            ) : (
              <div className="space-y-3">
                {groups.map(g => {
                  const isOpen = !closed.has(g.clienteId);
                  const shown = limits[g.clienteId] ?? PAGE;
                  const pct = g.total ? Math.round((g.semManutencao / g.total) * 100) : 0;
                  return (
                    <div key={g.clienteId} className="overflow-hidden rounded-lg border border-gray-100 dark:border-gray-700">
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() => toggle(g.clienteId)}
                        className="flex w-full items-center gap-3 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-900/60"
                      >
                        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-gray-800 dark:text-white">{g.cliente}</span>
                          <span className="mt-1 flex items-center gap-2">
                            <span className="relative h-1.5 w-28 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                              <span className="absolute inset-y-0 left-0 rounded-full bg-rose-500" style={{ width: `${pct}%` }} />
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{pct}% da frota do cliente</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
                          <b className="block text-lg leading-tight text-rose-600 dark:text-rose-400">{g.semManutencao}</b>
                          de {g.total} {g.total === 1 ? 'veículo' : 'veículos'}
                        </span>
                      </button>
                      {isOpen && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-gray-500 dark:text-gray-400">
                              <tr className="border-b border-gray-100 dark:border-gray-700">
                                {['Placa', 'Veículo', 'Última manutenção', 'Dias sem manutenção', 'KM atual', ''].map(h => (
                                  <th key={h} className="whitespace-nowrap px-4 py-2 font-semibold">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {g.veiculos.slice(0, shown).map(r => (
                                <tr key={r.veiculoId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                  <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-gray-800 dark:text-white">{r.placa}</td>
                                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-300">{r.marca} {r.modelo}</td>
                                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-300">{fmtDate(r.ultimaManutencao)}</td>
                                  <td className="whitespace-nowrap px-4 py-2.5">
                                    {r.diasSemManutencao === null ? (
                                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">Nunca</span>
                                    ) : (
                                      <span className={`font-semibold tabular-nums ${r.diasSemManutencao > 365 ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {r.diasSemManutencao.toLocaleString('pt-BR')} dias
                                      </span>
                                    )}
                                  </td>
                                  <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600 dark:text-gray-300">{r.kmAtual.toLocaleString('pt-BR')} km</td>
                                  <td className="whitespace-nowrap px-4 py-2.5 text-right">
                                    <Link to={`/fleet/vehicles/${r.veiculoId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                                      <WrenchIcon size={13} /> Ver veículo
                                    </Link>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {g.veiculos.length > shown && (
                            <button type="button" onClick={() => setLimits(l => ({ ...l, [g.clienteId]: shown + 25 }))} className="w-full border-t border-gray-100 py-2 text-sm font-medium text-indigo-600 hover:bg-gray-50 dark:border-gray-700 dark:text-indigo-400 dark:hover:bg-gray-700/40">
                              Mostrar mais ({g.veiculos.length - shown} restantes)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
