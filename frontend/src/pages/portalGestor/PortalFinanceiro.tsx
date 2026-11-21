import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { portalGestorApi } from '../../services/portalGestor';
import { Card, EmptyState, Loadable, PageHeader, Stat, StatusBadge, Table, formatCurrency, formatDate, inputClass, useLoad } from './ui';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const COLOR_OS = 'hsl(var(--primary))';
const COLOR_MANUT = '#64748b';

/**
 * Finanças / DRE da frota do ponto de vista do cliente: custos com a oficina e
 * manutenções registradas, e a situação dos títulos da empresa. Não exibe dados
 * internos da oficina (custos, margens, contas a pagar).
 */
export function PortalFinanceiro() {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const state = useLoad(() => portalGestorApi.financeiro(ano), [ano]);

  return (
    <>
      <PageHeader
        title="Finanças / DRE"
        description="Custos da sua frota com a oficina e situação dos seus títulos."
        actions={
          <select aria-label="Ano" className={`${inputClass} w-32`} value={ano} onChange={e => setAno(Number(e.target.value))}>
            {Array.from({ length: 6 }, (_, i) => anoAtual - i).map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        }
      />
      <Loadable state={state}>
        {(d: any) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Custo total da frota" value={formatCurrency(d.resumo.total)} hint={`${formatCurrency(d.resumo.totalOs)} em OS + ${formatCurrency(d.resumo.manutencaoExterna)} outras manutenções`} />
              <Stat label="Peças / Mão de obra" value={formatCurrency(d.resumo.pecas)} hint={`Serviços: ${formatCurrency(d.resumo.servicos)}`} />
              <Stat label="Títulos pagos" value={formatCurrency(d.resumo.pago)} tone="ok" />
              <Stat label="Em aberto" value={formatCurrency(d.resumo.emAberto)} hint={d.resumo.vencido > 0 ? `${formatCurrency(d.resumo.vencido)} vencido` : 'Nada vencido'} tone={d.resumo.vencido > 0 ? 'danger' : 'default'} />
            </div>

            <Card className="p-4">
              <h2 className="text-sm font-semibold">Custo mensal da frota — {d.ano}</h2>
              {d.resumo.total === 0 ? <EmptyState message="Sem custos registrados neste ano." /> : (
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={d.meses.map((m: any) => ({ ...m, nome: MESES[m.mes - 1] }))} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis axisLine={false} tickLine={false} width={70} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={v => new Intl.NumberFormat('pt-BR', { notation: 'compact', style: 'currency', currency: 'BRL' }).format(v)} />
                      <Tooltip formatter={(v: any) => formatCurrency(Number(v))} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="totalOs" name="Ordens de serviço" stackId="c" fill={COLOR_OS} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="manutencaoExterna" name="Outras manutenções" stackId="c" fill={COLOR_MANUT} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">DRE mensal</h2>
                <Table head={['Mês', 'Peças', 'Serviços', 'Total OS', 'Outras manut.', 'Total']}>
                  {d.meses.map((m: any) => (
                    <tr key={m.mes} className={m.total === 0 ? 'text-muted-foreground' : ''}>
                      <td className="px-4 py-2">{MESES[m.mes - 1]}</td>
                      <td className="px-4 py-2 tabular-nums">{formatCurrency(m.pecas)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatCurrency(m.servicos)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatCurrency(m.totalOs)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatCurrency(m.manutencaoExterna)}</td>
                      <td className="px-4 py-2 font-medium tabular-nums">{formatCurrency(m.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/40 font-semibold">
                    <td className="px-4 py-2">Total</td>
                    <td className="px-4 py-2 tabular-nums">{formatCurrency(d.resumo.pecas)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatCurrency(d.resumo.servicos)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatCurrency(d.resumo.totalOs)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatCurrency(d.resumo.manutencaoExterna)}</td>
                    <td className="px-4 py-2 tabular-nums">{formatCurrency(d.resumo.total)}</td>
                  </tr>
                </Table>
              </Card>

              <Card>
                <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Custo por veículo</h2>
                {d.porVeiculo.length === 0 ? <EmptyState message="Sem custos por veículo neste ano." /> : (
                  <Table head={['Veículo', 'OS', 'Total OS', 'Outras manut.', 'Total']}>
                    {d.porVeiculo.map((v: any) => (
                      <tr key={v.veiculoId || v.placa}>
                        <td className="px-4 py-2 font-medium">{v.placa}<span className="block text-xs font-normal text-muted-foreground">{v.modelo}</span></td>
                        <td className="px-4 py-2 tabular-nums">{v.quantidadeOs}</td>
                        <td className="px-4 py-2 tabular-nums">{formatCurrency(v.totalOs)}</td>
                        <td className="px-4 py-2 tabular-nums">{formatCurrency(v.manutencaoExterna)}</td>
                        <td className="px-4 py-2 font-medium tabular-nums">{formatCurrency(v.total)}</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
            </div>

            <Card>
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Títulos da empresa ({d.ano})</h2>
              {d.titulos.length === 0 ? <EmptyState message="Nenhum título com vencimento neste ano." /> : (
                <Table head={['Nº', 'Descrição', 'Emissão', 'Vencimento', 'Pagamento', 'Forma', 'Valor', 'Situação']}>
                  {d.titulos.map((t: any) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2">#{t.numero}</td>
                      <td className="px-4 py-2">{t.descricao}{t.numeroEmpenho && <span className="block text-xs text-muted-foreground">Empenho {t.numeroEmpenho}</span>}</td>
                      <td className="px-4 py-2">{formatDate(t.dataEmissao)}</td>
                      <td className="px-4 py-2">{formatDate(t.vencimento)}</td>
                      <td className="px-4 py-2">{formatDate(t.dataRecebimento)}</td>
                      <td className="px-4 py-2">{t.formaRecebimento}</td>
                      <td className="px-4 py-2 tabular-nums">{formatCurrency(t.valor)}</td>
                      <td className="px-4 py-2"><StatusBadge status={t.status} overdue={t.vencido} /></td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        )}
      </Loadable>
    </>
  );
}
