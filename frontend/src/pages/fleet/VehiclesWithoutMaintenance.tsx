import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, Users, WrenchIcon, X } from 'lucide-react';
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
  const [cliente, setCliente] = useState<{ id: string; nome: string } | null>(null);
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    setData(null);
    setError('');
    api.get<Summary>('/fleet/dashboard/sem-manutencao', { params: { dias } })
      .then(r => { if (alive) setData(r.data); })
      .catch(() => { if (alive) setError('Não foi possível carregar os veículos sem manutenção.'); });
    return () => { alive = false; };
  }, [dias]);

  useEffect(() => { setLimit(PAGE); }, [dias, cliente]);

  const rows = useMemo(
    () => (data?.veiculos || []).filter(r => !cliente || r.clienteId === cliente.id),
    [data, cliente],
  );
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
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Clock size={16} className="text-gray-400" />
          Sem manutenção há mais de
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
                {data.percentualSemManutencao.toLocaleString('pt-BR')}% dos {data.totalAtivos} veículos ativos · há mais de {periodLabel(data.dias)}
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Tempo desde a última manutenção */}
            <div>
              <h4 className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">Tempo desde a última manutenção</h4>
              <ul className="space-y-2.5">
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

            {/* Clientes com mais veículos sem manutenção */}
            <div>
              <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-gray-700 dark:text-gray-200">
                <Users size={15} /> Clientes com mais veículos sem manutenção
              </h4>
              {data.porCliente.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum cliente com veículos sem manutenção no período.</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.porCliente.map(c => (
                    <li key={c.clienteId}>
                      <button
                        type="button"
                        onClick={() => setCliente(cliente?.id === c.clienteId ? null : { id: c.clienteId, nome: c.cliente })}
                        className={`flex w-full items-center justify-between gap-3 px-2 py-2 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700 ${cliente?.id === c.clienteId ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                      >
                        <span className="min-w-0 truncate text-gray-700 dark:text-gray-200">{c.cliente}</span>
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          <b className="text-sm text-rose-600 dark:text-rose-400">{c.semManutencao}</b> de {c.total}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Lista de veículos */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm font-bold text-gray-700 dark:text-gray-200">
                Veículos sem manutenção ({rows.length})
              </h4>
              {cliente && (
                <button type="button" onClick={() => setCliente(null)} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                  {cliente.nome} <X size={12} aria-label="Remover filtro de cliente" />
                </button>
              )}
            </div>
            {rows.length === 0 ? (
              <p className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                Todos os veículos ativos tiveram manutenção nos últimos {periodLabel(data.dias)}.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                    <tr>
                      {['Placa', 'Veículo', 'Cliente', 'Última manutenção', 'Dias sem manutenção', 'KM atual', ''].map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-2.5 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.slice(0, limit).map(r => (
                      <tr key={r.veiculoId} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                        <td className="whitespace-nowrap px-4 py-2.5 font-semibold text-gray-800 dark:text-white">{r.placa}</td>
                        <td className="whitespace-nowrap px-4 py-2.5 text-gray-600 dark:text-gray-300">{r.marca} {r.modelo}</td>
                        <td className="max-w-[16rem] truncate px-4 py-2.5 text-gray-600 dark:text-gray-300" title={r.cliente}>{r.cliente}</td>
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
                {rows.length > limit && (
                  <button type="button" onClick={() => setLimit(l => l + 25)} className="w-full border-t border-gray-100 py-2.5 text-sm font-medium text-indigo-600 hover:bg-gray-50 dark:border-gray-700 dark:text-indigo-400 dark:hover:bg-gray-700/40">
                    Mostrar mais ({rows.length - limit} restantes)
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
