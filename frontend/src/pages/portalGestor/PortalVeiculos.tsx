import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { portalGestorApi } from '../../services/portalGestor';
import { useAuth } from '../../hooks/useAuth';
import { VehicleCockpitTabs, type VehicleCockpitTab } from '../../components/fleet/VehicleCockpitTabs';
import { Card, EmptyState, Loadable, PageHeader, StatusBadge, Table, formatDate, inputClass, useLoad } from './ui';

export function PortalVeiculos() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const state = useLoad(() => portalGestorApi.veiculos({ status, search: search || undefined }), [status, search]);

  return (
    <>
      <PageHeader title="Meus Veículos" description="Veículos da sua empresa cadastrados na oficina." />
      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input aria-label="Buscar veículo" className={`${inputClass} pl-9`} placeholder="Buscar por placa, modelo ou prefixo" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select aria-label="Status do veículo" className={`${inputClass} sm:w-52`} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="ATIVO">Ativos</option>
            <option value="EM_MANUTENCAO">Em manutenção</option>
            <option value="INATIVO">Inativos</option>
            <option value="VENDIDO">Vendidos</option>
          </select>
        </div>
        <Loadable state={state}>
          {(vehicles: any[]) => vehicles.length === 0 ? <EmptyState message="Nenhum veículo encontrado." /> : (
            <Table head={['Placa', 'Veículo', 'Frota / Subfrota', 'KM atual', 'Motorista', 'Último serviço', 'Status']}>
              {vehicles.map(v => (
                <tr key={v.id} className="hover:bg-muted/40">
                  <td className="px-4 py-2.5"><Link to={`/portal/veiculos/${v.id}`} className="font-semibold text-primary hover:underline">{v.placa}</Link>{v.prefixo && <span className="block text-xs text-muted-foreground">Prefixo {v.prefixo}</span>}</td>
                  <td className="px-4 py-2.5">{v.marca} {v.modelo}<span className="block text-xs text-muted-foreground">{v.anoFabricacao}/{v.anoModelo}</span></td>
                  <td className="px-4 py-2.5">{[v.frota, v.subfrota].filter(Boolean).join(' / ') || '—'}</td>
                  <td className="px-4 py-2.5 tabular-nums">{Number(v.kmAtual || 0).toLocaleString('pt-BR')} km</td>
                  <td className="px-4 py-2.5">{v.motoristas.map((m: any) => m.nome).join(', ') || '—'}</td>
                  <td className="px-4 py-2.5">{formatDate(v.dataUltimoServico)}</td>
                  <td className="px-4 py-2.5"><StatusBadge status={v.status} /></td>
                </tr>
              ))}
            </Table>
          )}
        </Loadable>
      </Card>
    </>
  );
}

/** Cockpit do veículo — mesmo componente da Gestão de Frotas, em modo portal. */
export function PortalVeiculoDetalhe() {
  const { id } = useParams();
  const { user } = useAuth();
  const [tab, setTab] = useState<VehicleCockpitTab>('info');
  const state = useLoad(() => portalGestorApi.veiculo(id as string), [id]);

  return (
    <>
      <Link to="/portal/veiculos" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={15} /> Meus Veículos
      </Link>
      <Loadable state={state}>
        {(details: any) => {
          // O cockpit espera o formato da Gestão de Frotas
          const vehicleDetails = {
            ...details,
            infoCadastral: { ...details.infoCadastral, auditAlerts: [], cliente: user?.cliente || null },
          };
          return (
            <>
              <PageHeader
                title={`${details.infoCadastral.placa} · ${details.infoCadastral.marca} ${details.infoCadastral.modelo}`}
                description={[details.infoCadastral.frota, details.infoCadastral.subfrota].filter(Boolean).join(' / ') || undefined}
                actions={<StatusBadge status={details.infoCadastral.status} />}
              />
              <Card className="overflow-hidden">
                <VehicleCockpitTabs vehicleDetails={vehicleDetails} detailsTab={tab} setDetailsTab={setTab} audience="portal" />
              </Card>
            </>
          );
        }}
      </Loadable>
    </>
  );
}
