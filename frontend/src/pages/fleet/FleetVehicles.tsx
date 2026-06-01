import { useState, useEffect } from 'react';
import { 
  Truck, Plus, Search, Edit2, Trash2, Sparkles, Check, X,
  ChevronDown, ChevronRight, Folder, FolderOpen, DollarSign,
  Wrench, Package, Paperclip, Clipboard, CheckSquare, FileText, AlertCircle,
  TrendingUp, TrendingDown, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';

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
    categoria: 'Particular',
    tipoVeiculo: 'Automóvel',
    renavam: '',
    chassi: '',
    vin: '',
    codigoFipe: '',
    codigoInterno: '',
    frota: '',
    subfrota: '',
    municipio: '',
    uf: '',
    kmAtual: 0,
    mediaConsumo: 10.5,
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

        // Reload open clients' vehicles
        Object.keys(expandedClients).forEach(cid => {
          if (expandedClients[cid]) {
            fetchClientVehicles(cid, params);
          }
        });
      }
    } catch (err) {
      console.error('[Tree] Failed to fetch tree clients', err);
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
      }
    } catch (err) {
      console.error('[Tree] Failed to fetch client vehicles', err);
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

  useEffect(() => {
    fetchTreeClients();
    fetchClients();
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
      categoria: 'Particular',
      tipoVeiculo: 'Automóvel',
      renavam: '',
      chassi: '',
      vin: '',
      codigoFipe: '',
      codigoInterno: '',
      frota: '',
      subfrota: '',
      municipio: '',
      uf: '',
      kmAtual: 0,
      mediaConsumo: 10.5,
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
      categoria: vehicle.categoria || 'Particular',
      tipoVeiculo: vehicle.tipoVeiculo || 'Automóvel',
      renavam: vehicle.renavam || '',
      chassi: vehicle.chassi || '',
      vin: vehicle.vin || '',
      codigoFipe: vehicle.codigoFipe || '',
      codigoInterno: vehicle.codigoInterno || '',
      frota: vehicle.frota || '',
      subfrota: vehicle.subfrota || '',
      municipio: vehicle.municipio || '',
      uf: vehicle.uf || '',
      kmAtual: vehicle.kmAtual || 0,
      mediaConsumo: vehicle.mediaConsumo || 10.5,
      status: vehicle.status || 'ATIVO',
      clienteId: vehicle.clienteId || '',
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
          categoria: data.categoria || prev.categoria,
          tipoVeiculo: data.tipoVeiculo || prev.tipoVeiculo,
          chassi: data.chassi || prev.chassi,
          renavam: data.renavam || prev.renavam,
          municipio: data.municipio || prev.municipio,
          uf: data.uf || prev.uf,
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

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este veículo? Todo o histórico de preventivas e manutenções será removido permanentemente.')) {
      return;
    }

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
      } else {
        toast.error('Erro ao excluir veículo.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Group vehicles loaded for tree rendering
  const renderClientVehiclesTree = (clientId: string) => {
    const vehicles = clientVehicles[clientId] || [];

    if (clientVehiclesLoading[clientId]) {
      return (
        <div className="pl-8 py-2 flex items-center gap-2 text-xs text-gray-400">
          <div className="animate-spin rounded-full h-3 h-3 border border-indigo-600 border-t-transparent"></div>
          <span>Carregando frota...</span>
        </div>
      );
    }

    if (vehicles.length === 0) {
      return (
        <div className="pl-8 py-2 text-xs text-gray-400 italic">
          Nenhum veículo encontrado para os filtros ativos.
        </div>
      );
    }

    // Group vehicles by subfrota
    const subfrotasMap: Record<string, any[]> = {};
    const directVehicles: any[] = [];

    vehicles.forEach(v => {
      if (v.subfrota) {
        if (!subfrotasMap[v.subfrota]) {
          subfrotasMap[v.subfrota] = [];
        }
        subfrotasMap[v.subfrota].push(v);
      } else {
        directVehicles.push(v);
      }
    });

    return (
      <div className="pl-4 space-y-1">
        {/* Render subfrotas folders */}
        {Object.entries(subfrotasMap).map(([subfrotaName, subVehicles]) => {
          const subKey = `${clientId}_${subfrotaName}`;
          const isSubExpanded = !!expandedSubfrotas[subKey];
          return (
            <div key={subKey} className="space-y-1">
              <button
                onClick={() => handleToggleSubfrota(clientId, subfrotaName)}
                className="w-full flex items-center justify-between py-1.5 px-3 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition text-left"
              >
                <div className="flex items-center gap-2">
                  {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  {isSubExpanded ? <FolderOpen size={14} className="text-amber-500" /> : <Folder size={14} className="text-amber-500" />}
                  <span>{subfrotaName}</span>
                </div>
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  {subVehicles.length}
                </span>
              </button>

              {isSubExpanded && (
                <div className="pl-6 space-y-0.5 border-l border-gray-100 dark:border-gray-700 ml-4">
                  {subVehicles.map(v => renderVehicleNode(v))}
                </div>
              )}
            </div>
          );
        })}

        {/* Render direct vehicles under client */}
        {directVehicles.map(v => renderVehicleNode(v))}
      </div>
    );
  };

  const renderVehicleNode = (v: any) => {
    const isSelected = selectedVehicleId === v.id;
    return (
      <button
        key={v.id}
        onClick={() => handleSelectVehicle(v.id)}
        className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition ${
          isSelected 
            ? 'bg-indigo-600 text-white shadow-sm' 
            : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-gray-700/30 hover:text-indigo-600'
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Truck size={14} className={isSelected ? 'text-white' : 'text-indigo-500'} />
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide border font-mono ${
            isSelected 
              ? 'bg-white text-indigo-700 border-white' 
              : 'bg-white dark:bg-gray-800 text-gray-900 border-gray-300 dark:border-gray-600'
          }`}>
            {v.placa}
          </span>
          <span className="text-xs truncate font-medium">{v.marca} {v.modelo}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          <span className={`w-2 h-2 rounded-full ${
            v.status === 'ATIVO' ? 'bg-green-500' :
            v.status === 'EM_MANUTENCAO' ? 'bg-amber-500' : 'bg-red-500'
          }`} />
        </div>
      </button>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header section with Premium KPI Dashboard Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden border border-indigo-950">
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Truck className="text-indigo-400" /> Gestão de Frota Inteligente
          </h1>
          <p className="text-indigo-200 text-sm mt-1">Carregamento automático de veículos cadastrados na base de dados com visualização de timeline e dados financeiros.</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="relative z-10 flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <Plus size={18} />
          Cadastrar Veículo
        </button>
      </div>

      {/* Advanced Search & Filtering Console */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Search size={12} /> Filtros de Pesquisa e Período
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Cliente / Empresa</label>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Placa do Veículo</label>
            <input
              type="text"
              placeholder="Ex: ABC1234"
              value={placaFilter}
              onChange={(e) => setPlacaFilter(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Chassi</label>
            <input
              type="text"
              placeholder="Buscar chassi..."
              value={chassiFilter}
              onChange={(e) => setChassiFilter(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Status Operacional</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ATIVO">Apenas Ativos</option>
              <option value="all">Todos os Status</option>
              <option value="EM_MANUTENCAO">Em Manutenção</option>
              <option value="INATIVO">Apenas Inativos</option>
              <option value="VENDIDO">Vendidos</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Início do Período</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400">Término do Período</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Tree Navigation Pane, Right Dashboard cockpit Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Lazy loading Hierarchical tree-view (5 columns width) */}
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden min-h-[500px] flex flex-col">
          <div className="p-4 bg-indigo-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-wider">Estrutura de Clientes e Frota</span>
            <span className="bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full text-[10px]">
              {treeClients.length} Clientes Ativos
            </span>
          </div>

          <div className="p-4 flex-1 overflow-y-auto max-h-[600px] space-y-2">
            {treeLoading && treeClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
                <span className="text-xs">Carregando árvore de frota...</span>
              </div>
            ) : treeClients.length === 0 ? (
              <div className="text-center py-12 text-gray-400 space-y-2">
                <AlertCircle className="mx-auto" size={32} />
                <p className="text-xs">Nenhum cliente ou veículo corresponde aos filtros.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {treeClients.map(client => {
                  const isClientExpanded = !!expandedClients[client.id];
                  return (
                    <div key={client.id} className="space-y-1">
                      {/* Client Root Node Row */}
                      <div
                        onClick={() => handleToggleClient(client.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition select-none ${
                          isClientExpanded 
                            ? 'bg-indigo-50/40 dark:bg-gray-700/40 border-l-4 border-indigo-600' 
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 border-l-4 border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          {isClientExpanded ? <ChevronDown size={16} className="text-indigo-600" /> : <ChevronRight size={16} className="text-gray-400" />}
                          <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                            {client.nome.charAt(0).toUpperCase()}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">{client.nome}</h4>
                            {client.empresa && (
                              <p className="text-[10px] text-gray-400 truncate font-medium">{client.empresa}</p>
                            )}
                          </div>
                        </div>

                        <span className="bg-indigo-600/10 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full text-[9px] shrink-0">
                          {client._count?.veiculos} {client._count?.veiculos === 1 ? 'Veículo' : 'Veículos'}
                        </span>
                      </div>

                      {/* Client vehicles child node list */}
                      {isClientExpanded && renderClientVehiclesTree(client.id)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Premium Split-pane Vehicle Details dashboard cockpit (8 columns width) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedVehicleId ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-12 text-center text-gray-400 flex flex-col items-center justify-center min-h-[500px]">
              <Truck size={48} className="text-indigo-200 dark:text-gray-600 mb-4 animate-bounce" />
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">Nenhum Veículo Selecionado</h3>
              <p className="text-xs text-gray-400 mt-2 max-w-sm">Navegue pela árvore de clientes no painel esquerdo, expanda suas frotas e selecione um veículo para abrir o console de diagnósticos, histórico de manutenção e DRE financeiro.</p>
            </div>
          ) : detailsLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 min-h-[500px] flex items-center justify-center">
              <div className="space-y-4 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Consultando banco de dados...</p>
              </div>
            </div>
          ) : !vehicleDetails ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-400">
              <AlertCircle size={32} className="mx-auto mb-2 text-rose-500" />
              <span>Erro ao carregar detalhes do veículo. Tente novamente.</span>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col min-h-[550px]">
              
              {/* Dynamic Vehicle Cockpit Header (Realistic Mercosul plate banner) */}
              <div className="p-6 bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6">
                
                {/* 3D Premium Mercosul Plate */}
                <div className="relative shrink-0 flex flex-col border-[3px] border-blue-600 rounded-xl overflow-hidden w-64 bg-white shadow-md select-none transform hover:scale-102 transition duration-200">
                  <div className="bg-blue-600 px-3 py-1 flex justify-between items-center text-[9px] font-black text-white tracking-widest uppercase">
                    <span>BRASIL</span>
                    <span className="w-4 h-3 bg-yellow-400 rounded-sm inline-block relative overflow-hidden border border-blue-700">
                      <span className="absolute inset-0 bg-blue-900 rounded-full w-2 h-2 m-auto"></span>
                    </span>
                  </div>
                  <div className="px-6 py-2.5 text-center text-3xl font-extrabold tracking-wider text-gray-900 font-mono">
                    {vehicleDetails.infoCadastral.placa}
                  </div>
                </div>

                {/* Technical Title and quick indicators */}
                <div className="flex-1 space-y-1.5 text-center md:text-left">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <h2 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">{vehicleDetails.infoCadastral.marca} {vehicleDetails.infoCadastral.modelo}</h2>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      vehicleDetails.infoCadastral.status === 'ATIVO' ? 'bg-green-500/10 text-green-600' :
                      vehicleDetails.infoCadastral.status === 'EM_MANUTENCAO' ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {vehicleDetails.infoCadastral.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                    Proprietário: {vehicleDetails.infoCadastral.cliente?.nome || '—'} 
                    {vehicleDetails.infoCadastral.subfrota && ` • Subfrota: ${vehicleDetails.infoCadastral.subfrota}`}
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                    <span className="bg-indigo-50 dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <Activity size={12} /> {vehicleDetails.infoCadastral.kmAtual?.toLocaleString('pt-BR')} KM Hodômetro
                    </span>
                    <span className="bg-emerald-50 dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-gray-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                      <DollarSign size={12} /> {formatCurrency(vehicleDetails.financeiro.filter((f: any) => f.tipo === 'RECEITA').reduce((acc: number, f: any) => acc + f.valor, 0))} Faturado
                    </span>
                  </div>
                </div>

                {/* Administrative Quick Actions (Edit/Delete) */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenEditModal(vehicleDetails.infoCadastral)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-lg border border-indigo-200 dark:border-gray-700 transition"
                    title="Editar Cadastro do Veículo"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicleDetails.infoCadastral.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-gray-800 rounded-lg border border-rose-200 dark:border-gray-700 transition"
                    title="Remover Veículo e Histórico"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Glassmorphic Horizon Tab Menu */}
              <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 px-6 hide-scrollbar shrink-0">
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
                    onClick={() => setDetailsTab(tab.id as any)}
                    className={`flex items-center gap-1.5 py-3.5 px-4 font-bold text-xs border-b-2 whitespace-nowrap transition -mb-px ${
                      detailsTab === tab.id
                        ? 'border-indigo-600 text-indigo-600 dark:text-indigo-450'
                        : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Display Panel Container */}
              <div className="p-6 flex-1 overflow-y-auto max-h-[500px]">

                {/* TAB 1: INFO CADASTRAL */}
                {detailsTab === 'info' && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 dark:bg-gray-700/25 p-5 rounded-2xl border border-gray-150/40 dark:border-gray-700/60 space-y-4">
                        <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Ficha de Identificação</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400 block mb-0.5">Placa</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.placa}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Renavam</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.renavam || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Chassi</span>
                            <span className="font-bold text-gray-800 dark:text-white truncate block">{vehicleDetails.infoCadastral.chassi || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">VIN / Chassi Opcional</span>
                            <span className="font-bold text-gray-800 dark:text-white truncate block">{vehicleDetails.infoCadastral.vin || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Código FIPE</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.codigoFipe || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Código Interno</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.codigoInterno || '—'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/25 p-5 rounded-2xl border border-gray-150/40 dark:border-gray-700/60 space-y-4">
                        <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Parâmetros Técnicos</h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="text-gray-400 block mb-0.5">Ano Fabricação / Modelo</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.anoFabricacao} / {vehicleDetails.infoCadastral.anoModelo}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Cor Predominante</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.cor || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Combustível</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.combustivel || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Média de Consumo</span>
                            <span className="font-bold text-gray-800 dark:text-white">{vehicleDetails.infoCadastral.mediaConsumo ? `${vehicleDetails.infoCadastral.mediaConsumo} KM/L` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Tipo do Veículo / Categoria</span>
                            <span className="font-bold text-gray-800 dark:text-white truncate block">{vehicleDetails.infoCadastral.tipoVeiculo} ({vehicleDetails.infoCadastral.categoria})</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block mb-0.5">Local Emplacamento</span>
                            <span className="font-bold text-gray-800 dark:text-white truncate block">{vehicleDetails.infoCadastral.municipio} / {vehicleDetails.infoCadastral.uf}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {vehicleDetails.infoCadastral.observacoes && (
                      <div className="bg-gray-50 dark:bg-gray-700/25 p-5 rounded-2xl border border-gray-150/40 dark:border-gray-700/60 space-y-2">
                        <span className="text-xs font-black uppercase text-indigo-600 tracking-wider">Observações Administrativas</span>
                        <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{vehicleDetails.infoCadastral.observacoes}</p>
                      </div>
                    )}
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
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                            <tr>
                              <th className="p-3">Nº Orc</th>
                              <th className="p-3">Data</th>
                              <th className="p-3">Itens</th>
                              <th className="p-3 text-right">Valor Total</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {vehicleDetails.orcamentos.map((q: any) => (
                              <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">#{q.numeroOrcamento}</td>
                                <td className="p-3 font-medium">{new Date(q.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 font-medium truncate max-w-xs" title={q.items.map((i: any) => i.descricao).join(', ')}>
                                  {q.items.length} {q.items.length === 1 ? 'item' : 'itens'} ({q.items.map((i: any) => i.descricao).slice(0, 2).join(', ')}...)
                                </td>
                                <td className="p-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(q.total)}</td>
                                <td className="p-3 text-center">
                                  <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
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
                      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300">
                          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                            <tr>
                              <th className="p-3">OS / Orc</th>
                              <th className="p-3">Ref Externa</th>
                              <th className="p-3">Data</th>
                              <th className="p-3">Prazo Execução</th>
                              <th className="p-3 text-right">Total</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {vehicleDetails.ordensServico.map((os: any) => (
                              <tr key={os.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">#{os.numeroOrcamento}</td>
                                <td className="p-3 font-bold text-gray-500 dark:text-gray-400">{os.osExterna || '—'}</td>
                                <td className="p-3 font-medium">{new Date(os.createdAt).toLocaleDateString('pt-BR')}</td>
                                <td className="p-3 font-medium text-gray-500">{os.prazoExecucao || '—'}</td>
                                <td className="p-3 text-right font-black text-gray-900 dark:text-white">{formatCurrency(os.total)}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
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
                  <div className="space-y-6">
                    {vehicleDetails.manutencoes.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 space-y-2">
                        <Wrench size={32} className="mx-auto" />
                        <p className="text-xs">Nenhum histórico de manutenção ou evento lançado na base de dados.</p>
                      </div>
                    ) : (
                      <div className="flow-root relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-150 dark:before:bg-gray-700">
                        {vehicleDetails.manutencoes.map((m: any, idx: number) => (
                          <div key={idx} className="relative pb-6 last:pb-0">
                            {/* Bullet indicator */}
                            <div className="absolute -left-6 mt-1.5 flex items-center justify-center bg-white dark:bg-gray-800 border-2 border-indigo-600 rounded-full h-4 w-4">
                              <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full"></div>
                            </div>

                            <div className="bg-gray-50/70 dark:bg-gray-700/25 p-4 rounded-xl border border-gray-100/50 dark:border-gray-700/60 flex flex-col sm:flex-row justify-between items-start gap-4">
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
                                <p className="text-xs font-semibold text-gray-800 dark:text-white leading-relaxed">{m.descricao}</p>
                                {m.km && (
                                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded w-max">
                                    Hodômetro: {m.km.toLocaleString('pt-BR')} KM
                                  </span>
                                )}
                                {m.proximaTroca && (
                                  <span className="text-[10px] font-bold text-indigo-650 dark:text-indigo-300 block bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded w-max">
                                    {m.proximaTroca}
                                  </span>
                                )}
                              </div>

                              {m.valor > 0 && (
                                <div className="text-right whitespace-nowrap self-start shrink-0 text-xs">
                                  <span className="text-gray-400 block mb-0.5">Custo Lançado</span>
                                  <span className="font-black text-rose-600 dark:text-rose-400">{formatCurrency(m.valor)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
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
                        <div className="bg-indigo-50/50 dark:bg-indigo-950/10 p-4 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex justify-between items-center text-xs">
                          <span className="font-bold text-indigo-750 dark:text-indigo-300">Resumo de Peças Adquiridas</span>
                          <span className="font-black text-indigo-800 dark:text-indigo-400">
                            Total Alocado: {formatCurrency(vehicleDetails.pecas.reduce((acc: number, p: any) => acc + p.valorTotal, 0))}
                          </span>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                          <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                              <tr>
                                <th className="p-3">Descrição da Peça</th>
                                <th className="p-3 text-center">Quantidade</th>
                                <th className="p-3 text-right">Valor Unitário</th>
                                <th className="p-3 text-right">Valor Total</th>
                                <th className="p-3">Orc / OS Origem</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {vehicleDetails.pecas.map((p: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                  <td className="p-3 font-semibold text-gray-800 dark:text-white">{p.descricao}</td>
                                  <td className="p-3 text-center font-bold text-gray-500">{p.quantidade}</td>
                                  <td className="p-3 text-right font-medium">{formatCurrency(p.valorUnitario)}</td>
                                  <td className="p-3 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(p.valorTotal)}</td>
                                  <td className="p-3 font-bold text-indigo-600 dark:text-indigo-400">#{p.numeroOrcamento}</td>
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
                        <div className="absolute top-0 right-0 p-2 text-indigo-300 pointer-events-none">
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
                      <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Anexos Financeiros e Fiscais</h3>
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
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg shrink-0 transition text-[10px]"
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
                  <div className="space-y-6">
                    
                    {/* Top KPI row of finance */}
                    {(() => {
                      const totalRevenues = vehicleDetails.financeiro.filter((f: any) => f.tipo === 'RECEITA').reduce((acc: number, f: any) => acc + f.valor, 0);
                      const totalExpenses = vehicleDetails.financeiro.filter((f: any) => f.tipo !== 'RECEITA').reduce((acc: number, f: any) => acc + f.valor, 0);
                      const netBalance = totalRevenues - totalExpenses;

                      return (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center justify-between text-xs">
                              <div className="space-y-1">
                                <span className="text-emerald-700 dark:text-emerald-300 font-bold block">Faturado (Receitas)</span>
                                <span className="text-xl font-black text-emerald-800 dark:text-emerald-400">{formatCurrency(totalRevenues)}</span>
                              </div>
                              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl">
                                <TrendingUp size={20} />
                              </div>
                            </div>

                            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl flex items-center justify-between text-xs">
                              <div className="space-y-1">
                                <span className="text-rose-700 dark:text-rose-300 font-bold block">Custos (Despesas)</span>
                                <span className="text-xl font-black text-rose-800 dark:text-rose-400">{formatCurrency(totalExpenses)}</span>
                              </div>
                              <div className="p-2.5 bg-rose-500/10 text-rose-600 rounded-xl">
                                <TrendingDown size={20} />
                              </div>
                            </div>

                            <div className={`p-4 border rounded-2xl flex items-center justify-between text-xs ${
                              netBalance >= 0 
                                ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/30' 
                                : 'bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/30'
                            }`}>
                              <div className="space-y-1">
                                <span className={`font-bold block ${netBalance >= 0 ? 'text-indigo-700 dark:text-indigo-300' : 'text-amber-700 dark:text-amber-300'}`}>Saldo Líquido</span>
                                <span className={`text-xl font-black ${netBalance >= 0 ? 'text-indigo-800 dark:text-indigo-400' : 'text-amber-800 dark:text-amber-450'}`}>{formatCurrency(netBalance)}</span>
                              </div>
                              <div className={`p-2.5 rounded-xl ${netBalance >= 0 ? 'bg-indigo-500/10 text-indigo-650' : 'bg-amber-500/10 text-amber-600'}`}>
                                <Activity size={20} />
                              </div>
                            </div>
                          </div>

                          {/* Chronological ledger table */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider">Detalhamento de Lançamentos Financeiros</h4>
                            {vehicleDetails.financeiro.length === 0 ? (
                              <div className="text-center py-10 bg-gray-50/50 dark:bg-gray-700/10 rounded-xl border border-gray-150/40 dark:text-gray-400 text-xs">
                                Nenhuma receita ou despesa registrada para o veículo.
                              </div>
                            ) : (
                              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-xs text-left text-gray-600 dark:text-gray-300">
                                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase font-extrabold text-[10px]">
                                    <tr>
                                      <th className="p-3">Data</th>
                                      <th className="p-3">Descrição / Lançamento</th>
                                      <th className="p-3">Categoria</th>
                                      <th className="p-3 text-right">Valor</th>
                                      <th className="p-3 text-center">Situação</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {vehicleDetails.financeiro.map((fin: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/25">
                                        <td className="p-3 font-medium">{new Date(fin.vencimento).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-3 font-bold text-gray-800 dark:text-white">
                                          {fin.tipo === 'RECEITA' ? 'Receita OS ' : fin.tipo === 'DESPESA' ? 'Despesa Lançamento ' : 'Custo Manutenção '}
                                          {fin.numero ? `#${fin.numero}` : ''}
                                          <span className="font-semibold block text-[10px] text-gray-400 font-normal mt-0.5">{fin.descricao}</span>
                                        </td>
                                        <td className="p-3 font-semibold text-gray-500">{fin.tipo}</td>
                                        <td className={`p-3 text-right font-black ${fin.tipo === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {fin.tipo === 'RECEITA' ? '+' : '-'}{formatCurrency(fin.valor)}
                                        </td>
                                        <td className="p-3 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
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
        </div>
      </div>

      {/* Creation & Edition Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 bg-indigo-650 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Truck size={22} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{editingVehicleId ? 'Editar Veículo' : 'Cadastrar Novo Veículo'}</h2>
                  <p className="text-indigo-200 text-xs mt-0.5">Preencha os dados técnicos ou consulte a placa.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-white/80 hover:text-white transition">
                <X size={24} />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 px-6">
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
                  className={`py-3.5 px-4 font-semibold text-sm border-b-2 transition -mb-px ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 dark:text-indigo-450'
                      : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* TAB 1: IDENTIFICATION */}
              {activeTab === 'geral' && (
                <div className="space-y-6">
                  
                  {/* Plate Autocomplete bar */}
                  <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100/50 dark:border-indigo-900/20 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider block">Consulta Rápida de Placa</label>
                      <input
                        type="text"
                        placeholder="Ex: ABC1234 ou AAA1A23"
                        value={form.placa}
                        onChange={(e) => setForm({ ...form, placa: e.target.value })}
                        disabled={editingVehicleId !== null}
                        className="w-full bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 font-bold uppercase placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    {editingVehicleId === null && (
                      <button
                        type="button"
                        onClick={handleLookupPlate}
                        disabled={isPlateLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2 shadow-sm transition disabled:opacity-50"
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
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Modelo *</label>
                      <input
                        type="text"
                        required
                        value={form.modelo}
                        onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Versão</label>
                      <input
                        type="text"
                        value={form.versao}
                        onChange={(e) => setForm({ ...form, versao: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Ano Modelo *</label>
                      <input
                        type="number"
                        required
                        value={form.anoModelo}
                        onChange={(e) => setForm({ ...form, anoModelo: parseInt(e.target.value) || 2020 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Cor</label>
                      <input
                        type="text"
                        value={form.cor}
                        onChange={(e) => setForm({ ...form, cor: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: TECHNICAL DETAILS */}
              {activeTab === 'tecnico' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Renavam</label>
                      <input
                        type="text"
                        value={form.renavam}
                        onChange={(e) => setForm({ ...form, renavam: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Chassi</label>
                      <input
                        type="text"
                        value={form.chassi}
                        onChange={(e) => setForm({ ...form, chassi: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">VIN (Nº de Identificação)</label>
                      <input
                        type="text"
                        value={form.vin}
                        onChange={(e) => setForm({ ...form, vin: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Combustível</label>
                      <select
                        value={form.combustivel}
                        onChange={(e) => setForm({ ...form, combustivel: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-450">Categoria</label>
                      <input
                        type="text"
                        value={form.categoria}
                        onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Tipo de Veículo</label>
                      <input
                        type="text"
                        value={form.tipoVeiculo}
                        onChange={(e) => setForm({ ...form, tipoVeiculo: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Código FIPE</label>
                      <input
                        type="text"
                        value={form.codigoFipe}
                        onChange={(e) => setForm({ ...form, codigoFipe: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Código Interno</label>
                      <input
                        type="text"
                        value={form.codigoInterno}
                        onChange={(e) => setForm({ ...form, codigoInterno: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">KM Atual *</label>
                      <input
                        type="number"
                        required
                        value={form.kmAtual}
                        onChange={(e) => setForm({ ...form, kmAtual: parseInt(e.target.value) || 0 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Média Consumo (KM/L)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.mediaConsumo}
                        onChange={(e) => setForm({ ...form, mediaConsumo: parseFloat(e.target.value) || 10.5 })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Subfrota / Departamento</label>
                      <input
                        type="text"
                        placeholder="Ex: Diretoria"
                        value={form.subfrota}
                        onChange={(e) => setForm({ ...form, subfrota: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">Município Emplacamento</label>
                      <input
                        type="text"
                        value={form.municipio}
                        onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-semibold text-gray-600 dark:text-gray-400">UF Emplacamento</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={form.uf}
                        onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                        className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    className="w-full bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-600 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </form>

            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-indigo-650 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Check size={16} />
                )}
                Salvar Veículo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
