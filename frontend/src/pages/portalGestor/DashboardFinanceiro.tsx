import { useState } from 'react';
import { portalGestorApi } from '../../services/portalGestor';
import { Card, EmptyState, Loadable, Stat, StatusBadge, Table, formatCurrency, formatDate, inputClass, useLoad } from './ui';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Seção Financeiro do Dashboard (antiga tela Finanças / DRE, unificada).
 * Indicadores do ano, conciliação, DRE mensal e títulos lançados pela oficina,
 * pela mesma regra única do backend (GET /portal-gestor/financeiro).
 */
export function DashboardFinanceiro() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [aba, setAba] = useState<'dre' | 'titulos'>('dre');
  const state = useLoad(() => portalGestorApi.financeiro(ano), [ano]);

  return (
    <section aria-labelledby="dash-financeiro" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="dash-financeiro" className="text-base font-semibold text-foreground">Financeiro</h2>
          <p className="text-xs text-muted-foreground">Custos da frota com a oficina e situação dos pagamentos.</p>
        </div>
        <div className="w-28 shrink-0">
          <select aria-label="Ano" className={`${inputClass} h-9`} value={ano} onChange={e => setAno(Number(e.target.value))}>
            {Array.from({ length: 6 }, (_, i) => anoAtual - i).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      <Loadable state={state}>
        {(d: any) => (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <Stat label={`Custo total em ${d.ano}`} value={formatCurrency(d.resumo.total)} hint={`${d.resumo.quantidadeOs} ordens de serviço`} />
              <Stat label="Peças" value={formatCurrency(d.resumo.pecas)} />
              <Stat label="Mão de obra / Serviços" value={formatCurrency(d.resumo.servicos)} hint={d.resumo.ajustes !== 0 ? `Ajustes: ${formatCurrency(d.resumo.ajustes)}` : undefined} />
              <Stat label="Pago" value={formatCurrency(d.resumo.pago)} tone="ok" hint={d.resumo.coberto > 0 ? `${formatCurrency(d.resumo.coberto)} coberto` : undefined} />
              <Stat label="Em aberto" value={formatCurrency(d.resumo.emAberto)} tone={d.resumo.emAberto > 0 ? 'warn' : 'default'} />
              <Stat label="Vencido" value={formatCurrency(d.resumo.vencido)} tone={d.resumo.vencido > 0 ? 'danger' : 'ok'} />
            </div>
            <p className="text-xs text-muted-foreground">
              Ordens de serviço de {d.ano} pela data de abertura: {formatCurrency(d.resumo.totalOs)} = {formatCurrency(d.resumo.pago)} pago + {formatCurrency(d.resumo.emAberto)} em aberto{d.resumo.coberto > 0 ? ` + ${formatCurrency(d.resumo.coberto)} coberto` : ''}.
            </p>

            <Card>
              <div role="tablist" aria-label="Detalhamento financeiro" className="flex border-b border-border px-2">
                {([['dre', 'DRE mensal'], ['titulos', `Títulos (${d.titulos.length})`]] as const).map(([k, label]) => (
                  <button key={k} type="button" role="tab" aria-selected={aba === k} onClick={() => setAba(k)}
                    className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium ${aba === k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {label}
                  </button>
                ))}
              </div>

              {aba === 'dre' ? (
                // DRE na horizontal: meses nas colunas, para caber no Dashboard
                <div className="w-full overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="whitespace-nowrap px-4 py-2.5 font-medium"> </th>
                        {d.meses.map((m: any) => <th key={m.mes} className="whitespace-nowrap px-2 py-2.5 text-right font-medium">{MESES[m.mes - 1]}</th>)}
                        <th className="whitespace-nowrap px-4 py-2.5 text-right font-semibold text-foreground">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {([
                        ['Peças', 'pecas'],
                        ['Mão de obra / Serviços', 'servicos'],
                        ...(d.resumo.ajustes !== 0 ? [['Ajustes', 'ajustes']] : []),
                        ['Total', 'total'],
                      ] as [string, string][]).map(([label, key]) => (
                        <tr key={key} className={key === 'total' ? 'bg-muted/40 font-semibold' : ''}>
                          <td className="whitespace-nowrap px-4 py-2">{label}</td>
                          {d.meses.map((m: any) => (
                            <td key={m.mes} className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${m[key] ? '' : 'text-muted-foreground'}`}>
                              {m[key] ? formatCurrency(m[key]) : '—'}
                            </td>
                          ))}
                          <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums">{formatCurrency(d.resumo[key])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : d.titulos.length === 0 ? (
                <EmptyState message={`Nenhum título lançado pela oficina com vencimento em ${d.ano}.`} />
              ) : (
                <Table head={['Nº', 'Descrição', 'Emissão', 'Vencimento', 'Pagamento', 'Forma', 'Valor', 'Situação']}>
                  {d.titulos.map((t: any) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2">#{t.numero}</td>
                      <td className="px-4 py-2">{t.descricao}{t.numeroEmpenho && <span className="block text-xs text-muted-foreground">Empenho {t.numeroEmpenho}</span>}</td>
                      <td className="whitespace-nowrap px-4 py-2">{formatDate(t.dataEmissao)}</td>
                      <td className="whitespace-nowrap px-4 py-2">{formatDate(t.vencimento)}</td>
                      <td className="whitespace-nowrap px-4 py-2">{formatDate(t.dataRecebimento)}</td>
                      <td className="px-4 py-2">{t.formaRecebimento}</td>
                      <td className="whitespace-nowrap px-4 py-2 tabular-nums">{formatCurrency(t.valor)}</td>
                      <td className="px-4 py-2"><StatusBadge status={t.status} overdue={t.vencido} /></td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}
      </Loadable>
    </section>
  );
}
