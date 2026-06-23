import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Truck,
  DollarSign,
  MapPin,
  TrendingUp,
  AlertTriangle,
  SlidersHorizontal,
  FileText,
  Activity,
  Percent,
} from 'lucide-react';
import { TableActionMenu } from '../../components/ui/TableActionMenu';
import { TablePagination } from '../../components/ui/TablePagination';

export function TowingDashboard() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();

  // Tab state
  const [activeTab, setActiveTab] = useState<'financeiro' | 'frota'>('financeiro');

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [quotesPage, setQuotesPage] = useState(1);
  const [quotesPageSize, setQuotesPageSize] = useState(10);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [statsRes, quotesRes] = await Promise.all([
        fetch('/towing/dashboard', { headers }),
        fetch('/towing/quotes', { headers }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      } else {
        toast.error('Erro ao carregar estatísticas do painel de guincho.');
      }

      if (quotesRes.ok) {
        const data = await quotesRes.json();
        setQuotes(data || []);
      }
    } catch (err) {
      console.error('Failed to load towing dashboard', err);
      toast.error('Erro de conexão ao carregar o painel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page on filter changes
  useEffect(() => {
    setQuotesPage(1);
  }, [selectedStatus, startDate, endDate, searchTerm]);

  const handleClearFilters = () => {
    setSelectedStatus('all');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setQuotesPage(1);
    toast.success('Filtros limpos com sucesso.');
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const formatKm = (km: number) => {
    if (!km) return '0 km';
    return `${km.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`;
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
        <p className="text-sm text-muted-foreground font-medium animate-pulse">
          Carregando dados do guincho...
        </p>
      </div>
    );
  }

  // Fallback
  const s = stats || {
    totalQuotes: 0,
    totalRevenue: 0,
    ticketMedio: 0,
    totalKm: 0,
    closedQuotes: 0,
    closedRevenue: 0,
    anttStats: { avgAnttFloor: 0, avgAnttDiff: 0, belowAntt: 0, aboveAntt: 0 },
  };

  // ─── Filter quotes for table ────────────────────────────────────────────────
  const filteredQuotes = quotes.filter((q) => {
    if (selectedStatus !== 'all' && q.status !== selectedStatus) return false;
    if (startDate && new Date(q.createdAt) < new Date(startDate)) return false;
    if (endDate && new Date(q.createdAt) > new Date(endDate + 'T23:59:59')) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        q.numeroFormatado?.toLowerCase().includes(term) ||
        q.clienteNome?.toLowerCase().includes(term) ||
        q.clienteEmpresa?.toLowerCase().includes(term) ||
        q.veiculoPlaca?.toLowerCase().includes(term)
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

  // ─── Monthly billing from quotes ────────────────────────────────────────────
  const monthlyMap: Record<number, { valorTotal: number; qtd: number }> = {};
  for (let i = 1; i <= 12; i++) monthlyMap[i] = { valorTotal: 0, qtd: 0 };
  quotes.forEach((q) => {
    const d = new Date(q.createdAt);
    if (d.getFullYear() === currentYear) {
      const m = d.getMonth() + 1;
      monthlyMap[m].valorTotal += q.valorTotal || 0;
      monthlyMap[m].qtd += 1;
    }
  });
  const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const monthlyBilling = Object.entries(monthlyMap).map(([month, data]) => ({
    month: monthLabels[parseInt(month) - 1],
    valorTotal: data.valorTotal,
    qtd: data.qtd,
  }));
  const maxMonthlyVal = Math.max(...monthlyBilling.map((m) => m.valorTotal), 1);
  const maxMonthlyQty = Math.max(...monthlyBilling.map((m) => m.qtd), 1);

  // ─── Top clients from quotes ─────────────────────────────────────────────────
  const clientMap: Record<string, { name: string; totalPaid: number; count: number }> = {};
  quotes.forEach((q) => {
    const name = q.clienteEmpresa || q.clienteNome || 'Sem nome';
    if (!clientMap[name]) clientMap[name] = { name, totalPaid: 0, count: 0 };
    clientMap[name].totalPaid += q.valorTotal || 0;
    clientMap[name].count += 1;
  });
  const topClients = Object.values(clientMap)
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10);
  const maxClientPaid = Math.max(...topClients.map((c) => c.totalPaid), 1);

  // ─── Conversion rate ─────────────────────────────────────────────────────────
  const totalAll = quotes.length;
  const totalApproved = quotes.filter(
    (q) => q.status === 'Aprovado' || q.status === 'Concluído',
  ).length;
  const taxaConversao = totalAll > 0 ? (totalApproved / totalAll) * 100 : 0;

  // ─── Status badge helper ──────────────────────────────────────────────────────
  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      Orçamento: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      Aprovado: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      Concluído: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
      Cancelado: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
      Cobertura: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
      'Aguardando Aprovação': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };
    return map[status] || 'bg-slate-500/10 text-slate-600 border-slate-500/20';
  };

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Painel de Guincho
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão estratégica de orçamentos, rotas e faturamento do serviço de guincho.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/towing/quotes/new')}
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
            className="text-xs font-semibold text-muted-foreground hover:text-primary transition"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Busca</label>
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
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
            >
              <option value="all">Todos os Status</option>
              <option value="Orçamento">Orçamento</option>
              <option value="Aguardando Aprovação">Aguardando Aprovação</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Concluído">Concluído</option>
              <option value="Cobertura">Cobertura</option>
              <option value="Cancelado">Cancelado</option>
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

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Faturamento Total</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-emerald-600 truncate">{formatCurrency(s.totalRevenue)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Todos os orçamentos</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Confirmado</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-blue-600 truncate">{formatCurrency(s.closedRevenue)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">{s.closedQuotes} Aprovados / Concluídos</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Ticket Médio</div>
          <div className="mt-3 flex flex-col">
            <span className="text-xl font-extrabold text-foreground truncate">{formatCurrency(s.ticketMedio)}</span>
            <span className="text-[10px] text-muted-foreground mt-1">Por orçamento</span>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">KM Rodados</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-foreground truncate">{formatKm(s.totalKm)}</span>
            <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><MapPin size={18} /></div>
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between">
          <div className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Conversão</div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-xl font-extrabold text-foreground">{taxaConversao.toFixed(1)}%</span>
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
              <strong className="text-foreground block truncate">{topClients[0]?.name || 'Sem dados'}</strong>
              <span className="text-xs text-emerald-600 font-bold">{topClients[0] ? formatCurrency(topClients[0].totalPaid) : '—'}</span>
            </div>
          </div>

          {/* Conversion */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 text-purple-600 rounded-xl"><Percent size={20} /></div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Taxa de Conversão</span>
              <strong className="text-foreground block text-lg font-extrabold">{taxaConversao.toFixed(1)}%</strong>
              <span className="text-[10px] text-muted-foreground block">Orçamento → Aprovação</span>
            </div>
          </div>

          {/* ANTT compliance */}
          <div className="p-4 bg-muted/40 rounded-xl flex items-center gap-3">
            <div className={`p-3 rounded-xl ${s.anttStats.belowAntt > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
              <AlertTriangle size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-xs text-muted-foreground block font-medium">Conformidade ANTT</span>
              <strong className="text-foreground block truncate">
                {s.anttStats.aboveAntt} acima · {s.anttStats.belowAntt} abaixo
              </strong>
              <span className="text-xs text-muted-foreground font-medium">
                Média piso: {formatCurrency(s.anttStats.avgAnttFloor)}
              </span>
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
          onClick={() => setActiveTab('frota')}
          className={`px-6 py-3 font-semibold text-sm transition relative border-b-2 flex items-center gap-2 ${
            activeTab === 'frota'
              ? 'text-primary border-primary font-bold'
              : 'text-muted-foreground border-transparent hover:text-foreground'
          }`}
        >
          <Truck size={16} />
          Clientes
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
                    <h3 className="font-bold text-foreground">Faturamento Mensal do Guincho</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Janeiro a Dezembro de {currentYear}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-medium">
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                      <span>Valor Total (R$)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded bg-slate-300 dark:bg-slate-700" />
                      <span>Qtd. Orçamentos</span>
                    </div>
                  </div>
                </div>

                <div className="h-80 flex items-end justify-between gap-2 pt-16 px-2 overflow-x-auto scrollbar-none">
                  {monthlyBilling.map((m) => {
                    const valPct = (m.valorTotal / maxMonthlyVal) * 80;
                    const qtyPct = (m.qtd / maxMonthlyQty) * 80;
                    return (
                      <div key={m.month} className="flex-1 flex flex-col items-center group relative h-full justify-end min-w-[32px]">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-2 rounded-xl shadow-lg text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 flex flex-col gap-0.5">
                          <span className="text-muted-foreground">{m.month} / {currentYear}</span>
                          <span className="text-blue-600">Total: {formatCurrency(m.valorTotal)}</span>
                          <span className="text-foreground">Orçamentos: {m.qtd}</span>
                        </div>

                        {/* Bars */}
                        <div className="w-full flex justify-center items-end flex-1 gap-1">
                          <div
                            style={{ height: m.valorTotal > 0 ? `${Math.max(valPct, 6)}%` : '0%' }}
                            className={`w-3.5 rounded-t-md transition-all duration-300 ${m.valorTotal > 0 ? 'bg-gradient-to-t from-blue-700 to-blue-500 shadow-sm' : 'bg-slate-100 dark:bg-slate-800'}`}
                          />
                          <div
                            style={{ height: m.qtd > 0 ? `${Math.max(qtyPct, 6)}%` : '0%' }}
                            className={`w-2.5 rounded-t-sm transition-all duration-300 ${m.qtd > 0 ? 'bg-slate-300 dark:bg-slate-700' : 'bg-slate-100 dark:bg-slate-800'}`}
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
                  <h3 className="font-bold text-foreground border-b border-border pb-3 mb-4">Resumo Acumulado</h3>
                  <div className="space-y-4">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block">Faturamento Anual ({currentYear})</span>
                      <strong className="text-3xl font-extrabold text-foreground block mt-0.5">
                        {formatCurrency(monthlyBilling.reduce((a, m) => a + m.valorTotal, 0))}
                      </strong>
                      <span className="text-[10px] text-muted-foreground">Todos os orçamentos emitidos</span>
                    </div>

                    <div className="border-t border-border pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block">Orçamentos</span>
                        <strong className="text-lg font-bold text-foreground block">
                          {monthlyBilling.reduce((a, m) => a + m.qtd, 0)}
                        </strong>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground font-medium block">KM Total</span>
                        <strong className="text-lg font-bold text-foreground block">{formatKm(s.totalKm)}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ANTT Info Box */}
                {(() => {
                  const belowAnttQuotes = quotes.filter(
                    (q) => q.anttPisoMinimo && q.anttPisoMinimo > 0 && q.valorTotal < q.anttPisoMinimo
                  );
                  return belowAnttQuotes.length > 0 ? (
                    <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 mt-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={15} className="text-rose-500 shrink-0" />
                        <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
                          ANTT — {belowAnttQuotes.length} orçamento(s) abaixo do piso mínimo
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {belowAnttQuotes.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => navigate(`/towing/quotes/edit/${q.id}`)}
                            className="w-full flex items-center justify-between bg-background border border-rose-500/15 hover:border-rose-500/40 rounded-lg px-3 py-2 text-xs transition group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-primary shrink-0">
                                {q.numeroFormatado || `#${q.id.substring(0, 8)}`}
                              </span>
                              <span className="text-muted-foreground truncate">
                                {q.clienteEmpresa || q.clienteNome || '—'}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-2 text-right">
                              <span className="text-foreground font-semibold">{formatCurrency(q.valorTotal)}</span>
                              <span className="text-muted-foreground">vs piso</span>
                              <span className="font-bold text-rose-600">{formatCurrency(q.anttPisoMinimo)}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mt-6">
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider block">ANTT — Piso Mínimo</span>
                      <p className="text-xs text-muted-foreground mt-1">
                        ✅ Todos os orçamentos com ANTT estão acima do piso mínimo.
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Quotes Grid */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="font-bold text-foreground">Listagem Geral de Orçamentos de Guincho</h3>
                <span className="text-xs text-muted-foreground">{totalQuoteCount} registro(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6 w-[140px]">Nº</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Placa</th>
                      <th className="p-4 text-right w-[150px]">Valor</th>
                      <th className="p-4 text-center w-[160px]">Status</th>
                      <th className="p-4 text-center w-[120px]">Data</th>
                      <th className="p-4 text-right w-[90px] pr-6">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedQuotes.map((q: any) => (
                      <tr key={q.id} className="border-b border-border hover:bg-muted/10 transition">
                        <td className="p-4 pl-6 font-bold text-primary text-sm">{q.numeroFormatado || `#${q.id.substring(0, 8)}`}</td>
                        <td className="p-4 font-semibold text-foreground truncate max-w-[200px]" title={q.clienteEmpresa || q.clienteNome}>
                          {q.clienteEmpresa || q.clienteNome || '—'}
                        </td>
                        <td className="p-4 text-muted-foreground font-medium">{q.veiculoPlaca || '—'}</td>
                        <td className="p-4 text-right font-extrabold text-emerald-600">{formatCurrency(q.valorTotal)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold border ${statusBadge(q.status)}`}>
                            {q.status || 'Orçamento'}
                          </span>
                        </td>
                        <td className="p-4 text-center text-xs text-muted-foreground">
                          {new Date(q.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <TableActionMenu
                            onView={() => navigate(`/towing/quotes/edit/${q.id}`)}
                          />
                        </td>
                      </tr>
                    ))}
                    {filteredQuotes.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
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

        {/* ── Aba Clientes ── */}
        {activeTab === 'frota' && (
          <div className="space-y-6 animate-in fade-in duration-200">

            {/* Top Clients Chart */}
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-foreground border-b border-border pb-3">Top 10 Clientes em Receita</h3>
              <div className="space-y-4">
                {topClients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado de cliente disponível.</p>
                ) : (
                  topClients.map((c, index) => {
                    const pct = (c.totalPaid / maxClientPaid) * 100;
                    return (
                      <div key={c.name} className="flex items-center gap-4">
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
                            {c.count} orçamento(s)
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

            {/* Clients Detail Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border">
                <h3 className="font-bold text-foreground">Histórico e Frequência por Cliente</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Cliente</th>
                      <th className="p-4 text-center">Orçamentos</th>
                      <th className="p-4 text-right">Receita Total</th>
                      <th className="p-4 text-right pr-6">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((c) => (
                      <tr key={c.name} className="border-b border-border hover:bg-muted/10 transition">
                        <td className="p-4 pl-6 font-bold text-foreground">{c.name}</td>
                        <td className="p-4 text-center font-medium">{c.count}</td>
                        <td className="p-4 text-right font-extrabold text-emerald-600">{formatCurrency(c.totalPaid)}</td>
                        <td className="p-4 text-right pr-6 font-bold text-foreground">
                          {formatCurrency(c.count > 0 ? c.totalPaid / c.count : 0)}
                        </td>
                      </tr>
                    ))}
                    {topClients.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          Nenhum cliente cadastrado no período.
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
