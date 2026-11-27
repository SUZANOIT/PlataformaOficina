import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Search, X } from 'lucide-react';
import { portalGestorApi } from '../../services/portalGestor';
import { useAuth } from '../../hooks/useAuth';
import { VehicleCockpitTabs, type VehicleCockpitTab } from '../../components/fleet/VehicleCockpitTabs';
import { Card, EmptyState, Loadable, PageHeader, StatusBadge, Table, btnSecondary, formatDate, inputClass, useLoad } from './ui';

const STATUS_FILTROS = [
  { value: 'all', label: 'Todos' },
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'EM_MANUTENCAO', label: 'Em manutenção' },
  { value: 'INATIVO', label: 'Inativos' },
  { value: 'VENDIDO', label: 'Vendidos' },
];

const km = (v: unknown) => `${Number(v || 0).toLocaleString('pt-BR')} km`;
const frotaTexto = (v: any) => [v.frota, v.subfrota].filter(Boolean).join(' / ');
const motoristasTexto = (v: any) => (v.motoristas || []).map((m: any) => m.nome).join(', ');

export function PortalVeiculos() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  // Carrega todos uma vez; busca e status filtram na tela (contadores sempre completos)
  const state = useLoad(() => portalGestorApi.veiculos({ status: 'all' }));
  const todos: any[] = (state.data as any[]) || [];

  const contagem = useMemo(() => {
    const c: Record<string, number> = { all: todos.length };
    todos.forEach(v => { c[v.status] = (c[v.status] || 0) + 1; });
    return c;
  }, [todos]);

  const termo = search.trim().toLowerCase();
  const veiculos = useMemo(() => todos.filter(v =>
    (status === 'all' || v.status === status) &&
    (!termo || [v.placa, v.marca, v.modelo, v.prefixo, v.frota, v.subfrota].some(x => (x || '').toLowerCase().includes(termo)))
  ), [todos, status, termo]);
  const temFiltro = status !== 'all' || !!termo;

  return (
    <>
      <PageHeader title="Meus Veículos" description="Veículos da sua empresa cadastrados na oficina. Clique em um veículo para ver o histórico completo." />

      <Card>
        {/* Filtros */}
        <div className="space-y-3 border-b border-border p-4">
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              aria-label="Buscar veículo"
              className={`${inputClass} pl-9 pr-9`}
              placeholder="Buscar por placa, modelo, prefixo ou frota"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X size={15} />
              </button>
            )}
          </div>
          <div role="group" aria-label="Filtrar por status" className="flex flex-wrap gap-2">
            {STATUS_FILTROS.map(f => {
              const ativo = status === f.value;
              const n = contagem[f.value] || 0;
              if (f.value !== 'all' && n === 0 && !ativo) return null;
              return (
                <button
                  key={f.value}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setStatus(f.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    ativo ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:bg-muted'}`}
                >
                  {f.label}
                  <span className={`rounded-full px-1.5 text-xs tabular-nums ${ativo ? 'bg-background/20 text-background' : 'bg-muted text-foreground'}`}>{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Loadable state={state}>
          {() => veiculos.length === 0 ? (
            <div className="py-2">
              <EmptyState message={temFiltro ? 'Nenhum veículo encontrado com esses filtros.' : 'Nenhum veículo cadastrado para a sua empresa.'} />
              {temFiltro && (
                <div className="-mt-8 pb-8 text-center">
                  <button type="button" onClick={() => { setSearch(''); setStatus('all'); }} className="text-sm font-medium text-link hover:underline">Limpar filtros</button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Computador: tabela */}
              <div className="hidden lg:block">
                <Table head={['Veículo', 'Frota / Subfrota', 'KM atual', 'Motorista', 'Último serviço', 'Status', '']}>
                  {veiculos.map(v => (
                    <tr key={v.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link to={`/portal/veiculos/${v.id}`} className="font-mono text-sm font-semibold tracking-wide text-link hover:underline">{v.placa}</Link>
                        <span className="block whitespace-nowrap text-sm text-foreground">{v.marca} {v.modelo}</span>
                        <span className="block text-xs text-muted-foreground">
                          {v.anoFabricacao}/{v.anoModelo}{v.prefixo ? ` · Prefixo ${v.prefixo}` : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground">{frotaTexto(v) || <span className="text-muted-foreground">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-foreground">{km(v.kmAtual)}</td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-foreground" title={motoristasTexto(v)}>{motoristasTexto(v) || <span className="text-muted-foreground">—</span>}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">{formatDate(v.dataUltimoServico)}</td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link to={`/portal/veiculos/${v.id}`} className={`${btnSecondary} h-8 px-3 text-xs`}>
                          Ver detalhes <ChevronRight size={14} aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>

              {/* Celular e tablet: cartões (uma coluna no celular, duas no tablet) */}
              <ul className="grid gap-3 p-3 sm:grid-cols-2 lg:hidden">
                {veiculos.map(v => (
                  <li key={v.id}>
                    <Link to={`/portal/veiculos/${v.id}`} className="block h-full rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-mono text-base font-semibold tracking-wide text-link">{v.placa}</p>
                          <p className="truncate text-sm font-medium text-foreground">{v.marca} {v.modelo}</p>
                          <p className="text-xs text-muted-foreground">{v.anoFabricacao}/{v.anoModelo}{v.prefixo ? ` · Prefixo ${v.prefixo}` : ''}</p>
                        </div>
                        <StatusBadge status={v.status} />
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div><dt className="text-xs text-muted-foreground">KM atual</dt><dd className="tabular-nums text-foreground">{km(v.kmAtual)}</dd></div>
                        <div><dt className="text-xs text-muted-foreground">Último serviço</dt><dd className="text-foreground">{formatDate(v.dataUltimoServico)}</dd></div>
                        {frotaTexto(v) && <div><dt className="text-xs text-muted-foreground">Frota / Subfrota</dt><dd className="text-foreground">{frotaTexto(v)}</dd></div>}
                        {motoristasTexto(v) && <div><dt className="text-xs text-muted-foreground">Motorista</dt><dd className="truncate text-foreground">{motoristasTexto(v)}</dd></div>}
                      </dl>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-link">Ver detalhes <ChevronRight size={14} aria-hidden="true" /></span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                {veiculos.length === todos.length ? `${todos.length} ${todos.length === 1 ? 'veículo' : 'veículos'}` : `${veiculos.length} de ${todos.length} veículos`}
              </p>
            </>
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
