import { useState } from 'react';
import { Link } from 'react-router-dom';
import { portalGestorApi } from '../../services/portalGestor';
import { VehicleSpendChart } from './VehicleSpendChart';
import { DashboardFinanceiro } from './DashboardFinanceiro';
import { Card, Loadable, PageHeader, Stat, StatusBadge, Table, formatCurrency, formatDate, useLoad, EmptyState, inputClass } from './ui';

// Status da OS somado no Financeiro e no gráfico de gastos (padrão: só OS pagas)
const STATUS_OS_OPCOES = [
  { value: 'Pago', label: 'Pago' },
  { value: 'Aguardando Pagamento', label: 'Aguardando Pagamento' },
  { value: 'Parcialmente Pago', label: 'Parcialmente Pago' },
  { value: 'Emitir Nota Fiscal', label: 'Emitir Nota Fiscal' },
  { value: 'Aprovado', label: 'Aprovado' },
  { value: 'todas', label: 'Todas as OS aprovadas' },
];

export function PortalDashboard() {
  const state = useLoad(() => portalGestorApi.dashboard());
  const [statusOs, setStatusOs] = useState('Pago');
  const [plataforma, setPlataforma] = useState('');
  // Opções de plataforma: as plataformas de gestão presentes nos orçamentos da empresa
  const plataformas = useLoad(() => portalGestorApi.ordensServico({ pageSize: 10 }).then(r => r.plataformas || []));

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da sua frota na oficina: operação, custos e pagamentos." />
      <Loadable state={state}>
        {(d: any) => (
          <div className="space-y-6">
            {/* Operação */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Veículos" value={d.veiculos.total} hint={`${d.veiculos.ativos} ativos · ${d.veiculos.emManutencao} em manutenção`} />
              <Stat label="Orçamentos aguardando aprovação" value={d.orcamentosPendentes.quantidade} hint={formatCurrency(d.orcamentosPendentes.valor)} tone={d.orcamentosPendentes.quantidade ? 'warn' : 'default'} />
              <Stat label="Ordens de serviço em andamento" value={d.ordensEmAndamento} />
              <Stat label="Motoristas ativos" value={d.motoristas.total}
                hint={d.motoristas.cnhVencendo.length ? `${d.motoristas.cnhVencendo.length} CNH vencendo em 30 dias` : 'Nenhuma CNH vencendo'}
                tone={d.motoristas.cnhVencendo.length ? 'warn' : 'default'} />
            </div>

            {/* Filtro de status da OS: vale para o Financeiro e para o gráfico de gastos */}
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Custos somados: <span className="font-medium text-foreground">{statusOs === 'Pago' ? 'somente ordens de serviço pagas' : statusOs === 'todas' ? 'todas as ordens de serviço aprovadas' : `ordens de serviço com status "${statusOs}"`}</span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex items-center gap-2 text-sm">
                  <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Plataforma</span>
                  <select aria-label="Plataforma de gestão" className={`${inputClass} h-9 sm:w-52`} value={plataforma} onChange={e => setPlataforma(e.target.value)}>
                    <option value="">Todas as plataformas</option>
                    {((plataformas.data as any[]) || []).map((p: any) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="whitespace-nowrap text-xs font-medium text-muted-foreground">Status da OS</span>
                  <select aria-label="Status da OS" className={`${inputClass} h-9 sm:w-56`} value={statusOs} onChange={e => setStatusOs(e.target.value)}>
                    {STATUS_OS_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
              </div>
            </div>

            {/* Financeiro (antiga tela Finanças / DRE) */}
            <DashboardFinanceiro statusOs={statusOs} plataforma={plataforma} />

            <VehicleSpendChart statusOs={statusOs} plataforma={plataforma} />

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">Orçamentos aguardando sua aprovação</h2>
                  <Link to={`/portal/ordens-servico?status=${encodeURIComponent('Aguardando Aprovação')}`} className="text-xs text-primary hover:underline">Ver todos</Link>
                </div>
                {d.ultimosOrcamentos.length === 0 ? <EmptyState message="Nenhum orçamento pendente." /> : (
                  <Table head={['Nº', 'Veículo', 'Data', 'Valor', 'Status']}>
                    {d.ultimosOrcamentos.map((q: any) => (
                      <tr key={q.id} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5"><Link to={`/portal/ordens-servico?abrir=${q.id}`} className="font-medium text-primary hover:underline">#{q.numeroOrcamento}</Link></td>
                        <td className="px-4 py-2.5">{q.veiculoPlaca || '—'}</td>
                        <td className="px-4 py-2.5">{formatDate(q.createdAt)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatCurrency(q.total)}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={q.status} /></td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">Próximas trocas preventivas (30 dias)</h2>
                  <Link to="/portal/manutencao" className="text-xs text-primary hover:underline">Manutenção</Link>
                </div>
                {d.proximasTrocas.length === 0 ? <EmptyState message="Nenhuma troca prevista para os próximos 30 dias." /> : (
                  <Table head={['Veículo', 'Serviço', 'Data prevista', 'KM previsto']}>
                    {d.proximasTrocas.map((t: any, i: number) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5"><Link to={`/portal/veiculos/${t.veiculoId}`} className="font-medium text-primary hover:underline">{t.placa}</Link></td>
                        <td className="px-4 py-2.5">{t.tipo}</td>
                        <td className="px-4 py-2.5">{formatDate(t.data)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{Number(t.km).toLocaleString('pt-BR')} km</td>
                      </tr>
                    ))}
                  </Table>
                )}
              </Card>
            </div>

            {d.motoristas.cnhVencendo.length > 0 && (
              <Card className="p-4">
                <h2 className="text-sm font-semibold">CNH vencendo ou vencida</h2>
                <ul className="mt-2 space-y-1 text-sm">
                  {d.motoristas.cnhVencendo.map((m: any) => (
                    <li key={m.id}><Link to="/portal/motoristas" className="text-primary hover:underline">{m.nome}</Link> — validade {formatDate(m.validadeCnh)}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </Loadable>
    </>
  );
}
