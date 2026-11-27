import { useEffect, useMemo, useState } from 'react';
import { Truck, X } from 'lucide-react';
import { api } from '../../services/api';
import { ChartHover, chartMetricRow, chartRow, chartRows, formatChartCurrency, formatChartPercent, sharePercent } from '../../components/charts/ChartTooltip';

interface VehicleCost {
  veiculoId: string; placa: string; marca: string; modelo: string; clienteId: string; cliente: string;
  porMes: number[]; total: number;
}
interface CostsData {
  meses: number; periodos: number[];
  months: { key: string; label: string }[];
  totalPorMes: number[]; total: number;
  veiculos: VehicleCost[];
  clientes: { clienteId: string; cliente: string }[];
  opcoesVeiculos: { veiculoId: string; placa: string; modelo: string; clienteId: string }[];
}

// Cores das séries (veículos com mais custo); o restante vira "Outros"
const SERIES_COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#e11d48'];
const OTHERS_COLOR = '#94a3b8';
const TOP = SERIES_COLORS.length;
const PAGE = 10;

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const selectClass = 'rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-1.5 text-sm text-gray-800 dark:text-white';

/** Evolução de custos mensais com filtro e separação por veículo. */
/** clienteId vem do filtro de cliente do topo do Dashboard de Frotas ('' = todos). */
export function MonthlyCostsByVehicle({ clienteId = '' }: { clienteId?: string }) {
  const [meses, setMeses] = useState(6);
  const [veiculoId, setVeiculoId] = useState('');
  const [data, setData] = useState<CostsData | null>(null);
  const [opcoes, setOpcoes] = useState<{ clientes: CostsData['clientes']; veiculos: CostsData['opcoesVeiculos'] }>({ clientes: [], veiculos: [] });
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    let alive = true;
    setError('');
    api.get<CostsData>('/fleet/dashboard/custos-mensais', { params: { meses, clienteId: clienteId || undefined, veiculoId: veiculoId || undefined } })
      .then(r => {
        if (!alive) return;
        setData(r.data);
        setOpcoes({ clientes: r.data.clientes || [], veiculos: r.data.opcoesVeiculos || [] });
      })
      .catch(() => { if (alive) setError('Não foi possível carregar os custos mensais.'); });
    return () => { alive = false; };
  }, [meses, clienteId, veiculoId]);

  useEffect(() => { setLimit(PAGE); }, [meses, clienteId, veiculoId]);
  // Troca de cliente no topo: o veículo escolhido pode não ser dele
  useEffect(() => { setVeiculoId(''); }, [clienteId]);

  const veiculoOptions = useMemo(
    () => opcoes.veiculos.filter(v => !clienteId || v.clienteId === clienteId),
    [opcoes.veiculos, clienteId],
  );

  // Séries das barras: os 5 veículos com mais custo + "Outros"
  const series = useMemo(() => {
    if (!data) return [];
    const top = data.veiculos.slice(0, TOP).map((v, i) => ({ key: v.veiculoId, label: v.placa, color: SERIES_COLORS[i], porMes: v.porMes }));
    const rest = data.veiculos.slice(TOP);
    if (rest.length) {
      top.push({
        key: 'outros', label: `Outros (${rest.length})`, color: OTHERS_COLOR,
        porMes: data.months.map((_, i) => rest.reduce((s, v) => s + v.porMes[i], 0)),
      });
    }
    return top;
  }, [data]);

  const maxMonth = Math.max(1, ...(data?.totalPorMes || []));
  const selectedVehicle = opcoes.veiculos.find(v => v.veiculoId === veiculoId);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Evolução de Custos Mensais por Veículo</h3>
          <p className="text-sm text-gray-400">OS pagas e custos lançados nos veículos, mês a mês.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5">
            <Truck size={15} className="text-gray-400" />
            <select aria-label="Filtrar custos por veículo" className={`${selectClass} w-44`} value={veiculoId} onChange={e => setVeiculoId(e.target.value)}>
              <option value="">Todos os veículos</option>
              {veiculoOptions.map(v => <option key={v.veiculoId} value={v.veiculoId}>{v.placa} — {v.modelo}</option>)}
            </select>
          </label>
          <select aria-label="Período dos custos" className={selectClass} value={meses} onChange={e => setMeses(Number(e.target.value))}>
            {(data?.periodos || [3, 6, 12]).map(m => <option key={m} value={m}>Últimos {m} meses</option>)}
          </select>
          {veiculoId && (
            <button type="button" onClick={() => setVeiculoId('')} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
              <X size={13} /> Limpar
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : !data ? (
        <div className="flex justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-indigo-500" /></div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Total no período{selectedVehicle ? ` (${selectedVehicle.placa})` : ''}: <b className="text-gray-800 dark:text-white">{brl(data.total)}</b>
          </p>

          {/* Barras mensais empilhadas por veículo */}
          {data.total === 0 ? (
            <div className="py-8 text-center text-gray-400">Sem custos registrados no período.</div>
          ) : (
            <div className="space-y-3">
              {data.months.map((m, i) => {
                const totalMes = data.totalPorMes[i];
                return (
                  <ChartHover
                    key={m.key}
                    className="flex items-center gap-4 rounded-lg"
                    title={m.label}
                    rows={chartRows([
                      ...series.filter(s => s.porMes[i] > 0).map(s => chartMetricRow(s.label, formatChartCurrency(s.porMes[i]), s.color)),
                      chartRow('Total do mês', formatChartCurrency(totalMes)),
                      chartRow('Participação no período', formatChartPercent(sharePercent(totalMes, data.total))),
                    ])}
                  >
                    <div className="w-16 text-sm font-semibold text-gray-600 dark:text-gray-400">{m.label}</div>
                    <div className="relative flex h-6 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className="flex h-full" style={{ width: `${(totalMes / maxMonth) * 100}%` }}>
                        {series.map(s => s.porMes[i] > 0 && (
                          <span key={s.key} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(s.porMes[i] / (totalMes || 1)) * 100}%`, backgroundColor: s.color }} />
                        ))}
                      </div>
                    </div>
                    <div className="w-28 text-right text-sm font-bold text-gray-800 dark:text-white">{brl(totalMes)}</div>
                  </ChartHover>
                );
              })}
              {/* Legenda */}
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 text-xs text-gray-600 dark:text-gray-400">
                {series.map(s => (
                  <li key={s.key} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />{s.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Custo por veículo no período */}
          {data.veiculos.length > 0 && !veiculoId && (
            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
                  <tr>
                    {['Veículo', 'Cliente', 'Custo no período', '%'].map(h => <th key={h} className="whitespace-nowrap px-4 py-2 font-semibold">{h}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {data.veiculos.slice(0, limit).map((v, i) => (
                    <tr key={v.veiculoId} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/40" onClick={() => setVeiculoId(v.veiculoId)} title="Ver a evolução deste veículo">
                      <td className="whitespace-nowrap px-4 py-2">
                        <span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: i < TOP ? SERIES_COLORS[i] : OTHERS_COLOR }} />
                        <b className="text-gray-800 dark:text-white">{v.placa}</b>
                        <span className="ml-1.5 text-xs text-gray-500 dark:text-gray-400">{v.marca} {v.modelo}</span>
                      </td>
                      <td className="max-w-[14rem] truncate px-4 py-2 text-gray-600 dark:text-gray-300" title={v.cliente}>{v.cliente}</td>
                      <td className="whitespace-nowrap px-4 py-2 font-semibold tabular-nums text-gray-800 dark:text-white">{brl(v.total)}</td>
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums text-gray-500 dark:text-gray-400">{formatChartPercent(sharePercent(v.total, data.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.veiculos.length > limit && (
                <button type="button" onClick={() => setLimit(l => l + 25)} className="w-full border-t border-gray-100 py-2 text-sm font-medium text-indigo-600 hover:bg-gray-50 dark:border-gray-700 dark:text-indigo-400">
                  Mostrar mais ({data.veiculos.length - limit} restantes)
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
