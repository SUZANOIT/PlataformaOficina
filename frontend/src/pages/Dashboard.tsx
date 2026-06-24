import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Truck,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  FileText,
  Activity,
  Wrench,
  Users,
  RefreshCw,
  Clock,
  Star
} from 'lucide-react';
import { TableActionMenu } from '../components/ui/TableActionMenu';
import { TablePagination } from '../components/ui/TablePagination';
import { QUOTE_STATUS_OPTIONS } from '../utils/constants';

export function Dashboard() {
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState<'financeiro' | 'operacional'>('financeiro');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('all');
  const [mecanicoId, setMecanicoId] = useState('all');
  const [status, setStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState(''); // Text search for local filtering of the grid

  // Filter Data
  const [clients, setClients] = useState<any[]>([]);

  // Pagination
  const [quotesPage, setQuotesPage] = useState(1);
  const [quotesPageSize, setQuotesPageSize] = useState(10);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, clientId, mecanicoId, status]);

  // Reset page on filter changes (both API filters and local search term)
  useEffect(() => {
    setQuotesPage(1);
  }, [startDate, endDate, clientId, mecanicoId, status, searchTerm]);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [clientsRes] = await Promise.all([
        fetch('/registry/clients', { headers })
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.data || clientsData || []);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (clientId && clientId !== 'all') params.append('clientId', clientId);
      if (mecanicoId && mecanicoId !== 'all') params.append('mecanicoId', mecanicoId);
      if (status && status !== 'all') params.append('status', status);

      const response = await fetch(`/dashboard/workshop?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error('Erro ao carregar os dados do painel.');
      }
    } catch (error) {
      console.error("Failed to load workshop dashboard stats", error);
      toast.error('Erro de conexão ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setClientId('all');
    setMecanicoId('all');
    setStatus('all');
    setSearchTerm('');
    setQuotesPage(1);
    toast.success('Filtros limpos com sucesso.');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Carregando dados da oficina...
        </p>
      </div>
    );
  }

  // Fallback
  const s = stats || {
    totalQuotes: 0,
    totalPago: 0,
    totalApproved: 0,
    ticketMedio: 0,
    veiculosAtendidos: 0,
    tempoMedioAtendimento: 0,
    taxaConversao: 0,
    monthlyBilling: [],
    servicesGrid: [],
    faturamentoMesAtual: 0,
    faturamentoMesAnterior: 0,
    strategicIndicators: {
      clienteMaisReceita: null,
      servicoMaisVendido: null,
      mecanicoMaisAtendimentos: null,
      topMechanics: [],
      topClients: [],
    }
  };

  // ─── Filter servicesGrid for table ────────────────────────────────────────────────
  const rawQuotes = s.servicesGrid || [];
  const filteredQuotes = rawQuotes.filter((q: any) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        q.os?.toLowerCase().includes(term) ||
        q.cliente?.toLowerCase().includes(term) ||
        q.veiculo?.toLowerCase().includes(term) ||
        q.servico?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalQuoteCount = filteredQuotes.length;
  const totalQuotePages = Math.ceil(totalQuoteCount / quotesPageSize);
  const paginatedQuotes = filteredQuotes.slice(
    (quotesPage - 1) * quotesPageSize,
    quotesPage * quotesPageSize,
  );

  // ─── Variables for Charts and KPIs ────────────────────────────────────────────
  const monthlyBilling = s.monthlyBilling || [];
  const maxMonthlyVal = Math.max(...monthlyBilling.map((m: any) => m.valorPago), 1);
  const maxMonthlyQty = Math.max(...monthlyBilling.map((m: any) => m.qtdServicos), 1);

  const topClients = s.strategicIndicators?.topClients || [];
  const maxClientPaid = Math.max(...topClients.map((c: any) => c.totalPaid), 1);

  const topMechanics = s.strategicIndicators?.topMechanics || [];
  const maxMechanicPaid = Math.max(...topMechanics.map((m: any) => m.valorFaturado), 1);

  const totalFaturamento = s.faturamentoMesAtual || 0;
  const prevFaturamento = s.faturamentoMesAnterior || 0;
  const faturamentoCrescimento = prevFaturamento > 0 ? ((totalFaturamento - prevFaturamento) / prevFaturamento) * 100 : (totalFaturamento > 0 ? 100 : 0);

  // ─── Status badge helper ──────────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      'Orçamento': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'Em Andamento': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'Aprovado': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      'Concluído': 'bg-sky-500/10 text-sky-600 border-sky-500/20',
      'Pago': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      'Emitir Nota Fiscal': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'Cancelado': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      'Recusado': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      'Cobertura': 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      'Aguardando Pagamento': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      'Aguardando Aprovação': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };
    return map[status] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
            <Wrench className="text-primary hidden sm:block" size={28} />
            Painel Geral da Oficina
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão estratégica de orçamentos, produtividade e faturamento da oficina.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/quotes/new')}
            className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold shadow-md shadow-primary/20 hover:bg-primary/95 transition active:scale-[0.98] duration-150 text-sm"
          >
            Novo Orçamento
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2 font-semibold text-foreground">
            <SlidersHorizontal size={18} className="text-primary" />
            <span>Filtros do Painel</span>
          </div>
          <button
            onClick={handleClearFilters}
            className="text-xs font-semibold text-muted-foreground hover:text-primary transition flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Busca (Local)</label>
            <input
              type="text"
              placeholder="Nº, cliente, placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Todos os Status</option>
              {QUOTE_STATUS_OPTIONS.map(sOption => (
                <option key={sOption} value={sOption}>{sOption}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Todos</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nome || c.razaoSocial}</option>
              ))}
              {clients.length === 0 && s.strategicIndicators?.topClients?.map((c: any) => (
                <option key={c.clientId} value={c.clientId}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data Início</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data Fim</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            />
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Orçamentos</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">{s.totalQuotes}</span>
            <div className="p-2 bg-primary/10 rounded-xl text-primary"><FileText size={18} /></div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between relative overflow-hidden">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Faturamento (Pagos)</div>
          <div className="mt-3 flex flex-col relative z-10">
            <span className="text-xl font-extrabold text-emerald-600 truncate">{formatCurrency(s.totalPago)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Apenas status Pago</span>
          </div>
          {/* Subtle indicator background if there is growth */}
          {faturamentoCrescimento > 0 && (
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          )}
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Confirmado (Total)</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-blue-600 truncate">{formatCurrency(s.totalApproved)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Aprovados / Execução</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Ticket Médio</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-foreground truncate">{formatCurrency(s.ticketMedio)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Por orçamento aprovado</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Veículos Atend.</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-foreground truncate">{s.veiculosAtendidos}</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><Truck size={18} /></div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Conversão</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-foreground">{(s.taxaConversao || 0).toFixed(1)}%</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-500"><TrendingUp size={18} /></div>
          </div>
        </div>
      </div>

      {/* ── Strategic Indicators ── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2 border-b border-border pb-3">
          <Activity size={18} className="text-primary" />
          <span>Indicadores Estratégicos</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Top client */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl"><DollarSign size={20} /></div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Cliente Maior Receita</span>
              <strong className="text-foreground block truncate">{s.strategicIndicators?.clienteMaisReceita?.name || 'Sem dados'}</strong>
              <span className="text-xs text-emerald-600 font-bold">{s.strategicIndicators?.clienteMaisReceita ? formatCurrency(s.strategicIndicators.clienteMaisReceita.value) : '—'}</span>
            </div>
          </div>

          {/* Melhor Mecânico */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl"><Users size={20} /></div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Mecânico Mais Produtivo</span>
              <strong className="text-foreground block truncate">{s.strategicIndicators?.mecanicoMaisAtendimentos?.name || 'Sem dados'}</strong>
              <span className="text-[10px] text-muted-foreground block">{s.strategicIndicators?.mecanicoMaisAtendimentos?.value || 0} Atendimentos</span>
            </div>
          </div>

          {/* Tempo Médio */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl"><Clock size={20} /></div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Tempo Médio (Aprovação)</span>
              <strong className="text-foreground block truncate">{(s.tempoMedioAprovacao || 0).toFixed(1)} horas</strong>
              <span className="text-[10px] text-muted-foreground block">Da criação à aprovação</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
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

      {/* ── Tab Panels ── */}
      <div className="space-y-6">

        {/* ── Aba Financeiro ── */}
        {activeTab === 'financeiro' && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Monthly Chart + Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Monthly Chart */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="font-bold text-foreground">Faturamento Mensal da Oficina (Pagos)</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Visão móvel de 12 meses</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span>Faturamento (R$)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-700" />
                      <span>Qtd. Serviços</span>
                    </div>
                  </div>
                </div>

                <div className="h-80 flex items-end justify-between gap-2 pt-16 px-2 overflow-x-auto scrollbar-none relative">
                  {/* Grade horizontal */}
                  <div className="absolute inset-0 flex flex-col justify-between pt-16 pb-6 pointer-events-none opacity-20">
                    <div className="w-full h-px bg-border"></div>
                    <div className="w-full h-px bg-border"></div>
                    <div className="w-full h-px bg-border"></div>
                    <div className="w-full h-px bg-border"></div>
                  </div>

                  {monthlyBilling.map((m: any, idx: number) => {
                    const valPct = (m.valorPago / maxMonthlyVal) * 80;
                    const qtyPct = (m.qtdServicos / maxMonthlyQty) * 80;
                    return (
                      <div key={`${m.month}-${idx}`} className="flex-1 flex flex-col items-center group relative h-full justify-end min-w-[32px] z-10">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-2 rounded-xl shadow-lg text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 flex flex-col gap-0.5">
                          <span className="text-muted-foreground">{m.month} / {m.year}</span>
                          <span className="text-emerald-600">Total: {formatCurrency(m.valorPago)}</span>
                          <span className="text-foreground">Serviços: {m.qtdServicos}</span>
                        </div>

                        {/* Bars */}
                        <div className="w-full flex justify-center items-end flex-1 gap-1">
                          <div
                            style={{ height: m.valorPago > 0 ? `${Math.max(valPct, 6)}%` : '0%' }}
                            className={`w-3.5 rounded-t-md transition-all duration-300 ${m.valorPago > 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}
                          />
                          <div
                            style={{ height: m.qtdServicos > 0 ? `${Math.max(qtyPct, 6)}%` : '0%' }}
                            className={`w-2.5 rounded-t-sm transition-all duration-300 ${m.qtdServicos > 0 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-semibold mt-2.5">{m.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary Side Panel */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-foreground border-b border-border pb-3 mb-4">Resumo do Período</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block">Faturamento (Pagos)</span>
                      <strong className="text-3xl font-extrabold text-foreground block mt-0.5">
                        {formatCurrency(s.faturamentoAcumuladoAno || 0)}
                      </strong>
                      <span className="text-[10px] text-muted-foreground">Últimos 12 meses acumulado</span>
                    </div>

                    <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block">Orçamentos Pagos</span>
                        <strong className="text-lg font-bold text-foreground block">
                          {monthlyBilling.reduce((a: number, m: any) => a + m.qtdServicos, 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block">Veículos</span>
                        <strong className="text-lg font-bold text-foreground block">{s.veiculosAtendidos}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlight/Alert Info Box */}
                <div className={`mt-6 rounded-xl p-4 border ${faturamentoCrescimento >= 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                  <span className={`text-xs font-semibold uppercase tracking-wider block ${faturamentoCrescimento >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Variação Mês a Mês
                  </span>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-2xl font-extrabold text-foreground">{Math.abs(faturamentoCrescimento).toFixed(1)}%</span>
                    <span className="text-xs text-muted-foreground pb-1">
                      {faturamentoCrescimento >= 0 ? 'de aumento' : 'de queda'}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Comparativo entre o faturamento do último mês ({formatCurrency(totalFaturamento)}) vs mês anterior ({formatCurrency(prevFaturamento)}).
                  </p>
                </div>
              </div>
            </div>

            {/* Quotes Grid */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-foreground">Listagem de Orçamentos da Oficina</h3>
                <span className="text-xs text-muted-foreground">{totalQuoteCount} registro(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6 w-[120px]">Nº / OS</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Veículo</th>
                      <th className="p-4">Serviço/Peças</th>
                      <th className="p-4 text-right w-[120px]">Valor</th>
                      <th className="p-4 text-center w-[160px]">Status</th>
                      <th className="p-4 text-center w-[120px]">Data</th>
                      <th className="p-4 text-right w-[90px] pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuotes.map((q: any) => (
                      <tr key={q.id} className="border-b border-border hover:bg-muted/10 transition">
                        <td className="p-4 pl-6 font-bold text-primary text-sm">{q.os || `#${q.id?.substring(0, 8)}`}</td>
                        <td className="p-4 font-semibold text-foreground truncate max-w-[150px]" title={q.cliente}>
                          {q.cliente || '—'}
                        </td>
                        <td className="p-4 text-muted-foreground font-medium truncate max-w-[120px]" title={q.veiculo}>{q.veiculo || '—'}</td>
                        <td className="p-4 text-muted-foreground text-xs truncate max-w-[180px]" title={q.servico}>{q.servico || '—'}</td>
                        <td className="p-4 text-right font-extrabold text-emerald-600">{formatCurrency(q.valor)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusBadge(q.status)}`}>
                            {q.status || 'Orçamento'}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-muted-foreground">
                          {new Date(q.data).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <TableActionMenu
                            onView={() => navigate(`/quotes/${q.id}`)}
                            onEdit={() => navigate(`/quotes/edit/${q.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredQuotes.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          Nenhum orçamento encontrado com os filtros aplicados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <TablePagination
                currentPage={quotesPage}
                totalPages={totalQuotePages}
                onPageChange={setQuotesPage}
                pageSize={quotesPageSize}
                onPageSizeChange={setQuotesPageSize}
                totalCount={totalQuoteCount}
              />
            </div>
          </div>
        )}

        {/* ── Aba Operacional / Clientes ── */}
        {activeTab === 'operacional' && (
          <div className="space-y-6 animate-in fade-in duration-200">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Clients Chart */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <DollarSign size={18} className="text-blue-500" />
                  Top 10 Clientes (Receita)
                </h3>
                <div className="space-y-4">
                  {topClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de cliente disponível.</p>
                  ) : (
                    topClients.map((c: any, index: number) => {
                      const pct = (c.totalPaid / maxClientPaid) * 100;
                      return (
                        <div key={c.clientId || index} className="flex items-center gap-4">
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
                              {c.countOS} OS
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

              {/* Ranking Mecânicos */}
              <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
                <h3 className="font-bold text-foreground border-b border-border pb-3 flex items-center gap-2">
                  <Wrench size={18} className="text-indigo-500" />
                  Ranking de Mecânicos
                </h3>
                <div className="space-y-4">
                  {topMechanics.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de mecânico disponível.</p>
                  ) : (
                    topMechanics.map((m: any, index: number) => {
                      const pct = (m.valorFaturado / maxMechanicPaid) * 100;
                      return (
                        <div key={m.id || index} className="flex items-center gap-4">
                          <div className="w-6 font-bold text-xs text-muted-foreground text-center">{index + 1}</div>
                          <div className="w-1/4 min-w-[120px] font-semibold text-sm text-foreground truncate" title={m.name}>
                            {m.name}
                          </div>
                          <div className="flex-1 bg-muted rounded-full h-7 overflow-hidden relative">
                            <div
                              className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full transition-all duration-500 shadow-sm"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                            <span className="absolute left-3 top-1 text-[10px] font-extrabold text-indigo-900 dark:text-indigo-200">
                              {m.atendimentos} Atend.
                            </span>
                          </div>
                          <div className="w-28 text-right font-extrabold text-sm text-foreground">
                            {formatCurrency(m.valorFaturado)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Top Serviços Detail Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <Star size={18} className="text-amber-500" />
                  Serviços Mais Vendidos
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Descrição do Serviço</th>
                      <th className="p-4 text-center">Quantidade Executada</th>
                      <th className="p-4 text-right pr-6">Receita Gerada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(s.strategicIndicators?.topServices || []).map((serv: any, idx: number) => (
                      <tr key={`${serv.descricao}-${idx}`} className="border-b border-border hover:bg-muted/10 transition">
                        <td className="p-4 pl-6 font-bold text-foreground">{serv.descricao}</td>
                        <td className="p-4 text-center font-medium">{serv.quantidade}</td>
                        <td className="p-4 text-right font-extrabold text-emerald-600 pr-6">{formatCurrency(serv.valorTotal)}</td>
                      </tr>
                    ))}
                    {(s.strategicIndicators?.topServices || []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-muted-foreground">
                          Nenhum serviço registrado no período.
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
