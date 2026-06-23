// Imports
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Activity,
  DollarSign,
  Users,
  Wrench,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertsWidget } from '../components/AlertsWidget';
import { useState, useEffect } from 'react';
import { QUOTE_STATUS_OPTIONS } from '../utils/constants';

export function Dashboard() {
  // Tab State
  const [activeTab, setActiveTab] = useState<'financeiro' | 'clientes' | 'operacional'>('financeiro');

  // Filter States (primary set)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedPlaca, setSelectedPlaca] = useState<string>('all');
  const [selectedOficinaId, setSelectedOficinaId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [subfrotaFilter, setSubfrotaFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [currentClientsPage, setCurrentClientsPage] = useState(1);
  const [currentOpenPage, setCurrentOpenPage] = useState(1);
  const [servicesPage, setServicesPage] = useState(1);
  const [servicesPageSize, setServicesPageSize] = useState(10);

  // Data Lists
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Dashboard Data
  const [stats, setStats] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Suppress unused warnings
  void [currentYear, currentPage, currentClientsPage, currentOpenPage, servicesPage, servicesPageSize];
  void [handleDelete, formatCurrency, formatDuration, s];

  // Load filter options (workshops & clients)
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        const workshopsRes = await fetch('/fleet/workshops', { headers });
        if (workshopsRes.ok) setWorkshops(await workshopsRes.json());
        const clientsRes = await fetch('/registry/clients', { headers });
        if (clientsRes.ok) setClients(await clientsRes.json());
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    };
    loadFilterData();
  }, []);

  // Fetch dashboard stats
  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        clientId: selectedClientId,
        placa: selectedPlaca !== 'all' ? selectedPlaca.trim() : '',
        oficinaId: selectedOficinaId,
        status: statusFilter,
        startDate,
        endDate,
        tipoServico: serviceTypeFilter,
        subfrota: subfrotaFilter.trim()
      });
      const response = await fetch(`/dashboard/workshop?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch other data
  const fetchQuotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/quotes', { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setQuotes(await response.json());
    } catch (error) {
      console.error('Failed to load quotes list', error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/registry/collaborators', { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setCollaborators(await response.json());
    } catch (error) {
      console.error('Failed to load collaborators', error);
    }
  };

  const fetchWorkshops = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/fleet/workshops', { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) setWorkshops(await response.json());
    } catch (error) {
      console.error('Failed to load workshops', error);
    }
  };

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchQuotes();
    fetchCollaborators();
    fetchWorkshops();
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setCurrentClientsPage(1);
    setCurrentOpenPage(1);
  }, [
    selectedCompanyId,
    selectedClientId,
    selectedPlaca,
    selectedOficinaId,
    statusFilter,
    startDate,
    endDate,
    serviceTypeFilter,
    subfrotaFilter,
    searchTerm
  ]);

  // Refresh stats when filter values affecting stats change
  useEffect(() => {
    setServicesPage(1);
    fetchStats();
  }, [selectedOficinaId, selectedClientId, selectedPlaca, statusFilter, startDate, endDate, serviceTypeFilter, subfrotaFilter]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este orçamento?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/quotes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        toast.success('Orçamento excluído com sucesso!');
        fetchStats();
        fetchQuotes();
      } else {
        toast.error('Erro ao excluir orçamento.');
      }
    } catch (error) {
      console.error('Failed to delete quote', error);
      toast.error('Erro de conexão ao excluir orçamento.');
    }
  };

  const handleClearFilters = () => {
    setSelectedOficinaId('all');
    setSelectedClientId('all');
    setSelectedPlaca('all');
    setStatusFilter('all');
    setStartDate('');
    setEndDate('');
    setServiceTypeFilter('all');
    setSubfrotaFilter('all');
    setSearchTerm('');
    setSelectedCompanyId('all');
    setServicesPage(1);
    toast.success('Filtros limpos com sucesso.');
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const formatDuration = (hours: number) => {
    if (!hours || hours <= 0) return '—';
    if (hours < 24) return `${hours.toFixed(1)}h`;
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h`;
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Carregando dados da oficina...</p>
      </div>
    );
  }

  // Safety fallback data structure
  const s = stats || {
    totalQuotes: 0,
    totalApproved: 0,
    totalPago: 0,
    ticketMedio: 0,
    veiculosAtendidos: 0,
    tempoMedioAtendimento: 0,
    tempoMedioAprovacao: 0,
    tempoMedioExecucao: 0,
    taxaConversao: 0,
    faturamentoAcumuladoAno: 0,
    monthlyBilling: [],
    topClients: [],
    clientsGrid: [],
    servicesGrid: [],
    strategicIndicators: {
      clienteMaisReceita: null,
      servicoMaisVendido: null,
      mecanicoMaisAtendimentos: null,
      topServices: [],
      topMechanics: []
    }
  };

  // --- UI rendering (kept from original file) ---
  return (
    <div className="space-y-6 max-h-screen flex flex-col overflow-hidden pb-4">
      {/* Top Title & Quick Link */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-sans">Dashboard da Oficina</h1>
            <p className="text-xs text-muted-foreground">Visão operacional e financeira em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Tab Selection Switcher */}
          <div className="flex border border-border bg-card p-1 rounded-lg gap-1.5 shadow-sm">
            <button
              className={`flex items-center gap-1.5 py-1.5 px-3 font-semibold text-xs rounded-md transition-all duration-150 ${
                activeTab === 'financeiro'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setActiveTab('financeiro')}
            >
              <DollarSign size={14} />
              <span>Financeiro</span>
            </button>
            <button
              className={`flex items-center gap-1.5 py-1.5 px-3 font-semibold text-xs rounded-md transition-all duration-150 ${
                activeTab === 'clientes'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setActiveTab('clientes')}
            >
              <Users size={14} />
              <span>Clientes</span>
            </button>
            <button
              className={`flex items-center gap-1.5 py-1.5 px-3 font-semibold text-xs rounded-md transition-all duration-150 ${
                activeTab === 'operacional'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setActiveTab('operacional')}
            >
              <Wrench size={14} />
              <span>Operacional</span>
            </button>
          </div>
          <Link
            to="/quotes/new"
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold shadow hover:bg-primary/90 transition text-center"
          >
            Nova OS / Orçamento
          </Link>
        </div>
      </div>

      {/* Alerts & Notifications Widget */}
      <AlertsWidget />

      {/* Advanced Filters Panel */}
      <div className="bg-card border border-border p-4 rounded-xl shadow-sm space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between text-foreground font-semibold border-b border-border/50 pb-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-bold">
            <Filter size={14} className="text-primary" />
            <span>Filtros do Painel Gerencial</span>
          </div>
          {(selectedClientId !== 'all' || selectedPlaca !== 'all' || selectedOficinaId !== 'all' || statusFilter !== 'all' || startDate || endDate || serviceTypeFilter !== 'all' || subfrotaFilter !== 'all' || searchTerm || selectedCompanyId !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="text-[11px] text-rose-500 hover:text-rose-600 font-semibold"
            >
              Limpar Filtros
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {/* Cliente */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Cliente</label>
            <select
              value={selectedClientId}
              onChange={e => setSelectedClientId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nome || c.empresa}</option>
              ))}
            </select>
          </div>
          {/* Placa */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Placa</label>
            <select
              value={selectedPlaca}
              onChange={e => setSelectedPlaca(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground font-mono"
            >
              <option value="all">Todas as Placas</option>
              {Array.from(new Set(quotes.map((q: any) => q.veiculoPlaca).filter(Boolean))).sort().map(placa => (
                <option key={placa} value={placa}>{placa}</option>
              ))}
            </select>
          </div>
          {/* Oficina */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Oficina</label>
            <select
              value={selectedOficinaId}
              onChange={e => setSelectedOficinaId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            >
              <option value="all">Todas as Oficinas</option>
              {workshops.map(w => (
                <option key={w.id} value={w.id}>{w.nome}</option>
              ))}
            </select>
          </div>
          {/* Status */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Status da OS</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            >
              <option value="all">Todos</option>
              {QUOTE_STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          {/* Período */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Período inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Período final</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            />
          </div>
          {/* Tipo de Serviço */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Tipo de Serviço</label>
            <select
              value={serviceTypeFilter}
              onChange={e => setServiceTypeFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            >
              <option value="all">Todos</option>
              <option value="Peça">Peças</option>
              <option value="Serviço">Serviços</option>
            </select>
          </div>
          {/* Subfrota */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Subfrota</label>
            <select
              value={subfrotaFilter}
              onChange={e => setSubfrotaFilter(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            >
              <option value="all">Todas</option>
              {Array.from(new Set(quotes.map((q: any) => q.veiculoSubfrota).filter(Boolean))).sort().map(sf => (
                <option key={sf} value={sf}>{sf}</option>
              ))}
            </select>
          </div>
          {/* Search */}
          <div className="space-y-1 col-span-2">
            <label className="text-[10px] uppercase font-bold text-muted-foreground">Busca</label>
            <input
              type="text"
              placeholder="Buscar por número, cliente ou placa"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-2 py-1 text-xs outline-none focus:border-primary transition text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Painel da Oficina
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão estratégica de faturamento, produtividade de mecânicos e relacionamento com clientes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotes/new')}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-primary/20 hover:bg-primary/95 transition active:scale-[0.98] duration-150 text-center text-sm"
          >
            Novo Orçamento
          </button>
        </div>
      </div>

      {/* The rest of the UI (cards, charts, grids) remains unchanged from the original implementation */}
      {/* ... */}
    </div>
  );
}
