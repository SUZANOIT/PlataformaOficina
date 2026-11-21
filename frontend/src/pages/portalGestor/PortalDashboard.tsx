import { Link } from 'react-router-dom';
import { portalGestorApi } from '../../services/portalGestor';
import { Card, Loadable, PageHeader, Stat, StatusBadge, Table, formatCurrency, formatDate, useLoad, EmptyState } from './ui';

export function PortalDashboard() {
  const state = useLoad(() => portalGestorApi.dashboard());

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral da sua frota na oficina." />
      <Loadable state={state}>
        {(d: any) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Veículos" value={d.veiculos.total} hint={`${d.veiculos.ativos} ativos · ${d.veiculos.emManutencao} em manutenção`} />
              <Stat label="Orçamentos aguardando aprovação" value={d.orcamentosPendentes.quantidade} hint={formatCurrency(d.orcamentosPendentes.valor)} tone={d.orcamentosPendentes.quantidade ? 'warn' : 'default'} />
              <Stat label="Ordens de serviço em andamento" value={d.ordensEmAndamento} />
              <Stat label={`Gasto em ${d.ano}`} value={formatCurrency(d.financeiro.total)} hint={`${d.financeiro.quantidadeOs} ordens de serviço`} />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label={`Pago em ${d.ano}`} value={formatCurrency(d.financeiro.pago)} tone="ok" hint={d.financeiro.coberto > 0 ? `${formatCurrency(d.financeiro.coberto)} coberto (sem cobrança)` : undefined} />
              <Stat label={`Em aberto (${d.ano})`} value={formatCurrency(d.financeiro.emAberto)} hint={d.financeiro.vencido > 0 ? `${formatCurrency(d.financeiro.vencido)} vencido` : 'Nada vencido'} tone={d.financeiro.vencido > 0 ? 'danger' : 'default'} />
              <Stat label="Motoristas ativos" value={d.motoristas.total} />
              <Stat label="CNH vencendo (30 dias)" value={d.motoristas.cnhVencendo.length} tone={d.motoristas.cnhVencendo.length ? 'warn' : 'default'} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold">Orçamentos aguardando sua aprovação</h2>
                  <Link to="/portal/orcamentos" className="text-xs text-primary hover:underline">Ver todos</Link>
                </div>
                {d.ultimosOrcamentos.length === 0 ? <EmptyState message="Nenhum orçamento pendente." /> : (
                  <Table head={['Nº', 'Veículo', 'Data', 'Valor', 'Status']}>
                    {d.ultimosOrcamentos.map((q: any) => (
                      <tr key={q.id} className="hover:bg-muted/40">
                        <td className="px-4 py-2.5"><Link to={`/portal/orcamentos?abrir=${q.id}`} className="font-medium text-primary hover:underline">#{q.numeroOrcamento}</Link></td>
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
