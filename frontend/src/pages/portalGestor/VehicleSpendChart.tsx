import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Table2 } from 'lucide-react';
import { portalGestorApi } from '../../services/portalGestor';
import { Card, EmptyState, Loadable, formatCurrency, inputClass, useLoad } from './ui';

/**
 * Gastos por Veículo (Dashboard do portal).
 * Para cada mês, uma barra por veículo, empilhada por tipo de serviço:
 * Peças/Serviços e Mão de Obra. Valores calculados no backend com a mesma regra
 * de "Custo total" do Financeiro (OS aprovadas, sem pendentes e cancelados);
 * os dois segmentos somam o total do veículo no mês.
 */

// Tipos de serviço (paleta categórica validada: slots 1 e 2)
const TYPES = [
  { key: 'pecas', label: 'Peças/Serviços', color: '#eb6834' },
  { key: 'maoDeObra', label: 'Mão de Obra', color: '#2a78d6' },
] as const;
const MAX_VEHICLES = 7;
const OTHER_KEY = '__outros__';
const SEP = '__';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const monthLabel = (m: { ano: number; mes: number }) => `${MESES[m.mes - 1]}/${String(m.ano).slice(2)}`;

const PERIODS = [
  { value: '6m', label: 'Últimos 6 meses' },
  { value: '12m', label: 'Últimos 12 meses' },
  { value: 'ano', label: 'Ano atual' },
  { value: 'mes', label: 'Por mês' },
];

/** Mês atual no formato AAAA-MM (valor do input type="month"). */
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const compactBRL = (v: number) => new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL', maximumFractionDigits: 1 }).format(v);

interface Vehicle {
  key: string; placa: string; modelo: string;
  valores: number[]; pecas: number[]; maoDeObra: number[];
  total: number; totalPecas: number; totalMaoDeObra: number;
}

/** Tooltip do segmento: placa, modelo, tipo de serviço, valor e total do veículo no mês. */
function SegmentTooltip({ active, payload, label, vehicles }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const [vehicleKey, typeKey] = String(p.dataKey).split(SEP);
  const v: Vehicle | undefined = vehicles.find((x: Vehicle) => x.key === vehicleKey);
  const type = TYPES.find(t => t.key === typeKey);
  if (!v || !type) return null;
  const row = p.payload;
  const totalMes = (row[`${vehicleKey}${SEP}pecas`] || 0) + (row[`${vehicleKey}${SEP}maoDeObra`] || 0);
  return (
    <div className="min-w-[13rem] rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{v.placa}</p>
      {v.modelo && <p className="text-muted-foreground">{v.modelo}</p>}
      <p className="mt-1 text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="h-2 w-2 rounded-sm" style={{ background: type.color }} aria-hidden="true" />{type.label}
        </span>
        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(p.value)}</span>
      </div>
      <div className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5 text-muted-foreground">
        <span>Total do veículo no mês</span>
        <span className="font-medium tabular-nums text-foreground">{formatCurrency(totalMes)}</span>
      </div>
    </div>
  );
}

export function VehicleSpendChart({ statusOs = 'Pago' }: { statusOs?: string }) {
  const [periodo, setPeriodo] = useState('12m');
  // Período por mês: um mês só (de = até) ou intervalo de meses
  const [de, setDe] = useState(currentMonth());
  const [ate, setAte] = useState(currentMonth());
  const rangeInvalid = periodo === 'mes' && (!de || !ate || de > ate);
  const [veiculoId, setVeiculoId] = useState('');
  const [view, setView] = useState<'grafico' | 'tabela'>('grafico');
  const state = useLoad(
    () => portalGestorApi.gastosVeiculos(periodo, periodo === 'mes' ? { de, ate, statusOs } : { statusOs }),
    [periodo, periodo === 'mes' ? de : '', periodo === 'mes' ? ate : '', statusOs],
  );

  const model = useMemo(() => {
    const d: any = state.data;
    if (!d) return null;
    const meses: string[] = d.meses.map(monthLabel);
    const toVehicle = (v: any): Vehicle => ({
      key: v.veiculoId || `placa-${v.placa}`, placa: v.placa, modelo: v.modelo,
      valores: v.valores, pecas: v.pecas, maoDeObra: v.maoDeObra,
      total: v.total, totalPecas: v.totalPecas, totalMaoDeObra: v.totalMaoDeObra,
    });
    let vehicles: Vehicle[];
    if (veiculoId) {
      vehicles = d.veiculos.filter((v: any) => v.veiculoId === veiculoId).map(toVehicle);
    } else {
      // Até 7 veículos de maior gasto, em ordem de placa; os demais somados em "Outros veículos"
      vehicles = d.veiculos.slice(0, MAX_VEHICLES).map(toVehicle).sort((a: Vehicle, b: Vehicle) => a.placa.localeCompare(b.placa));
      const rest = d.veiculos.slice(MAX_VEHICLES);
      if (rest.length) {
        const sum = (k: string) => meses.map((_, i) => Math.round(rest.reduce((s: number, v: any) => s + v[k][i], 0) * 100) / 100);
        const pecas = sum('pecas');
        const maoDeObra = sum('maoDeObra');
        const valores = pecas.map((p, i) => Math.round((p + maoDeObra[i]) * 100) / 100);
        const totalPecas = rest.reduce((s: number, v: any) => s + v.totalPecas, 0);
        const totalMaoDeObra = rest.reduce((s: number, v: any) => s + v.totalMaoDeObra, 0);
        vehicles.push({ key: OTHER_KEY, placa: `Outros veículos (${rest.length})`, modelo: '', valores, pecas, maoDeObra, totalPecas, totalMaoDeObra, total: totalPecas + totalMaoDeObra });
      }
    }
    const rows = meses.map((mes, i) => {
      const row: Record<string, any> = { mes };
      vehicles.forEach(v => {
        row[`${v.key}${SEP}pecas`] = v.pecas[i];
        row[`${v.key}${SEP}maoDeObra`] = v.maoDeObra[i];
        row[`${v.key}${SEP}placa`] = v.valores[i] ? v.placa : '';
      });
      return row;
    });
    const total = vehicles.reduce((s, v) => s + v.total, 0);
    // Placa sobre a barra só quando há poucas barras (evita poluir o gráfico)
    const bars = meses.length * vehicles.length;
    const showLabels = bars <= 24;
    // Largura fixa por quantidade de barras: o grupo de cada mês fica junto e centralizado
    const barSize = bars <= 8 ? 28 : bars <= 24 ? 18 : bars <= 48 ? 10 : 6;
    return { meses, vehicles, rows, total, showLabels, barSize, all: d.veiculos };
  }, [state.data, veiculoId]);

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Gastos por Veículo</h2>
          <p className="text-xs text-muted-foreground">Total mensal das ordens de serviço de cada veículo, por tipo de serviço{model ? ` · ${formatCurrency(model.total)} no período` : ''}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <select aria-label="Período do gráfico" className={`${inputClass} h-9 sm:w-40`} value={periodo} onChange={e => setPeriodo(e.target.value)}>
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          {periodo === 'mes' && (
            <div className="flex items-center gap-2">
              <input type="month" aria-label="Mês inicial" className={`${inputClass} h-9 sm:w-48`} value={de} max={ate || undefined} onChange={e => setDe(e.target.value)} />
              <span className="text-xs text-muted-foreground">até</span>
              <input type="month" aria-label="Mês final" className={`${inputClass} h-9 sm:w-48`} value={ate} min={de || undefined} onChange={e => setAte(e.target.value)} />
            </div>
          )}
          <select aria-label="Veículo do gráfico" className={`${inputClass} h-9 sm:w-56`} value={veiculoId} onChange={e => setVeiculoId(e.target.value)}>
            <option value="">Todos os veículos</option>
            {(model?.all || []).filter((v: any) => v.veiculoId).map((v: any) => (
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

      {rangeInvalid ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">Escolha o mês inicial e o mês final (o inicial não pode ser depois do final).</p>
      ) : (
        <Loadable state={state}>
          {() => !model || model.vehicles.length === 0 || model.total === 0 ? (
            <EmptyState message={veiculoId ? 'Este veículo não teve gastos com ordens de serviço no período selecionado.' : 'Não há gastos com ordens de serviço no período selecionado.'} />
          ) : view === 'grafico' ? (
            <div className="px-2 py-4 sm:px-4">
              {/* Legenda dos tipos de serviço */}
              <div className="mb-2 flex flex-wrap items-center gap-4 px-2 text-xs">
                {TYPES.map(t => (
                  <span key={t.key} className="flex items-center gap-1.5 text-foreground">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: t.color }} aria-hidden="true" />{t.label}
                  </span>
                ))}
                <span className="text-muted-foreground">· Uma barra por veículo em cada mês; passe o mouse para ver placa, modelo e valores.</span>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={model.rows} margin={{ top: model.showLabels ? 18 : 4, right: 8, left: 0, bottom: 0 }} barSize={model.barSize} barGap={model.showLabels ? 20 : model.barSize >= 18 ? 6 : 2}>
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} width={64} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={compactBRL} />
                    <Tooltip shared={false} content={<SegmentTooltip vehicles={model.vehicles} />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                    {model.vehicles.flatMap(v => TYPES.map((t, ti) => (
                      <Bar
                        key={`${v.key}${SEP}${t.key}`}
                        dataKey={`${v.key}${SEP}${t.key}`}
                        stackId={v.key}
                        name={`${v.placa} · ${t.label}`}
                        fill={t.color}
                        stroke="hsl(var(--card))"
                        strokeWidth={1}
                        radius={ti === TYPES.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      >
                        {model.showLabels && ti === TYPES.length - 1 && (
                          <LabelList dataKey={`${v.key}${SEP}placa`} position="top" style={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        )}
                      </Bar>
                    )))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Total de cada veículo no período */}
              <div className="mt-3 grid gap-2 px-2 sm:grid-cols-2 xl:grid-cols-4">
                {model.vehicles.map(v => (
                  <div key={v.key} className="rounded-lg border border-border px-3 py-2 text-xs">
                    <p className="truncate font-semibold text-foreground" title={`${v.placa}${v.modelo ? ` · ${v.modelo}` : ''}`}>
                      {v.placa}{v.modelo ? <span className="font-normal text-muted-foreground"> · {v.modelo}</span> : null}
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{formatCurrency(v.total)}</p>
                    <p className="text-muted-foreground tabular-nums">Peças/Serviços {formatCurrency(v.totalPecas)} · Mão de Obra {formatCurrency(v.totalMaoDeObra)}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-2.5 font-medium">Veículo</th>
                    <th className="whitespace-nowrap px-3 py-2.5 font-medium">Tipo</th>
                    {model.meses.map(m => <th key={m} className="whitespace-nowrap px-3 py-2.5 text-right font-medium">{m}</th>)}
                    <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Total</th>
                  </tr>
                </thead>
                {model.vehicles.map(v => (
                  <tbody key={v.key} className="border-b border-border">
                    {[...TYPES.map(t => ({ label: t.label, color: t.color as string | null, vals: v[t.key], tot: t.key === 'pecas' ? v.totalPecas : v.totalMaoDeObra })),
                      { label: 'Total', color: null, vals: v.valores, tot: v.total }].map((r, ri) => (
                      <tr key={r.label} className={r.color ? '' : 'bg-muted/30 font-semibold'}>
                        {ri === 0 && (
                          <td rowSpan={3} className="whitespace-nowrap px-4 py-2 align-top font-medium">
                            {v.placa}{v.modelo && <span className="block text-xs font-normal text-muted-foreground">{v.modelo}</span>}
                          </td>
                        )}
                        <td className="whitespace-nowrap px-3 py-1.5 text-xs">
                          {r.color && <span className="mr-1.5 inline-block h-2 w-2 rounded-sm align-middle" style={{ background: r.color }} aria-hidden="true" />}
                          {r.label}
                        </td>
                        {r.vals.map((x: number, i: number) => <td key={i} className="whitespace-nowrap px-3 py-1.5 text-right tabular-nums">{x ? formatCurrency(x) : '—'}</td>)}
                        <td className="whitespace-nowrap px-4 py-1.5 text-right tabular-nums">{formatCurrency(r.tot)}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </Loadable>
      )}
    </Card>
  );
}
