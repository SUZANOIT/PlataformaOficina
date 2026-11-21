import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage, portalGestorApi } from '../../services/portalGestor';
import { Card, EmptyState, Loadable, PageHeader, Stat, StatusBadge, Table, VehicleFilter, btnSecondary, formatCurrency, formatDate, inputClass, useLoad } from './ui';
import { QuoteDetailModal } from './QuoteDetailModal';
import { TablePagination } from '../../components/ui/TablePagination';

const MAINT_LABELS: Record<string, string> = {
  TROCA_OLEO_MOTOR: 'Troca de óleo (motor)',
  TROCA_OLEO_CAMBIO: 'Troca de óleo (câmbio)',
  REVISAO: 'Revisão',
  MANUTENCAO: 'Manutenção',
  KM: 'Atualização de KM',
  ABASTECIMENTO: 'Abastecimento',
  MULTA: 'Multa',
  SINISTRO: 'Sinistro',
  ALTERACAO: 'Alteração',
};

// ---------------- Ordens de Serviço (consulta unificada de orçamentos e OS) ----------------
const SERVICO_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'pecas', label: 'Peças' },
  { value: 'mao-de-obra', label: 'Mão de Obra' },
];
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function PortalOrdensServico() {
  // Filtros e página ficam na URL: são mantidos ao navegar, voltar ou atualizar a página
  const [params, setParams] = useSearchParams();
  const servico = params.get('servico') || 'todos';
  const status = params.get('status') || 'all';
  const veiculoId = params.get('veiculo') || '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = PAGE_SIZE_OPTIONS.includes(Number(params.get('pageSize'))) ? Number(params.get('pageSize')) : 10;
  const openId = params.get('abrir');

  const state = useLoad(
    () => portalGestorApi.ordensServico({ servico, status, veiculoId: veiculoId || undefined, page, pageSize }),
    [servico, status, veiculoId, page, pageSize],
  );

  const update = (changes: Record<string, string | number | null>, resetPage = true) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === null || v === '' || v === 'todos' || v === 'all') next.delete(k); else next.set(k, String(v));
    });
    if (resetPage) next.delete('page');
    setParams(next, { replace: !resetPage });
  };
  const hasFilters = servico !== 'todos' || status !== 'all' || !!veiculoId;
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (pageSize !== 10) next.set('pageSize', String(pageSize));
    setParams(next);
  };

  const data: any = state.data;
  const statusOptions: string[] = data?.statusOptions || [];

  return (
    <>
      <PageHeader title="Ordens de Serviço" description="Consulte e acompanhe os orçamentos e ordens de serviço dos veículos da sua empresa." />
      <Card>
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Serviços</span>
            <select aria-label="Filtrar por serviços" className={inputClass} value={servico} onChange={e => update({ servico: e.target.value })}>
              {SERVICO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select aria-label="Filtrar por status" className={inputClass} value={status} onChange={e => update({ status: e.target.value })}>
              <option value="all">Todos</option>
              {(statusOptions.length ? statusOptions : status !== 'all' ? [status] : []).map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Veículo</span>
            <VehicleFilter value={veiculoId} onChange={v => update({ veiculo: v })} className="w-full" />
          </label>
          <button type="button" onClick={clearFilters} disabled={!hasFilters} className={`${btnSecondary} sm:col-span-2 lg:col-span-1`}>
            Limpar filtros
          </button>
        </div>

        <Loadable state={state}>
          {(d: any) => d.items.length === 0 ? (
            <EmptyState message={hasFilters ? 'Nenhuma ordem de serviço encontrada com os filtros selecionados.' : 'Nenhuma ordem de serviço encontrada.'} />
          ) : (
            <>
              <Table head={['OS', 'Veículo', 'Serviços', 'Abertura', 'Última atualização', 'Valor', 'Status', '']}>
                {d.items.map((os: any) => (
                  <tr key={os.id} className="hover:bg-muted/40">
                    <td className="whitespace-nowrap px-4 py-2.5">
                      <button type="button" onClick={() => update({ abrir: os.id }, false)} className="font-semibold text-primary hover:underline">#{os.numeroOrcamento}</button>
                      {os.osExterna && <span className="block text-xs text-muted-foreground">OS ext. {os.osExterna}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5">{os.veiculoPlaca || '—'}</td>
                    {/* Tipos de item do orçamento da OS: "Peças", "Mão de Obra" ou ambos */}
                    <td className="whitespace-nowrap px-4 py-2.5">{os.servicos?.length ? os.servicos.join(', ') : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(os.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5">{formatDate(os.updatedAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 tabular-nums">{formatCurrency(os.total)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={os.status} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right">
                      <button type="button" onClick={() => update({ abrir: os.id }, false)} className="text-sm font-medium text-primary hover:underline">
                        {os.aguardandoAprovacao ? 'Analisar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </Table>
              <TablePagination
                currentPage={d.page}
                totalPages={d.totalPages}
                totalCount={d.total}
                pageSize={d.pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={p => update({ page: p === 1 ? null : p }, false)}
                onPageSizeChange={size => update({ pageSize: size === 10 ? null : size })}
              />
            </>
          )}
        </Loadable>
      </Card>
      {openId && (
        <QuoteDetailModal id={openId} onClose={() => update({ abrir: null }, false)} onChanged={state.reload} />
      )}
    </>
  );
}

// ---------------- Manutenção ----------------
export function PortalManutencao() {
  const [veiculoId, setVeiculoId] = useState('');
  const state = useLoad(() => portalGestorApi.manutencoes({ veiculoId: veiculoId || undefined }), [veiculoId]);
  return (
    <>
      <PageHeader title="Manutenção" description="Andamento dos serviços e histórico de manutenções da frota." actions={<VehicleFilter value={veiculoId} onChange={setVeiculoId} />} />
      <Loadable state={state}>
        {(d: any) => (
          <div className="space-y-6">
            <Card>
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Em andamento na oficina</h2>
              {d.andamento.length === 0 ? <EmptyState message="Nenhum serviço em andamento." /> : (
                <Table head={['OS', 'Veículo', 'Oficina', 'Prazo', 'Atualizado em', 'Status']}>
                  {d.andamento.map((a: any) => (
                    <tr key={a.id}>
                      <td className="px-4 py-2.5"><Link to={`/portal/ordens-servico?abrir=${a.id}`} className="font-semibold text-primary hover:underline">#{a.numeroOrcamento}</Link></td>
                      <td className="px-4 py-2.5">{a.veiculoPlaca || '—'}</td>
                      <td className="px-4 py-2.5">{a.oficina || '—'}</td>
                      <td className="px-4 py-2.5">{a.prazoExecucao || '—'}</td>
                      <td className="px-4 py-2.5">{formatDate(a.updatedAt)}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                    </tr>
                  ))}
                </Table>
              )}
            </Card>
            <Card>
              <h2 className="border-b border-border px-4 py-3 text-sm font-semibold">Histórico de manutenções</h2>
              {d.historico.length === 0 ? <EmptyState message="Nenhuma manutenção registrada." /> : (
                <Table head={['Data', 'Veículo', 'Tipo', 'Descrição', 'KM', 'Valor', 'Próxima']}>
                  {d.historico.map((h: any) => (
                    <tr key={h.id}>
                      <td className="whitespace-nowrap px-4 py-2.5">{formatDate(h.data)}</td>
                      <td className="px-4 py-2.5"><Link to={`/portal/veiculos/${h.veiculoId}`} className="font-medium text-primary hover:underline">{h.placa}</Link></td>
                      <td className="px-4 py-2.5">{MAINT_LABELS[h.tipo] || h.tipo}</td>
                      <td className="px-4 py-2.5">{h.descricao}</td>
                      <td className="px-4 py-2.5 tabular-nums">{h.km ? `${Number(h.km).toLocaleString('pt-BR')} km` : '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums">{h.valor ? formatCurrency(h.valor) : '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{h.proximaTroca || '—'}</td>
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

// ---------------- Peças Utilizadas ----------------
export function PortalPecas() {
  const [veiculoId, setVeiculoId] = useState('');
  const state = useLoad(() => portalGestorApi.pecas({ veiculoId: veiculoId || undefined }), [veiculoId]);
  return (
    <>
      <PageHeader title="Peças Utilizadas" description="Peças aplicadas nos veículos nas ordens de serviço da oficina." actions={<VehicleFilter value={veiculoId} onChange={setVeiculoId} />} />
      <Loadable state={state}>
        {(d: any) => (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:max-w-md">
              <Stat label="Quantidade de peças" value={d.totais.quantidade.toLocaleString('pt-BR')} />
              <Stat label="Valor em peças" value={formatCurrency(d.totais.valor)} />
            </div>
            <Card>
              {d.pecas.length === 0 ? <EmptyState message="Nenhuma peça registrada." /> : (
                <Table head={['Data', 'Veículo', 'OS', 'Peça', 'Código / Tipo', 'Qtd', 'Valor unit.', 'Total']}>
                  {d.pecas.map((p: any) => (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-4 py-2.5">{formatDate(p.data)}</td>
                      <td className="px-4 py-2.5">{p.placa || '—'}</td>
                      <td className="px-4 py-2.5"><Link to={`/portal/ordens-servico?abrir=${p.quoteId}`} className="text-primary hover:underline">#{p.numeroOrcamento}</Link></td>
                      <td className="px-4 py-2.5">{p.descricao}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{[p.codigoPeca, p.tipoPeca].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-4 py-2.5 tabular-nums">{p.quantidade}</td>
                      <td className="px-4 py-2.5 tabular-nums">{formatCurrency(p.valorUnitario)}</td>
                      <td className="px-4 py-2.5 tabular-nums">{formatCurrency(p.valorTotal)}</td>
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

// ---------------- Documentos ----------------
export function PortalDocumentos() {
  const state = useLoad(() => portalGestorApi.documentos());
  const [busy, setBusy] = useState<string | null>(null);

  const baixar = async (doc: any) => {
    setBusy(doc.id);
    try {
      const { url } = await portalGestorApi.download(doc.downloadPath);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Não foi possível baixar o documento.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageHeader title="Documentos" description="Notas fiscais, comprovantes e boletos disponibilizados pela oficina para a sua empresa." />
      <Card>
        <Loadable state={state}>
          {(docs: any[]) => docs.length === 0 ? <EmptyState message="Nenhum documento disponível." /> : (
            <Table head={['Documento', 'Referência', 'Veículo', 'Data', '']}>
              {docs.map(d => (
                <tr key={`${d.origem}-${d.id}`}>
                  <td className="px-4 py-2.5 font-medium">{d.nome}<span className="block text-xs text-muted-foreground">{d.tipo}</span></td>
                  <td className="px-4 py-2.5">{d.referencia}</td>
                  <td className="px-4 py-2.5">{d.placa || '—'}</td>
                  <td className="px-4 py-2.5">{formatDate(d.data)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button type="button" disabled={busy === d.id} onClick={() => baixar(d)} className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-50">
                      <Download size={14} /> {busy === d.id ? 'Abrindo…' : 'Baixar'}
                    </button>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Loadable>
      </Card>
    </>
  );
}
