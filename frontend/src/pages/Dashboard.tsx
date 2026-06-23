import { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Wrench, 
  Clock, 
  DollarSign, 
  Percent, 
  Activity, 
  UserCheck,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export function Dashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Tab State
  const [activeTab, setActiveTab] = useState<'financeiro' | 'clientes' | 'operacional'>('financeiro');

  // Filter States
  const [selectedOficinaId, setSelectedOficinaId] = useState('all');
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [placa, setPlaca] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTipoServico, setSelectedTipoServico] = useState('all');
  const [subfrota, setSubfrota] = useState('');

  // Data Options Lists (for filters)
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);

  // Dashboard Stats State
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch Filter Lists
  useEffect(() => {
    const loadFilterData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        const workshopsRes = await fetch('/fleet/workshops', { headers });
        if (workshopsRes.ok) {
          const data = await workshopsRes.json();
          setWorkshops(data || []);
        }

        const clientsRes = await fetch('/registry/clients', { headers });
        if (clientsRes.ok) {
          const data = await clientsRes.json();
          setClients(data || []);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    };
    loadFilterData();
  }, []);

  // Fetch Stats Data based on Filters
  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        clientId: selectedClientId,
        placa: placa.trim(),
        oficinaId: selectedOficinaId,
        status: selectedStatus,
        startDate,
        endDate,
        tipoServico: selectedTipoServico,
        subfrota: subfrota.trim()
      });

      const response = await fetch(`/dashboard/workshop?${queryParams.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error('Erro ao carregar estatísticas do painel.');
      }
    } catch (error) {
      console.error("Failed to load workshop dashboard stats", error);
      toast.error('Erro de conexão ao carregar estatísticas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [
    selectedOficinaId, 
    selectedClientId, 
    placa, 
    selectedStatus, 
    startDate, 
    endDate, 
    selectedTipoServico, 
    subfrota
  ]);

  const handleClearFilters = () => {
    setSelectedOficinaId('all');
    setSelectedClientId('all');
    setPlaca('');
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setSelectedTipoServico('all');
    setSubfrota('');
    toast.success('Filtros limpos com sucesso.');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDuration = (hours: number) => {
    if (!hours || hours <= 0) return '—';
    if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    }
    const days = Math.floor(hours / 24);
    const remHours = Math.round(hours % 24);
    return `${days}d ${remHours}h`;
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground font-medium animate-pulse">Carregando dados da oficina...</p>
      </div>
    );
  }

  // Safety fallbacks
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

  // Find max values for chart scalings
  const maxMonthlyPaid = Math.max(...s.monthlyBilling.map((m: any) => m.valorPago || 0), 1);
  const maxMonthlyQty = Math.max(...s.monthlyBilling.map((m: any) => m.qtdServicos || 0), 1);
  const maxClientPaid = Math.max(...s.topClients.map((c: any) => c.totalPaid || 0), 1);

  return (
    <div className="space-y-6 pb-10">
      
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

      {/* Filters Section */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <SlidersHorizontal size={18} className="text-primary" />
            <span>Filtros do Painel</span>
          </div>
          <button 
            onClick={handleClearFilters}
            className="text-xs font-semibold text-muted-foreground hover:text-primary transition"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Oficina Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Oficina</label>
            <select
              value={selectedOficinaId}
              onChange={(e) => setSelectedOficinaId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Todas as Oficinas</option>
              {workshops.map(w => (
                <option key={w.id} value={w.id}>{w.nome}</option>
              ))}
            </select>
          </div>

          {/* Cliente Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Placa Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Placa do Veículo</label>
            <input
              type="text"
              placeholder="Ex: ABC1234..."
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status OS</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Todos os Status</option>
              <option value="Aguardando Aprovação">Aguardando Aprovação</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Aguardando Pagamento">Aguardando Pagamento</option>
              <option value="Emitir Nota Fiscal">Emitir Nota Fiscal</option>
              <option value="Cobertura">Cobertura</option>
              <option value="Pago">Pago</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Período Início */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {/* Período Fim */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          {/* Tipo de Serviço */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de Item</label>
            <select
              value={selectedTipoServico}
              onChange={(e) => setSelectedTipoServico(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Todos</option>
              <option value="Peça">Apenas Peças</option>
              <option value="Mão de Obra">Apenas Mão de Obra</option>
            </select>
          </div>

          {/* Subfrota */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Subfrota</label>
            <input
              type="text"
              placeholder="Ex: Logística, Diretoria..."
              value={subfrota}
              onChange={(e) => setSubfrota(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Quotes */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Orçamentos</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{s.totalQuotes}</span>
            <div className="p-2 bg-primary/10 rounded-xl text-primary"><FileText size={18} /></div>
          </div>
        </div>

        {/* Total Approved */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Aprovados (R$)</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-emerald-600 truncate">{formatCurrency(s.totalApproved)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Estimado / Vendas</span>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Total Confirmado</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-blue-600 truncate">{formatCurrency(s.totalPago)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Faturamento Confirmado</span>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Ticket Médio</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-foreground truncate">{formatCurrency(s.ticketMedio)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Por OS Aprovada</span>
          </div>
        </div>

        {/* Vehicles Serviced */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Veículos Atendidos</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{s.veiculosAtendidos}</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><Users size={18} /></div>
          </div>
        </div>

        {/* Avg Attend Time */}
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">SLA Atendimento</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-foreground truncate">{formatDuration(s.tempoMedioAtendimento)}</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><Clock size={18} /></div>
          </div>
        </div>
      </div>

      {/* Strategic Highlights Panel */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Activity size={18} className="text-primary" />
          <span>Indicadores Estratégicos</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Top Client */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl"><DollarSign size={20} /></div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Cliente Maior Receita</span>
              <strong className="text-foreground block truncate">{s.strategicIndicators.clienteMaisReceita?.name || 'Sem dados'}</strong>
              <span className="text-xs text-emerald-600 font-bold">{s.strategicIndicators.clienteMaisReceita ? formatCurrency(s.strategicIndicators.clienteMaisReceita.value) : '—'}</span>
            </div>
          </div>

          {/* Top Service */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl"><Wrench size={20} /></div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Serviço Mais Vendido</span>
              <strong className="text-foreground block truncate">{s.strategicIndicators.servicoMaisVendido?.name || 'Sem dados'}</strong>
              <span className="text-xs text-blue-600 font-semibold">{s.strategicIndicators.servicoMaisVendido ? `${s.strategicIndicators.servicoMaisVendido.value} unidades` : '—'}</span>
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl"><Percent size={20} /></div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Taxa de Conversão</span>
              <strong className="text-foreground block text-lg font-extrabold">{s.taxaConversao.toFixed(1)}%</strong>
              <span className="text-[10px] text-muted-foreground block">Orçamento → Aprovação</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-border gap-2">
        <button
          onClick={() => setActiveTab('financeiro')}
          className={`px-6 py-3 font-semibold text-sm transition relative border-b-2 flex items-center gap-2 ${
            activeTab === 'financeiro'
              ? 'text-primary border-primary font-bold'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <DollarSign size={16} />
          Financeiro
        </button>
        <button
          onClick={() => setActiveTab('clientes')}
          className={`px-6 py-3 font-semibold text-sm transition relative border-b-2 flex items-center gap-2 ${
            activeTab === 'clientes'
              ? 'text-primary border-primary font-bold'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <Users size={16} />
          Clientes
        </button>
        <button
          onClick={() => setActiveTab('operacional')}
          className={`px-6 py-3 font-semibold text-sm transition relative border-b-2 flex items-center gap-2 ${
            activeTab === 'operacional'
              ? 'text-primary border-primary font-bold'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <Wrench size={16} />
          Operacional
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
        
        {/* Aba 1: Financeiro */}
        {activeTab === 'financeiro' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Monthly Billing Chart */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-bold text-foreground">Faturamento Mensal da Oficina</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Janeiro a Dezembro de {currentYear}</p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium">
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span>Valor Pago (R$)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-700"></span>
                    <span>Serviços Executados</span>
                  </div>
                </div>
              </div>

              {/* Chart Body */}
              <div className="h-72 flex items-end justify-between gap-2 pt-10 px-2 overflow-x-auto scrollbar-none">
                {s.monthlyBilling.map((m: any) => {
                  const paidPct = (m.valorPago / maxMonthlyPaid) * 80; // max 80% height
                  const qtyPct = (m.qtdServicos / maxMonthlyQty) * 80;
                  
                  return (
                    <div key={m.month} className="flex-1 flex flex-col items-center group relative h-full justify-end min-w-[32px]">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-2 rounded-xl shadow-lg text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 flex flex-col gap-0.5">
                        <span className="text-muted-foreground">{m.month} / {currentYear}</span>
                        <span className="text-blue-600">Pago: {formatCurrency(m.valorPago)}</span>
                        <span className="text-foreground">Serviços: {m.qtdServicos}</span>
                        {m.percentualComparativo !== 0 && (
                          <span className={`text-[10px] ${m.percentualComparativo > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {m.percentualComparativo > 0 ? '▲' : '▼'} {Math.abs(m.percentualComparativo).toFixed(1)}% vs. mês ant.
                          </span>
                        )}
                      </div>

                      {/* Bar columns */}
                      <div className="w-full flex justify-center items-end h-full gap-1">
                        {/* Revenue Bar */}
                        <div 
                          style={{ height: `${Math.max(paidPct, 4)}%` }}
                          className={`w-3.5 rounded-t-md transition-all duration-300 ${
                            m.valorPago > 0 ? 'bg-gradient-to-t from-blue-700 to-blue-500 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        />
                        {/* Service Qty Bar */}
                        <div 
                          style={{ height: `${Math.max(qtyPct, 4)}%` }}
                          className={`w-2.5 rounded-t-sm transition-all duration-300 ${
                            m.qtdServicos > 0 ? 'bg-slate-300 dark:bg-slate-700 shadow-xs' : 'bg-slate-100 dark:bg-slate-800'
                          }`}
                        />
                      </div>

                      {/* X Label */}
                      <span className="text-[10px] text-muted-foreground font-semibold mt-2.5">
                        {m.month}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Accumulators Side-Panel */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-foreground border-b border-border pb-3 mb-4">Resumo Acumulado</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-muted-foreground font-medium block">Faturamento Anual do Ano ({currentYear})</span>
                    <strong className="text-3xl font-extrabold text-foreground block mt-0.5">{formatCurrency(s.faturamentoAcumuladoAno)}</strong>
                    <span className="text-[10px] text-muted-foreground">Somatório de todos os orçamentos pagos</span>
                  </div>

                  <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block">O.S. Faturadas</span>
                      <strong className="text-lg font-bold text-foreground block">{s.monthlyBilling.reduce((acc: number, m: any) => acc + m.qtdServicos, 0)}</strong>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block">Ticket Médio Anual</span>
                      <strong className="text-lg font-bold text-foreground block">{formatCurrency(s.ticketMedio)}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mt-6">
                <span className="text-xs font-semibold text-primary uppercase tracking-wider block">Nota Fiscal Automática</span>
                <p className="text-xs text-muted-foreground mt-1">
                  Orçamentos aprovados alimentam as Contas a Receber e podem gerar descrições de NFs prontas para o financeiro.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Aba 2: Clientes */}
        {activeTab === 'clientes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Top 10 Clients Chart */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:col-span-3 space-y-4">
              <h3 className="font-bold text-foreground border-b border-border pb-3">Top 10 Clientes em Receita</h3>
              
              <div className="space-y-4">
                {s.topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado financeiro de cliente disponível.</p>
                ) : (
                  s.topClients.map((c: any, index: number) => {
                    const pct = (c.totalPaid / maxClientPaid) * 100;
                    return (
                      <div key={c.clientId} className="flex items-center gap-4">
                        <div className="w-6 font-bold text-xs text-muted-foreground text-center">{index + 1}</div>
                        <div className="w-1/4 min-w-[120px] font-semibold text-sm text-foreground truncate" title={c.name}>
                          {c.name}
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden relative">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-500 shadow-sm"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                          <span className="absolute left-3 top-1 text-[10px] font-extrabold text-blue-900 dark:text-blue-200">
                            {c.countOS} ordens de serviço
                          </span>
                        </div>
                        <div className="w-28 text-right font-extrabold text-sm text-foreground">
                          {formatCurrency(c.totalPaid)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Clients Grid */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden lg:col-span-3">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-foreground">Histórico e Frequência de Atendimentos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Cliente</th>
                      <th className="p-4 text-center">Veículos Atendidos</th>
                      <th className="p-4 text-center">Orçamentos Totais</th>
                      <th className="p-4 text-center">Aprovados</th>
                      <th className="p-4 text-right">Faturamento Confirmado</th>
                      <th className="p-4 text-right pr-6">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.clientsGrid.map((c: any) => (
                      <tr key={c.clientId} className="border-b border-border hover:bg-muted/10 transition">
                        <td className="p-4 pl-6 font-bold text-foreground">{c.name}</td>
                        <td className="p-4 text-center font-medium">{c.veiculosAtendidos}</td>
                        <td className="p-4 text-center text-muted-foreground">{c.orcamentos}</td>
                        <td className="p-4 text-center font-medium text-emerald-600">{c.aprovados}</td>
                        <td className="p-4 text-right font-extrabold text-blue-600">{formatCurrency(c.valorPago)}</td>
                        <td className="p-4 text-right pr-6 font-bold text-foreground">{formatCurrency(c.ticketMedio)}</td>
                      </tr>
                    ))}
                    {s.clientsGrid.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum cliente cadastrado no período.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Aba 3: Operacional */}
        {activeTab === 'operacional' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* SLA Info & Mechanics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* SLA Cards Panel */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-5">
                <h3 className="font-bold text-foreground border-b border-border pb-3">Prazos de Atendimento (SLA)</h3>
                
                <div className="space-y-4">
                  {/* Approval SLA */}
                  <div className="flex justify-between items-center p-3 bg-muted/40 rounded-xl">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold block">Tempo p/ Aprovação</span>
                      <span className="text-[10px] text-muted-foreground">Orçamento → Aprovado</span>
                    </div>
                    <strong className="text-lg font-black text-primary">{formatDuration(s.tempoMedioAprovacao)}</strong>
                  </div>

                  {/* Execution SLA */}
                  <div className="flex justify-between items-center p-3 bg-muted/40 rounded-xl">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold block">Tempo de Execução</span>
                      <span className="text-[10px] text-muted-foreground">Aprovado → Concluído</span>
                    </div>
                    <strong className="text-lg font-black text-emerald-600">{formatDuration(s.tempoMedioExecucao)}</strong>
                  </div>

                  {/* Open OS count */}
                  <div className="flex justify-between items-center p-3 bg-muted/40 rounded-xl">
                    <div>
                      <span className="text-xs text-muted-foreground font-semibold block">Serviços em Aberto</span>
                      <span className="text-[10px] text-muted-foreground">Executando / Aguardando</span>
                    </div>
                    <strong className="text-lg font-black text-amber-500">
                      {s.servicesGrid.filter((q: any) => ['Aprovado', 'Aguardando Pagamento'].includes(q.status)).length} OS
                    </strong>
                  </div>
                </div>
              </div>

              {/* Mechanics Productivity Grid */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 md:col-span-2 space-y-4">
                <h3 className="font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <UserCheck size={18} className="text-primary" />
                  <span>Produtividade dos Mecânicos</span>
                </h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-xs font-bold uppercase pb-2">
                        <th className="py-2 pl-2">Mecânico</th>
                        <th className="py-2 text-center">Atendimentos Aprovados</th>
                        <th className="py-2 text-right pr-2">Tempo Médio de Execução</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.strategicIndicators.topMechanics.map((m: any) => (
                        <tr key={m.id} className="border-b border-border/50 hover:bg-muted/10 transition">
                          <td className="py-3 pl-2 font-bold text-foreground">{m.name}</td>
                          <td className="py-3 text-center font-medium">{m.atendimentos} O.S.</td>
                          <td className="py-3 text-right pr-2 font-extrabold text-primary">{formatDuration(m.tempoMedioExecucaoHoras)}</td>
                        </tr>
                      ))}
                      {s.strategicIndicators.topMechanics.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-muted-foreground text-sm">Nenhum mecânico associado a orçamentos aprovados.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Services Grid (Ordens de Serviço) */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-foreground">Listagem Geral de Serviços e O.S.</h3>
                {selectedOficinaId !== 'all' && (
                  <span className="self-start sm:self-center text-xs bg-primary/10 text-primary font-bold px-3 py-1 rounded-full border border-primary/20">
                    Oficina: {workshops.find(w => w.id === selectedOficinaId)?.nome || 'Filtrada'}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6 w-[90px]">OS</th>
                      <th className="p-4 w-[18%]">Cliente</th>
                      {selectedOficinaId === 'all' && <th className="p-4 w-[15%]">Oficina</th>}
                      <th className="p-4 w-[18%]">Veículo</th>
                      <th className="p-4">Serviços Executados</th>
                      <th className="p-4 text-right w-[120px]">Valor</th>
                      <th className="p-4 text-center w-[150px]">Status</th>
                      <th className="p-4 text-center w-[120px]">Data</th>
                      <th className="p-4 text-center w-[70px] pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.servicesGrid.map((srv: any) => (
                      <tr key={srv.id} className="border-b border-border hover:bg-muted/10 transition">
                        <td className="p-4 pl-6 font-bold text-primary">#{String(srv.os).padStart(5, '0')}</td>
                        <td className="p-4 font-semibold text-foreground truncate" title={srv.cliente}>{srv.cliente}</td>
                        {selectedOficinaId === 'all' && (
                          <td className="p-4 text-muted-foreground font-semibold truncate" title={srv.oficina}>
                            {srv.oficina}
                          </td>
                        )}
                        <td className="p-4 text-muted-foreground truncate" title={srv.veiculo}>{srv.veiculo}</td>
                        <td className="p-4 text-foreground font-medium truncate max-w-[200px]" title={srv.servico}>{srv.servico}</td>
                        <td className="p-4 text-right font-extrabold text-emerald-600">{formatCurrency(srv.valor)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold border truncate text-center ${
                            (srv.status === 'Orçamento' || srv.status === 'Em Andamento' || srv.status === 'Aguardando Aprovação') ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                            srv.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            srv.status === 'Aguardando Pagamento' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            srv.status === 'Emitir Nota Fiscal' ? 'bg-teal-500/10 text-teal-600 border-teal-500/20' :
                            srv.status === 'Cobertura' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
                            srv.status === 'Pago' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
                            srv.status === 'Cancelado' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                            'bg-slate-500/10 text-slate-600 border-slate-500/20'
                          }`}>
                            {srv.status}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-muted-foreground">{new Date(srv.data).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 text-center pr-6">
                          <button
                            onClick={() => navigate(`/quotes/view/${srv.id}`)}
                            className="p-1.5 bg-muted rounded-lg text-foreground hover:bg-muted-foreground/20 hover:text-primary transition"
                            title="Ver detalhes"
                          >
                            <Eye size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {s.servicesGrid.length === 0 && (
                      <tr>
                        <td colSpan={selectedOficinaId === 'all' ? 9 : 8} className="p-8 text-center text-muted-foreground">
                          Nenhum serviço correspondente registrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
