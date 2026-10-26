import { useState, useEffect, useRef, type FormEvent } from 'react';
import { 
  Truck, Plus, Search, Edit2, Trash2, Sparkles, X,
  ChevronDown, ChevronRight, ChevronsUpDown, DollarSign,
  Wrench, Package, Paperclip, Clipboard, CheckSquare, FileText, AlertCircle, AlertTriangle,
  TrendingUp, TrendingDown, Activity, SlidersHorizontal, CircleOff, CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';
import { ModalFooterActions } from '../../components/ui/ModalFooterActions';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import {
  classifyFleetSearch,
  countVehiclesByStatus,
  fleetDisplayValue,
  fleetKpiStatus,
  fleetStatusLabel,
  fleetYearLabel,
  formatFleetDate,
  sortFleetVehicles,
  type FleetStatusCounts,
  type FleetVehicleSortKey,
} from './fleetVehicles.ui';

function StatusBadge({ status }: { status?: string | null }) {
  const tone = status === 'ATIVO'
    ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
    : status === 'EM_MANUTENCAO'
      ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
      : status === 'INATIVO'
        ? 'bg-rose-500/10 text-rose-800 dark:text-rose-200'
        : status === 'VENDIDO'
          ? 'bg-slate-500/10 text-slate-700 dark:text-slate-200'
          : 'bg-muted text-muted-foreground';

  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {fleetStatusLabel(status)}
    </span>
  );
}

function InfoField({ label, value }: { label: string; value: unknown }) {
  const text = fleetDisplayValue(value);
  const empty = text === 'Não informado';
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words text-sm ${empty ? 'italic text-muted-foreground' : 'font-medium text-foreground'}`}>{text}</p>
    </div>
  );
}

export default function FleetVehicles() {
  // Tree States
  const [treeClients, setTreeClients] = useState<any[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [expandedSubfrotas, setExpandedSubfrotas] = useState<Record<string, boolean>>({});
  const [clientVehicles, setClientVehicles] = useState<Record<string, any[]>>({});
  const [clientVehiclesLoading, setClientVehiclesLoading] = useState<Record<string, boolean>>({});

  // Filter States
  const [search, setSearch] = useState('');
  const [placaFilter, setPlacaFilter] = useState('');
  const [chassiFilter, setChassiFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ATIVO'); // 'ATIVO' by default, can be 'all' or 'INATIVO'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [plateOwnedByQuickSearch, setPlateOwnedByQuickSearch] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [sortKey, setSortKey] = useState<FleetVehicleSortKey | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [counts, setCounts] = useState<FleetStatusCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(true);
  const [treeError, setTreeError] = useState(false);
  const [clientVehiclesError, setClientVehiclesError] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; placa: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [rowActionId, setRowActionId] = useState<string | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement>(null);

  // Selected Vehicle details state
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<any>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsTab, setDetailsTab] = useState<'info' | 'quotes' | 'os' | 'maintenance' | 'parts' | 'docs' | 'finance'>('info');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPlateLoading, setIsPlateLoading] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [clients, setClients] = useState<any[]>([]);

  // Active form tab
  const [activeTab, setActiveTab] = useState<'geral' | 'tecnico' | 'proprietario' | 'obs'>('geral');

  // Form State
  const [form, setForm] = useState({
    placa: '',
    marca: '',
    modelo: '',
    versao: '',
    anoFabricacao: new Date().getFullYear(),
    anoModelo: new Date().getFullYear(),
    cor: '',
    combustivel: 'Flex',
    tipoVeiculo: 'Automóvel',
    renavam: '',
    chassi: '',
    vin: '',
    frota: '',
    subfrota: '',
    prefixo: '',
    kmAtual: 0,
    status: 'ATIVO',
    clienteId: '',
    observacoes: ''
  });

  const fetchTreeClients = async () => {
    setTreeLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (placaFilter) params.append('placa', placaFilter);
      if (chassiFilter) params.append('chassi', chassiFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/fleet/tree/clients?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTreeClients(data);
        setTreeError(false);

        // Reload open clients' vehicles
        Object.keys(expandedClients).forEach(cid => {
          if (expandedClients[cid]) {
            fetchClientVehicles(cid, params);
          }
        });
      } else {
        setTreeError(true);
        toast.error('Erro ao carregar a estrutura de clientes.');
      }
    } catch (err) {
      console.error('[Tree] Failed to fetch tree clients', err);
      setTreeError(true);
      toast.error('Erro ao carregar a estrutura de clientes.');
    } finally {
      setTreeLoading(false);
    }
  };

  const fetchClientVehicles = async (clientId: string, activeParams?: URLSearchParams) => {
    setClientVehiclesLoading(prev => ({ ...prev, [clientId]: true }));
    try {
      const token = localStorage.getItem('token');
      let paramsString = '';
      if (activeParams) {
        paramsString = activeParams.toString();
      } else {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (placaFilter) params.append('placa', placaFilter);
        if (chassiFilter) params.append('chassi', chassiFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        paramsString = params.toString();
      }

      const res = await fetch(`/fleet/tree/clients/${clientId}/vehicles?${paramsString}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClientVehicles(prev => ({ ...prev, [clientId]: data }));
        setClientVehiclesError(prev => ({ ...prev, [clientId]: false }));
        if (Array.isArray(data)) {
          setExpandedSubfrotas(prev => {
            const next = { ...prev };
            data.forEach((vehicle: { subfrota?: string | null }) => {
              if (vehicle.subfrota) {
                const key = `${clientId}_${vehicle.subfrota}`;
                if (next[key] === undefined) next[key] = true;
              }
            });
            return next;
          });
        }
      } else {
        setClientVehiclesError(prev => ({ ...prev, [clientId]: true }));
      }
    } catch (err) {
      console.error('[Tree] Failed to fetch client vehicles', err);
      setClientVehiclesError(prev => ({ ...prev, [clientId]: true }));
    } finally {
      setClientVehiclesLoading(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const handleToggleClient = async (clientId: string) => {
    const isExpanded = !!expandedClients[clientId];
    setExpandedClients(prev => ({ ...prev, [clientId]: !isExpanded }));
    
    if (!isExpanded && !clientVehicles[clientId]) {
      await fetchClientVehicles(clientId);
    }
  };

  const handleToggleSubfrota = (clientId: string, subfrotaName: string) => {
    const key = `${clientId}_${subfrotaName}`;
    setExpandedSubfrotas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectVehicle = async (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    if (window.matchMedia('(max-width: 1279px)').matches) {
      window.setTimeout(() => {
        detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
    setDetailsLoading(true);
    setVehicleDetails(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/tree/vehicles/${vehicleId}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVehicleDetails(data);
      } else {
        toast.error('Erro ao carregar detalhes do veículo.');
      }
    } catch (err) {
      console.error('[Tree] Failed to fetch vehicle details', err);
      toast.error('Erro de conexão ao carregar os dados detalhados.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Failed to fetch clients', err);
    }
  };

  const fetchFleetCounts = async () => {
    setCountsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/vehicles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        setCounts(null);
        return;
      }
      const data = await res.json();
      setCounts(countVehiclesByStatus(Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('[Fleet] Failed to count vehicles', err);
      setCounts(null);
    } finally {
      setCountsLoading(false);
    }
  };

  useEffect(() => {
    fetchTreeClients();
    fetchClients();
    fetchFleetCounts();
  }, []);

  // Trigger search on filter changes
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchTreeClients();
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [search, placaFilter, chassiFilter, statusFilter, startDate, endDate]);

  const handleOpenCreateModal = () => {
    setEditingVehicleId(null);
    setForm({
      placa: '',
      marca: '',
      modelo: '',
      versao: '',
      anoFabricacao: new Date().getFullYear(),
      anoModelo: new Date().getFullYear(),
      cor: '',
      combustivel: 'Flex',
      tipoVeiculo: 'Automóvel',
      renavam: '',
      chassi: '',
      vin: '',
      frota: '',
      subfrota: '',
      prefixo: '',
      kmAtual: 0,
      status: 'ATIVO',
      clienteId: clients[0]?.id || '',
      observacoes: ''
    });
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (vehicle: any) => {
    setEditingVehicleId(vehicle.id);
    setForm({
      placa: vehicle.placa || '',
      marca: vehicle.marca || '',
      modelo: vehicle.modelo || '',
      versao: vehicle.versao || '',
      anoFabricacao: vehicle.anoFabricacao || new Date().getFullYear(),
      anoModelo: vehicle.anoModelo || new Date().getFullYear(),
      cor: vehicle.cor || '',
      combustivel: vehicle.combustivel || 'Flex',
      tipoVeiculo: vehicle.tipoVeiculo || 'Automóvel',
      renavam: vehicle.renavam || '',
      chassi: vehicle.chassi || '',
      vin: vehicle.vin || '',
      frota: vehicle.frota || '',
      subfrota: vehicle.subfrota || '',
      prefixo: vehicle.prefixo || '',
      kmAtual: vehicle.kmAtual || 0,
      status: vehicle.status || 'ATIVO',
      clienteId: vehicle.clienteId || vehicle.cliente?.id || '',
      observacoes: vehicle.observacoes || ''
    });
    setActiveTab('geral');
    setIsModalOpen(true);
  };

  const handleLookupPlate = async () => {
    const placaClean = form.placa.toUpperCase().replace(/[\s-]/g, "");
    if (!placaClean) {
      toast.warning('Digite uma placa primeiro.');
      return;
    }

    const isValid = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(placaClean);
    if (!isValid) {
      toast.error('Placa inválida. Digite no formato AAA1234 ou Mercosul AAA1A23.');
      return;
    }

    setIsPlateLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/vehicles/lookup/${placaClean}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setForm((prev) => ({
          ...prev,
          placa: data.placa,
          marca: data.marca || prev.marca,
          modelo: data.modelo || prev.modelo,
          versao: data.versao || prev.versao,
          anoFabricacao: data.anoFabricacao || prev.anoFabricacao,
          anoModelo: data.anoModelo || prev.anoModelo,
          cor: data.cor || prev.cor,
          combustivel: data.combustivel || prev.combustivel,
          tipoVeiculo: data.tipoVeiculo || prev.tipoVeiculo,
          chassi: data.chassi || prev.chassi,
          renavam: data.renavam || prev.renavam,
          kmAtual: data.kmAtual || prev.kmAtual
        }));
        toast.success('Veículo consultado com sucesso!');
      } else {
        toast.error('Erro ao consultar placa. Verifique os dados ou digite manualmente.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao consultar placa.');
    } finally {
      setIsPlateLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.clienteId) {
      toast.warning('Selecione um cliente proprietário.');
      return;
    }
    if (!form.placa) {
      toast.warning('Insira a placa do veículo.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const method = editingVehicleId ? 'PUT' : 'POST';
      const url = editingVehicleId ? `/fleet/vehicles/${editingVehicleId}` : '/fleet/vehicles';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        toast.success(editingVehicleId ? 'Veículo atualizado com sucesso!' : 'Veículo cadastrado com sucesso!');
        setIsModalOpen(false);
        fetchTreeClients();
        fetchFleetCounts();
        if (selectedVehicleId) {
          handleSelectVehicle(selectedVehicleId);
        }
      } else {
        handleApiError(res, 'Erro ao salvar veículo.');
      }
    } catch (err) {
      console.error(err);
      handleApiError(err, 'Erro de conexão ao salvar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    const id = deleteTarget.id;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/vehicles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success('Veículo excluído com sucesso!');
        setSelectedVehicleId(null);
        setVehicleDetails(null);
        fetchTreeClients();
        fetchFleetCounts();
      } else {
        toast.error('Erro ao excluir veículo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao excluir.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditVehicle = async (vehicleId: string) => {
    if (rowActionId) return;
    if (vehicleDetails?.infoCadastral?.id === vehicleId) {
      handleOpenEditModal(vehicleDetails.infoCadastral);
      return;
    }

    setRowActionId(vehicleId);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/fleet/vehicles/${vehicleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        handleOpenEditModal(await res.json());
      } else {
        toast.error('Erro ao carregar o veículo para edição.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao carregar o veículo.');
    } finally {
      setRowActionId(null);
    }
  };

  const handleQuickSearchChange = (value: string) => {
    setQuickSearch(value);
    const classified = classifyFleetSearch(value);
    if (classified.placa) {
      setSearch('');
      setPlacaFilter(classified.placa);
      setPlateOwnedByQuickSearch(true);
      return;
    }
    setSearch(classified.search);
    if (plateOwnedByQuickSearch) {
      setPlacaFilter('');
      setPlateOwnedByQuickSearch(false);
    }
  };

  const handlePlateFieldChange = (value: string) => {
    const next = value.toUpperCase();
    setPlacaFilter(next);
    if (plateOwnedByQuickSearch) {
      setQuickSearch(next);
      setSearch('');
      return;
    }
    setPlateOwnedByQuickSearch(false);
  };

  const clearQuickSearch = () => {
    const classified = classifyFleetSearch(quickSearch);
    setQuickSearch('');
    setSearch('');
    if (classified.placa && classified.placa === placaFilter.replace(/[\s-]/g, '').toUpperCase()) {
      setPlacaFilter('');
      setPlateOwnedByQuickSearch(false);
    }
  };

  const clearFilters = () => {
    setQuickSearch('');
    setSearch('');
    setPlacaFilter('');
    setChassiFilter('');
    setStatusFilter('ATIVO');
    setStartDate('');
    setEndDate('');
    setPlateOwnedByQuickSearch(false);
  };

  const toggleSort = (column: FleetVehicleSortKey) => {
    if (sortKey === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(column);
    setSortDir('asc');
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const renderSortHeader = (label: string, column: FleetVehicleSortKey, className = '') => (
    <th scope="col" aria-sort={sortKey === column ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'} className={className}>
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1 rounded py-2 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <ChevronsUpDown size={12} aria-hidden="true" className={sortKey === column ? 'text-foreground' : 'opacity-40'} />
      </button>
    </th>
  );

  const renderVehicleTable = (vehicles: any[]) => {
    const ordered = sortFleetVehicles(vehicles, sortKey, sortDir);
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead className="border-b border-border">
            <tr>
              {renderSortHeader('Placa', 'placa', 'sticky left-0 z-10 bg-card px-3')}
              {renderSortHeader('Veículo', 'modelo', 'px-3')}
              {renderSortHeader('Ano', 'ano', 'hidden px-3 sm:table-cell')}
              {renderSortHeader('Status', 'status', 'px-3')}
              {renderSortHeader('Último serviço', 'servico', 'hidden px-3 md:table-cell')}
              <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((v) => {
              const isSelected = selectedVehicleId === v.id;
              const vehicleName = `${v.marca || ''} ${v.modelo || ''}`.trim();
              return (
                <tr
                  key={v.id}
                  onClick={() => handleSelectVehicle(v.id)}
                  className={`cursor-pointer border-t border-border ${isSelected ? 'bg-primary/10' : 'hover:bg-muted/40'}`}
                  aria-selected={isSelected}
                >
                  <td className={`sticky left-0 z-10 px-3 py-2.5 ${isSelected ? 'bg-primary/10' : 'bg-card'}`}>
                    <span className="font-mono text-sm font-semibold tracking-wide text-foreground">{v.placa}</span>
                  </td>
                  <td className="max-w-[16rem] px-3 py-2.5">
                    <span className="block truncate text-sm font-medium text-foreground">{vehicleName || 'Não informado'}</span>
                    {v.chassi ? (
                      <span className="block max-w-[16rem] truncate text-xs text-muted-foreground" title={v.chassi}>{v.chassi}</span>
                    ) : null}
                    {v.auditAlerts && v.auditAlerts.length > 0 && (
                      <span
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                        title={v.auditAlerts.join(', ')}
                      >
                        <AlertTriangle size={12} aria-hidden="true" />
                        Atenção
                      </span>
                    )}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-sm text-foreground sm:table-cell">
                    {fleetYearLabel(v.anoFabricacao, v.ano)}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={v.status} /></td>
                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-sm text-foreground md:table-cell">
                    {formatFleetDate(v.dataUltimoServico)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Editar veículo ${v.placa}`}
                        title="Editar"
                        disabled={rowActionId === v.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditVehicle(v.id);
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                      >
                        <Edit2 size={14} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Excluir veículo ${v.placa}`}
                        title="Excluir"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget({ id: v.id, placa: v.placa });
                        }}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-rose-700 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-rose-300"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderClientVehiclesTree = (clientId: string) => {
    const vehicles = clientVehicles[clientId] || [];

    if (clientVehiclesLoading[clientId]) {
      return (
        <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Carregando veículos...
        </div>
      );
    }

    if (clientVehiclesError[clientId]) {
      return (
        <div className="flex flex-wrap items-center gap-3 px-3 py-4 text-sm text-muted-foreground">
          <span>Não foi possível carregar os veículos deste cliente.</span>
          <button
            type="button"
            onClick={() => fetchClientVehicles(clientId)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Tentar novamente
          </button>
        </div>
      );
    }

    if (vehicles.length === 0) {
      return (
        <p className="px-3 py-4 text-sm italic text-muted-foreground">
          Nenhum veículo encontrado para os filtros ativos.
        </p>
      );
    }

    const subfrotasMap: Record<string, any[]> = {};
    const directVehicles: any[] = [];
    vehicles.forEach((v) => {
      if (v.subfrota) {
        if (!subfrotasMap[v.subfrota]) subfrotasMap[v.subfrota] = [];
        subfrotasMap[v.subfrota].push(v);
      } else {
        directVehicles.push(v);
      }
    });

    return (
      <div className="space-y-2 border-t border-border bg-muted/20 px-2 py-2">
        {Object.entries(subfrotasMap).map(([subfrotaName, subVehicles]) => {
          const subKey = `${clientId}_${subfrotaName}`;
          const isSubExpanded = !!expandedSubfrotas[subKey];
          return (
            <div key={subKey} className="overflow-hidden rounded-lg border border-border bg-card">
              <button
                type="button"
                aria-expanded={isSubExpanded}
                onClick={() => handleToggleSubfrota(clientId, subfrotaName)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              >
                <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
                  {isSubExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                  <span className="truncate">{subfrotaName}</span>
                </span>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {subVehicles.length}
                </span>
              </button>
              {isSubExpanded && renderVehicleTable(subVehicles)}
            </div>
          );
        })}
        {directVehicles.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {renderVehicleTable(directVehicles)}
          </div>
        )}
      </div>
    );
  };

  const fieldClass = 'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const activeFilterCount = [quickSearch, placaFilter, chassiFilter, statusFilter !== 'ATIVO' ? statusFilter : '', startDate, endDate].filter(Boolean).length;
  const quickSearchIsPlate = classifyFleetSearch(quickSearch).placa !== '';
  const showDedicatedPlate = Boolean(placaFilter) && !quickSearchIsPlate;
  const kpiValue = (value: number | undefined) => (countsLoading ? '—' : value === undefined || counts === null ? '—' : value.toLocaleString('pt-BR'));
  const info = vehicleDetails?.infoCadastral;

  return (
    <div className="space-y-4">
      {/* ═══════════ PAGE HEADER ═══════════ */}
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Gestão de Frotas / Veículos</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Veículos</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Consulte, organize e acompanhe os veículos da sua frota.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus size={16} aria-hidden="true" />
          Cadastrar veículo
        </button>
      </header>

      <section aria-label="Indicadores da frota" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {([
          { kpi: 'total' as const, label: 'Total de veículos', value: counts?.total, icon: <Truck size={16} aria-hidden="true" /> },
          { kpi: 'active' as const, label: 'Veículos ativos', value: counts?.active, icon: <CheckCircle2 size={16} aria-hidden="true" /> },
          { kpi: 'inactive' as const, label: 'Veículos inativos', value: counts?.inactive, icon: <CircleOff size={16} aria-hidden="true" /> },
          { kpi: 'maintenance' as const, label: 'Em manutenção', value: counts?.maintenance, icon: <Wrench size={16} aria-hidden="true" /> },
        ]).map((item) => {
          const status = fleetKpiStatus(item.kpi);
          const pressed = statusFilter === status;
          return (
            <button
              key={item.kpi}
              type="button"
              aria-pressed={pressed}
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl border bg-card px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${pressed ? 'border-primary ring-1 ring-primary' : 'border-border hover:bg-muted/40'}`}
            >
              <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                {item.label}
                {item.icon}
              </span>
              <span className="mt-1 block text-2xl font-semibold tabular-nums text-foreground">{kpiValue(item.value)}</span>
            </button>
          );
        })}
      </section>

      <section aria-label="Busca e filtros" className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search size={16} aria-hidden="true" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{activeFilterCount}</span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={clearFilters} className="text-sm font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Limpar filtros
            </button>
          )}
        </div>

        <div className={filtersOpen ? 'space-y-3' : 'hidden space-y-3 md:block'}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
            <div className="md:col-span-5">
              <label htmlFor="fleet-search" className="mb-1.5 block text-xs font-medium text-muted-foreground">Busca</label>
              <div className="relative">
                <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="fleet-search"
                  type="search"
                  value={quickSearch}
                  onChange={(event) => handleQuickSearchChange(event.target.value)}
                  placeholder="Buscar por placa, cliente ou empresa"
                  className={`${fieldClass} pl-9`}
                />
              </div>
            </div>
            <div className="md:col-span-4">
              <label htmlFor="fleet-status" className="mb-1.5 block text-xs font-medium text-muted-foreground">Status operacional</label>
              <select id="fleet-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={fieldClass}>
                <option value="ATIVO">Ativos</option>
                <option value="all">Todos os status</option>
                <option value="EM_MANUTENCAO">Em manutenção</option>
                <option value="INATIVO">Inativos</option>
                <option value="VENDIDO">Vendidos</option>
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-3">
              <button
                type="button"
                aria-expanded={moreFiltersOpen}
                onClick={() => setMoreFiltersOpen((open) => !open)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                Mais filtros
              </button>
              <button
                type="button"
                onClick={clearFilters}
                className="hidden h-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:inline-flex"
              >
                Limpar
              </button>
            </div>
          </div>

          {moreFiltersOpen && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <label htmlFor="fleet-plate" className="mb-1.5 block text-xs font-medium text-muted-foreground">Placa</label>
                <input id="fleet-plate" type="text" value={placaFilter} onChange={(event) => handlePlateFieldChange(event.target.value)} placeholder="Placa parcial" className={`${fieldClass} font-mono uppercase`} />
              </div>
              <div>
                <label htmlFor="fleet-chassi" className="mb-1.5 block text-xs font-medium text-muted-foreground">Chassi</label>
                <input id="fleet-chassi" type="text" value={chassiFilter} onChange={(event) => setChassiFilter(event.target.value)} placeholder="Buscar chassi" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="fleet-start" className="mb-1.5 block text-xs font-medium text-muted-foreground">Início do período</label>
                <input id="fleet-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={fieldClass} />
              </div>
              <div>
                <label htmlFor="fleet-end" className="mb-1.5 block text-xs font-medium text-muted-foreground">Término do período</label>
                <input id="fleet-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={fieldClass} />
              </div>
            </div>
          )}
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {quickSearch && (
              <button type="button" onClick={clearQuickSearch} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Busca: {quickSearch}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Remover busca</span>
              </button>
            )}
            {showDedicatedPlate && (
              <button type="button" onClick={() => { setPlacaFilter(''); setPlateOwnedByQuickSearch(false); }} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Placa: {placaFilter}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Remover placa</span>
              </button>
            )}
            {chassiFilter && (
              <button type="button" onClick={() => setChassiFilter('')} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Chassi: {chassiFilter}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Remover chassi</span>
              </button>
            )}
            {statusFilter !== 'ATIVO' && (
              <button type="button" onClick={() => setStatusFilter('ATIVO')} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Status: {fleetStatusLabel(statusFilter)}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Remover status</span>
              </button>
            )}
            {startDate && (
              <button type="button" onClick={() => setStartDate('')} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Início: {startDate.split('-').reverse().join('/')}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Remover início do período</span>
              </button>
            )}
            {endDate && (
              <button type="button" onClick={() => setEndDate('')} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Término: {endDate.split('-').reverse().join('/')}
                <X size={12} aria-hidden="true" />
                <span className="sr-only">Remover término do período</span>
              </button>
            )}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <section aria-label="Lista de veículos" className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card xl:col-span-5">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Clientes e veículos</h2>
            <span className="text-xs text-muted-foreground">
              {treeLoading && treeClients.length > 0 ? 'Atualizando...' : `${treeClients.length} ${treeClients.length === 1 ? 'cliente' : 'clientes'}`}
            </span>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3 xl:max-h-[calc(100vh-16rem)]">
            {treeError && treeClients.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
                <span>Não foi possível atualizar a lista.</span>
                <button type="button" onClick={() => fetchTreeClients()} className="rounded-lg border border-current px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  Tentar novamente
                </button>
              </div>
            )}
            {treeLoading && treeClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Carregando veículos...
              </div>
            ) : treeClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <AlertCircle className="text-muted-foreground" size={28} aria-hidden="true" />
                <p className="text-sm font-medium text-foreground">
                  {treeError ? 'Não foi possível carregar os veículos.' : 'Nenhum cliente ou veículo corresponde aos filtros.'}
                </p>
                {treeError && (
                  <button type="button" onClick={() => fetchTreeClients()} className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    Tentar novamente
                  </button>
                )}
              </div>
            ) : (
              treeClients.map((client) => {
                const isClientExpanded = !!expandedClients[client.id];
                const isAudit = client.id === 'audit-orphans';
                const vehicleCount = client._count?.veiculos || 0;
                return (
                  <div key={client.id} className={`overflow-hidden rounded-lg border ${isAudit ? 'border-amber-500/40' : 'border-border'}`}>
                    <button
                      type="button"
                      aria-expanded={isClientExpanded}
                      onClick={() => handleToggleClient(client.id)}
                      className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${isClientExpanded ? 'bg-muted/60' : 'hover:bg-muted/40'}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {isClientExpanded ? <ChevronDown size={16} aria-hidden="true" className="shrink-0" /> : <ChevronRight size={16} aria-hidden="true" className="shrink-0" />}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">
                            {isAudit && <AlertTriangle size={14} aria-hidden="true" className="mr-1 inline text-amber-700 dark:text-amber-300" />}
                            {client.nome}
                          </span>
                          {client.empresa && <span className="block truncate text-xs text-muted-foreground">{client.empresa}</span>}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {vehicleCount} {vehicleCount === 1 ? 'veículo' : 'veículos'}
                      </span>
                    </button>
                    {isClientExpanded && renderClientVehiclesTree(client.id)}
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section ref={detailsPanelRef} aria-label="Detalhes do veículo" className="min-w-0 xl:col-span-7">
          {!selectedVehicleId ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
              <Truck size={32} className="text-muted-foreground" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">Nenhum veículo selecionado</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Expanda um cliente e selecione um veículo para consultar o cadastro, orçamentos, ordens de serviço, manutenção, peças, documentos e finanças.
              </p>
            </div>
          ) : detailsLoading ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Carregando detalhes do veículo...</p>
            </div>
          ) : !vehicleDetails || !info ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 text-center">
              <AlertCircle size={28} className="text-rose-600" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Não foi possível carregar os detalhes do veículo.</p>
              {selectedVehicleId && (
                <button
                  type="button"
                  onClick={() => handleSelectVehicle(selectedVehicleId)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <div className="flex min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-card">
              <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-2xl font-semibold tracking-wide text-foreground">{info.placa}</p>
                    <StatusBadge status={info.status} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">{`${info.marca || ''} ${info.modelo || ''}`.trim() || 'Não informado'}</h2>
                  <p className="text-sm text-muted-foreground">
                    {info.cliente?.nome || 'Proprietário não informado'}
                    {info.cliente?.empresa ? ` · ${info.cliente.empresa}` : ''}
                    {info.subfrota ? ` · ${info.subfrota}` : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {info.kmAtual === null || info.kmAtual === undefined ? 'Quilometragem não informada' : `${Number(info.kmAtual).toLocaleString('pt-BR')} km`}
                    {' · '}
                    Faturado {formatCurrency(vehicleDetails.financeiro.filter((item: { tipo?: string; valor?: number }) => item.tipo === 'RECEITA').reduce((acc: number, item: { valor?: number }) => acc + (item.valor || 0), 0))}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(info)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Edit2 size={15} aria-hidden="true" />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget({ id: info.id, placa: info.placa })}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-500/40 px-3 text-sm font-medium text-rose-700 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:text-rose-300"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    Excluir
                  </button>
                </div>
              </div>

              {vehicleDetails.infoCadastral.auditAlerts && vehicleDetails.infoCadastral.auditAlerts.length > 0 && (
                <div className="mx-6 mt-4 p-3.5 bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300 shadow-sm">
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0">
                    <AlertTriangle className="text-amber-500" size={16} />
                  </div>
                  <div className="text-xs">
                    <span className="font-black block">Aviso de Auditoria</span>
                    <span className="font-medium">Inconsistências detectadas: </span>
                    <span className="font-bold">{vehicleDetails.infoCadastral.auditAlerts.join(', ')}</span>
                  </div>
                </div>
              )}

              {/* ── Glassmorphic Tab Menu with Glow ── */}
              <div role="tablist" aria-label="Seções do veículo" className="flex shrink-0 overflow-x-auto border-b border-border px-2">
                {[
                  { id: 'info', label: 'Cadastro', icon: <FileText size={14} /> },
                  { id: 'quotes', label: 'Orçamentos', icon: <Clipboard size={14} /> },
                  { id: 'os', label: 'Ordens de Serviço', icon: <CheckSquare size={14} /> },
                  { id: 'maintenance', label: 'Manutenção', icon: <Wrench size={14} /> },
                  { id: 'parts', label: 'Peças Utilizadas', icon: <Package size={14} /> },
                  { id: 'docs', label: 'Documentos', icon: <Paperclip size={14} /> },
                  { id: 'finance', label: 'Finanças DRE', icon: <DollarSign size={14} /> }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={detailsTab === tab.id}
                    onClick={() => setDetailsTab(tab.id as any)}
                    className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                      detailsTab === tab.id
                        ? 'border-primary text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Display Panel Container */}
              <div className="p-6 flex-1">

                {/* TAB 1: INFO CADASTRAL */}
                {detailsTab === 'info' && (
                  <div className="space-y-8">
                    <section>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Identificação</h3>
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Placa" value={info.placa} />
                        <InfoField label="Chassi" value={info.chassi} />
                        <InfoField label="RENAVAM" value={info.renavam} />
                        <InfoField label="VIN" value={info.vin} />
                        <InfoField label="Prefixo" value={info.prefixo} />
                      </div>
                    </section>
                    <section className="border-t border-border pt-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados técnicos</h3>
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Ano de fabricação / modelo" value={fleetYearLabel(info.anoFabricacao, info.anoModelo) === 'Não informado' ? '' : fleetYearLabel(info.anoFabricacao, info.anoModelo)} />
                        <InfoField label="Cor" value={info.cor} />
                        <InfoField label="Combustível" value={info.combustivel} />
                        <InfoField label="Tipo" value={info.tipoVeiculo} />
                        <InfoField label="Quilometragem" value={info.kmAtual === null || info.kmAtual === undefined ? '' : `${Number(info.kmAtual).toLocaleString('pt-BR')} km`} />
                      </div>
                    </section>
                    <section className="border-t border-border pt-6">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Dados administrativos</h3>
                      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InfoField label="Proprietário" value={info.cliente?.nome} />
                        <InfoField label="Empresa" value={info.cliente?.empresa} />
                        <InfoField label="Frota" value={info.frota} />
                        <InfoField label="Subfrota" value={info.subfrota} />
                        <div className="sm:col-span-2">
                          <InfoField label="Observações" value={info.observacoes} />
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {/* TAB 2: ORÇAMENTOS VINCULADOS */}
                {detailsTab === 'quotes' && (
                  <div className="space-y-4">
                    {vehicleDetails.orcamentos.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 space-y-2">
                        <Clipboard size={32} className="mx-auto" />
                        <p className="text-xs">Nenhum orçamento pendente encontrado para este veículo.</p>
                      </div>
                    ) : (
                      <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                            <tr>
                              <th className="p-3 w-3/12 md:w-2/12">Nº Orc</th>
                              <th className="p-3 w-2/12 hidden md:table-cell">Data</th>
                              <th className="p-3 w-5/12 md:w-3/12">Itens</th>
                              <th className="p-3 w-2/12 text-right hidden sm:table-cell">Valor Total</th>
                              <th className="p-3 w-4/12 md:w-3/12 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {vehicleDetails.orcamentos.map((q: any) => (
                              <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                <td className="p-3 font-bold text-primary dark:text-primary truncate">#{q.numeroOrcamento}</td>
                                <td className="p-3 font-medium hidden md:table-cell truncate">{new Date(q.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 font-medium truncate" title={q.items.map((i: any) => i.descricao).join(', ')}>
                                  {q.items.length} {q.items.length === 1 ? 'item' : 'itens'} ({q.items.map((i: any) => i.descricao).slice(0, 2).join(', ')}...)
                                </td>
                                <td className="p-3 text-right font-bold text-gray-900 dark:text-white hidden sm:table-cell truncate">{formatCurrency(q.total)}</td>
                                <td className="p-3 text-center truncate">
                                  <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase truncate block w-fit mx-auto">
                                    {q.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: ORDENS DE SERVIÇO VINCULADAS */}
                {detailsTab === 'os' && (
                  <div className="space-y-4">
                    {vehicleDetails.ordensServico.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 space-y-2">
                        <CheckSquare size={32} className="mx-auto" />
                        <p className="text-xs">Nenhuma ordem de serviço vinculada encontrada para este veículo.</p>
                      </div>
                    ) : (
                      <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                            <tr>
                              <th className="p-3 w-3/12 md:w-2/12">OS / Orc</th>
                              <th className="p-3 w-2/12 hidden md:table-cell">Ref Externa</th>
                              <th className="p-3 w-2/12 hidden sm:table-cell">Data</th>
                              <th className="p-3 w-2/12 hidden lg:table-cell">Prazo Execução</th>
                              <th className="p-3 w-4/12 md:w-2/12 text-right">Total</th>
                              <th className="p-3 w-5/12 md:w-2/12 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {vehicleDetails.ordensServico.map((os: any) => (
                              <tr key={os.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                <td className="p-3 font-bold text-primary dark:text-primary truncate">#{os.numeroOrcamento}</td>
                                <td className="p-3 font-bold text-gray-500 dark:text-gray-400 hidden md:table-cell truncate">{os.osExterna || '—'}</td>
                                <td className="p-3 font-medium hidden sm:table-cell truncate">{new Date(os.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 font-medium text-gray-500 hidden lg:table-cell truncate">{os.prazoExecucao || '—'}</td>
                                <td className="p-3 text-right font-black text-gray-900 dark:text-white truncate">{formatCurrency(os.total)}</td>
                                <td className="p-3 text-center truncate">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase truncate block w-fit mx-auto ${
                                    os.status === 'Pago' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                                  }`}>
                                    {os.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: HISTÓRICO DE MANUTENÇÃO (Timeline) */}
                {detailsTab === 'maintenance' && (
                  <div className="space-y-6 animate-fade-in-up">
                    {vehicleDetails.manutencoes.length === 0 ? (
                      <div className="text-center py-16 text-gray-400 space-y-3">
                        <div className="mx-auto w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                          <Wrench size={28} className="text-gray-300 dark:text-gray-500" />
                        </div>
                        <p className="text-xs font-semibold">Nenhum histórico de manutenção ou evento lançado na base de dados.</p>
                      </div>
                    ) : (
                      <div className="flow-root relative pl-6 timeline-gradient before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:rounded-full">
                        {vehicleDetails.manutencoes.map((m: any, idx: number) => {
                          const bulletColor = m.tipo === 'TROCA_OLEO_MOTOR' ? 'border-rose-500 bg-rose-500' :
                            m.tipo === 'TROCA_OLEO_CAMBIO' ? 'border-orange-500 bg-orange-500' :
                            m.tipo === 'REVISAO' ? 'border-blue-500 bg-blue-500' :
                            'border-primary bg-primary';
                          return (
                          <div key={idx} className="relative pb-6 last:pb-0">
                            {/* Contextual bullet with pulse */}
                            <div className={`absolute -left-6 mt-1.5 flex items-center justify-center bg-white dark:bg-gray-800 border-2 ${bulletColor.split(' ')[0]} rounded-full h-5 w-5 shadow-sm`}>
                              <div className={`h-2 w-2 ${bulletColor.split(' ')[1]} rounded-full pulse-glow`}></div>
                            </div>

                            <div className="bg-gradient-to-r from-gray-50/70 to-white dark:from-gray-700/25 dark:to-gray-800/25 p-4 rounded-xl border border-gray-100/60 dark:border-gray-700/60 flex flex-col sm:flex-row justify-between items-start gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                              <div className="space-y-1.5 flex-1 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase ${
                                    m.tipo === 'TROCA_OLEO_MOTOR' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/40' :
                                    m.tipo === 'TROCA_OLEO_CAMBIO' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900/40' :
                                    m.tipo === 'REVISAO' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900/40' :
                                    'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40'
                                  }`}>
                                    {m.tipo.replace("_", " ")}
                                  </span>
                                  <span className="text-gray-400 font-semibold">{new Date(m.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <p className="text-xs font-bold text-gray-800 dark:text-white leading-relaxed">{m.descricao}</p>
                                {m.km && (
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg w-max">
                                    <Activity size={10} className="inline mr-1" />Hodômetro: {m.km.toLocaleString('pt-BR')} KM
                                  </span>
                                )}
                                {m.proximaTroca && (
                                  <span className="text-[10px] font-bold text-indigo-650 dark:text-primary/70 block bg-primary/10 dark:bg-primary/20 px-2 py-0.5 rounded-lg w-max">
                                    {m.proximaTroca}
                                  </span>
                                )}
                              </div>

                              {m.valor > 0 && (
                                <div className="text-right whitespace-nowrap self-start shrink-0 text-xs bg-rose-50/60 dark:bg-rose-950/20 px-3 py-2 rounded-xl border border-rose-100/50 dark:border-rose-900/30">
                                  <span className="text-gray-400 block mb-0.5 text-[10px]">Custo Lançado</span>
                                  <span className="font-black text-rose-600 dark:text-rose-400">{formatCurrency(m.valor)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: PEÇAS UTILIZADAS */}
                {detailsTab === 'parts' && (
                  <div className="space-y-4">
                    {vehicleDetails.pecas.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 space-y-2">
                        <Package size={32} className="mx-auto" />
                        <p className="text-xs">Nenhuma peça cadastrada nas revisões/orçamentos do veículo.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-primary/10 dark:bg-primary/20 p-4 rounded-xl border border-primary/30 dark:border-primary/20 flex justify-between items-center text-xs">
                          <span className="font-bold text-indigo-750 dark:text-primary/70">Resumo de Peças Adquiridas</span>
                          <span className="font-black text-primary dark:text-primary">
                            Total Alocado: {formatCurrency(vehicleDetails.pecas.reduce((acc: number, p: any) => acc + p.valorTotal, 0))}
                          </span>
                        </div>

                        <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                              <tr>
                                <th className="p-3 w-5/12 md:w-4/12">Descrição da Peça</th>
                                <th className="p-3 w-2/12 text-center hidden md:table-cell">Quantidade</th>
                                <th className="p-3 w-2/12 text-right hidden sm:table-cell">Valor Unitário</th>
                                <th className="p-3 w-4/12 md:w-2/12 text-right">Valor Total</th>
                                <th className="p-3 w-3/12 md:w-2/12 truncate">Orc / OS Origem</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {vehicleDetails.pecas.map((p: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                  <td className="p-3 font-semibold text-gray-800 dark:text-white truncate">{p.descricao}</td>
                                  <td className="p-3 text-center font-bold text-gray-500 hidden md:table-cell truncate">{p.quantidade}</td>
                                  <td className="p-3 text-right font-medium hidden sm:table-cell truncate">{formatCurrency(p.valorUnitario)}</td>
                                  <td className="p-3 text-right font-bold text-gray-900 dark:text-white truncate">{formatCurrency(p.valorTotal)}</td>
                                  <td className="p-3 font-bold text-primary dark:text-primary truncate">#{p.numeroOrcamento}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 6: DOCUMENTOS & ANEXOS */}
                {detailsTab === 'docs' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                    
                    {/* Left: QR Code dynamic banner (5 columns) */}
                    <div className="md:col-span-5 space-y-4">
                      <div className="p-6 bg-slate-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center shadow-inner relative overflow-hidden select-none">
                        <div className="absolute top-0 right-0 p-2 text-primary/70 pointer-events-none">
                          <Activity size={24} className="opacity-10" />
                        </div>
                        <div className="w-36 h-36 bg-white p-3 rounded-2xl border border-gray-300/80 flex items-center justify-center relative shadow-md">
                          {/* Interactive Premium SVG QR Code */}
                          <svg className="w-32 h-32 text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                            <path d="M5,5 h30 v30 h-30 z M15,15 h10 v10 h-10 z" />
                            <path d="M65,5 h30 v30 h-30 z M75,15 h10 v10 h-10 z" />
                            <path d="M5,65 h30 v30 h-30 z M15,75 h10 v10 h-10 z" />
                            <path d="M45,5 h10 v10 h-10 z M55,20 h10 v15 h-10 z M45,25 h5 v5 h-5 z" />
                            <path d="M45,45 h10 v10 h-10 z M65,45 h15 v10 h-15 z M85,45 h10 v10 h-10 z" />
                            <path d="M5,45 h20 v10 h-20 z M30,55 h10 v10 h-10 z" />
                            <path d="M55,65 h10 v15 h-10 z M70,65 h25 v10 h-25 z M80,80 h15 v15 h-15 z M45,75 h20 v10 h-20 z" />
                          </svg>
                        </div>
                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 mt-4 uppercase tracking-wider">Identificador QR de Frota</span>
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-350 mt-1 uppercase font-mono">TOKEN: {vehicleDetails.infoCadastral.placa}</h4>
                        <p className="text-[9px] text-gray-400 dark:text-gray-550 mt-2 max-w-xs leading-relaxed font-medium">Aponte a câmera do dispositivo móvel para acessar instantaneamente a ficha técnica do veículo na oficina.</p>
                      </div>
                    </div>

                    {/* Right: List of attachments from invoices/transactions (7 columns) */}
                    <div className="md:col-span-7 space-y-4">
                      <h3 className="text-xs font-black uppercase text-primary tracking-wider">Anexos Financeiros e Fiscais</h3>
                      {vehicleDetails.documentos.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-700/10 rounded-xl border border-gray-150/40 dark:border-gray-700/60 text-gray-400 text-xs">
                          Nenhum comprovante fiscal ou documento anexado às transações deste veículo.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {vehicleDetails.documentos.map((doc: any) => (
                            <div key={doc.id} className="p-3 bg-gray-50 dark:bg-gray-700/20 rounded-xl border border-gray-150/30 dark:border-gray-700/50 flex justify-between items-center text-xs">
                              <div className="space-y-0.5 overflow-hidden">
                                <span className="font-bold text-gray-800 dark:text-white block truncate">{doc.nome}</span>
                                <span className="text-[10px] text-gray-400 block truncate">{doc.origem} • {new Date(doc.data).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-primary hover:bg-primary text-white font-bold px-3 py-1.5 rounded-lg shrink-0 transition text-[10px]"
                              >
                                Visualizar
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 7: HISTÓRICO FINANCEIRO / DRE DO VEÍCULO */}
                {detailsTab === 'finance' && (
                  <div className="space-y-6 animate-fade-in-up">
                    
                    {/* Top KPI row of finance */}
                    {(() => {
                      const totalRevenues = vehicleDetails.financeiro.filter((f: any) => f.tipo === 'RECEITA').reduce((acc: number, f: any) => acc + f.valor, 0);
                      const totalExpenses = vehicleDetails.financeiro.filter((f: any) => f.tipo !== 'RECEITA').reduce((acc: number, f: any) => acc + f.valor, 0);
                      const netBalance = totalRevenues - totalExpenses;
                      const total = totalRevenues + totalExpenses;
                      const revenuePercent = total > 0 ? (totalRevenues / total) * 100 : 50;

                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between text-xs shine-hover transition-all duration-200 hover:shadow-md">
                              <div className="space-y-1">
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold block">Faturado (Receitas)</span>
                                <span className="text-xl font-black text-emerald-800 dark:text-emerald-400">{formatCurrency(totalRevenues)}</span>
                              </div>
                              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                <TrendingUp size={20} />
                              </div>
                            </div>

                            <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/10 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-between text-xs shine-hover transition-all duration-200 hover:shadow-md">
                              <div className="space-y-1">
                                <span className="text-rose-700 dark:text-rose-300 font-bold block">Custos (Despesas)</span>
                                <span className="text-xl font-black text-rose-800 dark:text-rose-400">{formatCurrency(totalExpenses)}</span>
                              </div>
                              <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl">
                                <TrendingDown size={20} />
                              </div>
                            </div>

                            <div className={`p-4 border rounded-2xl flex items-center justify-between text-xs shine-hover transition-all duration-200 hover:shadow-md ${
                              netBalance >= 0 
                                ? 'bg-gradient-to-br from-primary/10 to-transparent/30 border-primary/30 dark:from-primary/10/20 dark:to-transparent/10 dark:border-primary/20' 
                                : 'bg-gradient-to-br from-amber-50 to-orange-50/30 border-amber-100 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-900/30'
                            }`}>
                              <div className="space-y-1">
                                <span className={`font-bold block ${netBalance >= 0 ? 'text-primary dark:text-primary/70' : 'text-amber-700 dark:text-amber-300'}`}>Saldo Líquido</span>
                                <span className={`text-xl font-black ${netBalance >= 0 ? 'text-primary dark:text-primary' : 'text-amber-800 dark:text-amber-450'}`}>{formatCurrency(netBalance)}</span>
                              </div>
                              <div className={`p-2.5 rounded-xl ${netBalance >= 0 ? 'bg-primary/10 text-indigo-650' : 'bg-amber-500/10 text-amber-600'}`}>
                                <Activity size={20} />
                              </div>
                            </div>
                          </div>

                          {/* Visual Proportion Bar */}
                          {total > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-[10px] font-bold">
                                <span className="text-emerald-600 dark:text-emerald-400">Receitas {revenuePercent.toFixed(0)}%</span>
                                <span className="text-rose-600 dark:text-rose-400">Despesas {(100 - revenuePercent).toFixed(0)}%</span>
                              </div>
                              <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden flex shadow-inner">
                                <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-l-full transition-all duration-700 ease-out" style={{ width: `${revenuePercent}%` }} />
                                <div className="bg-gradient-to-r from-rose-400 to-rose-500 rounded-r-full transition-all duration-700 ease-out flex-1" />
                              </div>
                            </div>
                          )}

                          {/* Chronological ledger table */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-primary dark:text-primary tracking-wider flex items-center gap-1.5"><DollarSign size={12} /> Detalhamento de Lançamentos Financeiros</h4>
                            {vehicleDetails.financeiro.length === 0 ? (
                              <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-700/10 rounded-xl border border-gray-150/40 dark:text-gray-400 text-xs">
                                Nenhuma receita ou despesa registrada para o veículo.
                              </div>
                            ) : (
                              <div className="w-full overflow-x-auto scrollbar-thin rounded-xl border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300 table-fixed break-words">
                                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                                    <tr>
                                      <th className="p-3 w-2/12 hidden sm:table-cell">Data</th>
                                      <th className="p-3 w-6/12 md:w-5/12">Descrição / Lançamento</th>
                                      <th className="p-3 w-2/12 hidden md:table-cell">Categoria</th>
                                      <th className="p-3 w-3/12 md:w-2/12 text-right">Valor</th>
                                      <th className="p-3 w-3/12 md:w-1/12 text-center hidden lg:table-cell">Situação</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {vehicleDetails.financeiro.map((fin: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                        <td className="p-3 font-medium hidden sm:table-cell truncate">{new Date(fin.vencimento).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-white truncate">
                                          {fin.tipo === 'RECEITA' ? 'Receita OS ' : fin.tipo === 'DESPESA' ? 'Despesa Lançamento ' : 'Custo Manutenção '}
                                          {fin.numero ? `#${fin.numero}` : ''}
                                          <span className="font-semibold block text-[10px] text-gray-400 font-normal mt-0.5 truncate">{fin.descricao}</span>
                                        </td>
                                        <td className="p-3 font-semibold text-gray-500 hidden md:table-cell truncate">{fin.tipo}</td>
                                        <td className={`p-3 text-right font-black truncate ${fin.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {fin.tipo === 'RECEITA' ? '+' : '-'}{formatCurrency(fin.valor)}
                                        </td>
                                        <td className="p-3 text-center hidden lg:table-cell truncate">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase truncate block w-fit mx-auto ${
                                            fin.status === 'RECEBIDA' || fin.status === 'PAGA' || fin.status === 'PAGO'
                                              ? 'bg-green-100 text-green-805 dark:bg-green-950/30 dark:text-green-400' 
                                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400'
                                          }`}>
                                            {fin.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ═══════════ PREMIUM MODAL ═══════════ */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-[95%] max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            
            {/* Modal Header with animated gradient */}
            <div className="flex items-center justify-between gap-3 border-b border-border bg-card px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{editingVehicleId ? 'Editar veículo' : 'Cadastrar veículo'}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">Preencha os dados ou consulte a placa.</p>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setIsModalOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-gray-100/80 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-900/30 px-6 backdrop-blur-sm">
              {[
                { id: 'geral', label: 'Identificação' },
                { id: 'tecnico', label: 'Dados Técnicos' },
                { id: 'proprietario', label: 'Proprietário' },
                { id: 'obs', label: 'Observações' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`py-3.5 px-4 font-bold text-sm border-b-2 transition-all duration-200 -mb-px ${
                    activeTab === tab.id
                      ? 'border-primary text-primary dark:text-primary glow-underline'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/30'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
              
              {/* TAB 1: IDENTIFICATION */}
              {activeTab === 'geral' && (
                <div className="space-y-6">
                  
                  {/* Plate Autocomplete bar */}
                  <div className="p-4 bg-primary/10 dark:bg-primary/20 rounded-xl border border-primary/30 dark:border-primary/20 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-bold text-primary dark:text-primary uppercase tracking-wider block">Consulta Rápida de Placa</label>
                      <input
                        type="text"
                        placeholder="Ex: ABC1234 ou AAA1A23"
                        value={form.placa}
                        onChange={(e) => setForm({ ...form, placa: e.target.value })}
                        disabled={editingVehicleId !== null}
                        className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 font-bold uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {editingVehicleId === null && (
                      <button
                        type="button"
                        onClick={handleLookupPlate}
                        disabled={isPlateLoading}
                        className="bg-primary hover:bg-primary text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                      >
                        {isPlateLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Sparkles size={16} />
                        )}
                        Consultar Placa
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Marca *</label>
                      <input
                        type="text"
                        required
                        value={form.marca}
                        onChange={(e) => setForm({ ...form, marca: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Modelo *</label>
                      <input
                        type="text"
                        required
                        value={form.modelo}
                        onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Versão</label>
                      <input
                        type="text"
                        value={form.versao}
                        onChange={(e) => setForm({ ...form, versao: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ano Fabricação *</label>
                      <input
                        type="number"
                        required
                        value={form.anoFabricacao}
                        onChange={(e) => setForm({ ...form, anoFabricacao: parseInt(e.target.value) || 2020 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ano Modelo *</label>
                      <input
                        type="number"
                        required
                        value={form.anoModelo}
                        onChange={(e) => setForm({ ...form, anoModelo: parseInt(e.target.value) || 2020 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Cor</label>
                      <input
                        type="text"
                        value={form.cor}
                        onChange={(e) => setForm({ ...form, cor: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TECHNICAL DETAILS */}
              {activeTab === 'tecnico' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Renavam</label>
                      <input
                        type="text"
                        value={form.renavam}
                        onChange={(e) => setForm({ ...form, renavam: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Combustível</label>
                      <select
                        value={form.combustivel}
                        onChange={(e) => setForm({ ...form, combustivel: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="Flex">Flex</option>
                        <option value="Gasolina">Gasolina</option>
                        <option value="Etanol">Etanol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Elétrico">Elétrico</option>
                        <option value="Híbrido">Híbrido</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tipo de Veículo</label>
                      <input
                        type="text"
                        value={form.tipoVeiculo}
                        onChange={(e) => setForm({ ...form, tipoVeiculo: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Prefixo</label>
                      <input
                        type="text"
                        value={form.prefixo}
                        onChange={(e) => setForm({ ...form, prefixo: e.target.value })}
                        placeholder="Ex: P-01"
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">KM Atual *</label>
                      <input
                        type="number"
                        required
                        value={form.kmAtual}
                        onChange={(e) => setForm({ ...form, kmAtual: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PROPRIETARIO & FROTA */}
              {activeTab === 'proprietario' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Proprietário (Cliente Responsável) *</label>
                      <select
                        required
                        value={form.clienteId}
                        onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="">Selecione o Cliente</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.nome}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Status Operacional *</label>
                      <select
                        required
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option value="ATIVO">Ativo</option>
                        <option value="EM_MANUTENCAO">Em Manutenção</option>
                        <option value="INATIVO">Inativo</option>
                        <option value="VENDIDO">Vendido</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Frota / Contrato</label>
                      <input
                        type="text"
                        placeholder="Ex: Frota Administrativo"
                        value={form.frota}
                        onChange={(e) => setForm({ ...form, frota: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Subfrota / Departamento</label>
                      <input
                        type="text"
                        placeholder="Ex: Diretoria"
                        value={form.subfrota}
                        onChange={(e) => setForm({ ...form, subfrota: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 4: OBSERVATIONS */}
              {activeTab === 'obs' && (
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Observações do Veículo</label>
                  <textarea
                    rows={6}
                    placeholder="Histórico prévio, avarias, revisões externas ou observações gerais..."
                    value={form.observacoes}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </form>

            <ModalFooterActions
              onCancel={() => setIsModalOpen(false)}
              onPrimary={() => handleSubmit({ preventDefault: () => {} } as FormEvent)}
              primaryLabel="Salvar Veículo"
              loading={isSubmitting}
              primaryType="button"
            />
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        title="Excluir veículo"
        message={deleteTarget ? `Excluir o veículo ${deleteTarget.placa}? Todo o histórico de preventivas e manutenções será removido permanentemente.` : ''}
        confirmText={isDeleting ? 'Excluindo...' : 'Excluir'}
        cancelText="Cancelar"
        isDanger
      />
    </div>
  );
}
