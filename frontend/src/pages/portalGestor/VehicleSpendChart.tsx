import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';
import { portalGestorApi } from '../../services/portalGestor';
import { Card, EmptyState, Loadable, formatCurrency, inputClass, useLoad } from './ui';

/**
 * Gastos por Veículo (Dashboard do portal): total mensal das OS de cada veículo.
 * Mesma regra de "Custo total" de Finanças / DRE (OS aprovadas, sem pendentes e
 * cancelados), calculada no backend apenas com os veículos da empresa.
 */

// Paleta categórica validada (ordem fixa; CVD e normal-vision PASS no fundo claro)
const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const OTHER_COLOR = '#8f8e89';
const MAX_SERIES = SERIES_COLORS.length;
const OTHER_KEY = '__outros__';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthLabel = (m: { ano: number; mes: number }) => `${MESES[m.mes - 1]}/${String(m.ano).slice(2)}`;

const PERIODS = [
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
  { value: 'ano', label: 'Ano atual' },
];

const compactBRL = (v: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL', maximumFractionDigits: 1 }).format(v);

interface Series { key: string; label: string; color: string; valores: number[]; total: number }

function SpendTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p: any) => Number(p.value) > 0);
  const total = payload.reduce((s: number, p: any) => s + (Number(p.value) || 0), 0);
  return (
    <div className="min-w-[12rem] rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1.5 font-semibold text-foreground">{label}</p>
      {rows.length === 0 ? <p className="text-muted-foreground">Sem gastos no mês</p> : rows.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
            {p.name}
          </span>
          <span className="font-medium tabular-nums text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {rows.length > 1 && (
        <div className="mt-1.5 flex justify-between border-t border-border pt-1.5 font-semibold text-foreground">
          <span>Total</span><span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}

export function VehicleSpendChart() {
  const [periodo, setPeriodo] = useState('12m');
  const [veiculoId, setVeiculoId] = useState('');
  const [view, setView] = useState<'grafico' | 'tabela'>('grafico');
  // Uma consulta por período (todos os veículos); o filtro de veículo é aplicado sobre ela,
  // o que mantém a cor de cada veículo estável ao trocar o filtro.
  const state = useLoad(() => portalGestorApi.gastosVeiculos(periodo), [periodo]);

  const model = useMemo(() => {
    const d: any = state.data;
    if (!d) return null;
    const meses = d.meses.map(monthLabel);
    // Cores por entidade: os 7 veículos de maior gasto no período, em ordem fixa de placa
    const top = [...d.veiculos].slice(0, MAX_SERIES).sort((a: any, b: any) => a.placa.localeCompare(b.placa));
    const colorOf = new Map<string, string>(top.map((v: any, i: number) => [v.veiculoId || v.placa, SERIES_COLORS[i]]));
    let series: Series[];
    if (veiculoId) {
      const v = d.veiculos.find((x: any) => x.veiculoId === veiculoId);
      series = v ? [{ key: v.veiculoId, label: `${v.placa}${v.modelo ? ` · ${v.modelo}` : ''}`, color: colorOf.get(v.veiculoId) || SERIES_COLORS[0], valores: v.valores, total: v.total }] : [];
    } else {
      series = top.map((v: any) => ({ key: v.veiculoId || v.placa, label: `${v.placa}${v.modelo ? ` · ${v.modelo}` : ''}`, color: colorOf.get(v.veiculoId || v.placa)!, valores: v.valores, total: v.total }));
      const rest = d.veiculos.slice(MAX_SERIES);
      if (rest.length) {
        const valores = meses.map((_: string, i: number) => rest.reduce((s: number, v: any) => s + v.valores[i], 0));
        series.push({ key: OTHER_KEY, label: `Outros veículos (${rest.length})`, color: OTHER_COLOR, valores, total: valores.reduce((a: number, b: number) => a + b, 0) });
      }
    }
    const rows = meses.map((mes: string, i: number) => Object.fromEntries([['mes', mes], ...series.map(s => [s.key, s.valores[i]])]));
    const total = series.reduce((s, x) => s + x.total, 0);
    return { meses, series, rows, total, veiculos: d.veiculos };
  }, [state.data, veiculoId]);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Gastos por Veículo</h2>
          <p className="text-xs text-muted-foreground">Total mensal das ordens de serviço de cada veículo{model ? ` · ${formatCurrency(model.total)} no período` : ''}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select aria-label="Período do gráfico" className={`${inputClass} h-9 sm:w-44`} value={periodo} onChange={e => setPeriodo(e.target.value)}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select aria-label="Veículo do gráfico" className={`${inputClass} h-9 sm:w-60`} value={veiculoId} onChange={e => setVeiculoId(e.target.value)}>
            <option value="">Todos os veículos</option>
            {(model?.veiculos || []).filter((v: any) => v.veiculoId).map((v: any) => (
              <option key={v.veiculoId} value={v.veiculoId}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ''}</option>
            ))}
          </select>
          <div role="tablist" aria-label="Forma de exibição" className="flex rounded-lg border border-border p-0.5">
            {([['grafico', 'Gráfico', BarChart3], ['tabela', 'Tabela', Table2]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={view === k} onClick={() => setView(k)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium ${view === k ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                <Icon size={13} aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Loadable state={state}>
        {() => !model || model.series.length === 0 || model.total === 0 ? (
          <EmptyState message={veiculoId ? 'Este veículo não teve gastos com ordens de serviço no período selecionado.' : 'Não há gastos com ordens de serviço no período selecionado.'} />
        ) : view === 'grafico' ? (
          <div className="h-80 px-2 py-4 sm:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={model.rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="18%" barGap={2}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
                <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis axisLine={false} tickLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={compactBRL} />
                <Tooltip content={<SpendTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" iconSize={10} formatter={(v: string) => <span className="text-foreground">{v}</span>} />
                {model.series.map(s => (
                  <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={28} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Veículo</th>
                  {model.meses.map((m: string) => <th key={m} className="whitespace-nowrap px-3 py-2.5 text-right font-medium">{m}</th>)}
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {model.series.map(s => (
                  <tr key={s.key}>
                    <td className="whitespace-nowrap px-4 py-2">
                      <span className="mr-2 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: s.color }} aria-hidden="true" />
                      {s.label}
                    </td>
                    {s.valores.map((v, i) => <td key={i} className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{v ? formatCurrency(v) : '—'}</td>)}
                    <td className="whitespace-nowrap px-4 py-2 text-right font-medium tabular-nums">{formatCurrency(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Loadable>
    </Card>
  );
}
