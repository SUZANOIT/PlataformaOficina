import { FileText, TrendingUp, Users, Edit, Copy, Trash2, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { QUOTE_STATUS_OPTIONS } from '../utils/constants';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to load dashboard stats", error);
    }
  };

  const fetchQuotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/quotes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setQuotes(data);
      }
    } catch (error) {
      console.error("Failed to load quotes list", error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchQuotes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, selectedCompanyId]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este orçamento?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/quotes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
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
      toast.error('Erro de conexão ao excluir.');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Filter recent quotes
  const filteredQuotes = quotes.filter((quote: any) => {
    if (selectedCompanyId !== 'all' && quote.company?.id !== selectedCompanyId) {
      return false;
    }
    
    const normalizedStatus = (quote.status === 'Orçamento' || quote.status === 'Em Andamento') 
      ? 'Aguardando Aprovação' 
      : (quote.status || 'Aguardando Aprovação');

    if (statusFilter !== 'all' && normalizedStatus !== statusFilter) {
      return false;
    }
    
    if (searchTerm) {
      const cleanSearch = searchTerm.trim().toLowerCase().replace('#', '');
      const numStr = String(quote.numeroOrcamento);
      const clientName = quote.client?.nome?.toLowerCase() || '';
      if (!numStr.includes(cleanSearch) && !clientName.includes(cleanSearch)) {
        return false;
      }
    }
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const quoteDate = new Date(quote.createdAt);
      if (quoteDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      const quoteDate = new Date(quote.createdAt);
      if (quoteDate > end) return false;
    }
    
    return true;
  });

  const totalItems = filteredQuotes.length;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Status Chart calculations
  const statusTotals: Record<string, number> = {
    'Aguardando Aprovação': 0,
    'Aprovado': 0,
    'Aguardando Pagamento': 0,
    'Emitir Nota Fiscal': 0,
    'Cobertura': 0,
    'Pago': 0,
    'Cancelado': 0
  };

  const quotesForChart = (selectedCompanyId === 'all' 
    ? quotes 
    : quotes.filter((q: any) => q.company?.id === selectedCompanyId)
  ).filter((q: any) => {
    const company = q.company;
    if (!company) return false;
    const cnpjClean = company.cnpj ? company.cnpj.replace(/\D/g, '') : '';
    const ieClean = company.inscricaoEstadual ? company.inscricaoEstadual.replace(/\D/g, '') : '';
    const matchesCnpj = cnpjClean === '30021766000113' || cnpjClean === '98765432000110';
    const matchesIe = ieClean === '119214099114' || ieClean === '987654321000';
    const matchesName = company.razaoSocial?.toLowerCase().includes('mca') || 
                        company.nomeFantasia?.toLowerCase().includes('mca');
    return matchesCnpj || matchesIe || matchesName;
  });

  quotesForChart.forEach((q: any) => {
    let status = q.status || 'Aguardando Aprovação';
    if (status === 'Orçamento' || status === 'Em Andamento') {
      status = 'Aguardando Aprovação';
    }
    if (statusTotals.hasOwnProperty(status)) {
      statusTotals[status] += Number(q.total) || 0;
    }
  });

  const maxVal = Math.max(...Object.values(statusTotals), 1);

  const statusConfig: Record<string, { colorClass: string; textClass: string }> = {
    'Aguardando Aprovação': { colorClass: 'bg-purple-500', textClass: 'text-purple-600' },
    'Aprovado': { colorClass: 'bg-emerald-500', textClass: 'text-emerald-600' },
    'Aguardando Pagamento': { colorClass: 'bg-amber-500', textClass: 'text-amber-600' },
    'Emitir Nota Fiscal': { colorClass: 'bg-teal-500', textClass: 'text-teal-600' },
    'Cobertura': { colorClass: 'bg-indigo-500', textClass: 'text-indigo-600' },
    'Pago': { colorClass: 'bg-sky-500', textClass: 'text-sky-600' },
    'Cancelado': { colorClass: 'bg-rose-500', textClass: 'text-rose-600' },
  };

  // Monthly calculations for approved quotes in current year
  const currentYear = new Date().getFullYear();
  const monthlyApprovedTotals = Array(12).fill(0);
  const monthlyPecasTotals = Array(12).fill(0);
  const monthlyMaoDeObraTotals = Array(12).fill(0);
  
  const approvedQuotesThisYear = quotes.filter((q: any) => {
    const isApproved = q.status === 'Aprovado' || q.status === 'Pago' || q.status === 'Aguardando Pagamento';
    const date = new Date(q.createdAt);
    const isCurrentYear = date.getFullYear() === currentYear;
    return isApproved && isCurrentYear;
  });

  approvedQuotesThisYear.forEach((q: any) => {
    const date = new Date(q.createdAt);
    const month = date.getMonth(); // 0-11
    monthlyApprovedTotals[month] += Number(q.total) || 0;
    
    (q.items || []).forEach((item: any) => {
      const tipo = item.tipo || 'Peça';
      const itemVal = (Number(item.quantidade) || 0) * (Number(item.valorUnitario) || 0);
      if (tipo === 'Peça') {
        monthlyPecasTotals[month] += itemVal;
      } else {
        monthlyMaoDeObraTotals[month] += itemVal;
      }
    });
  });

  const maxMonthVal = Math.max(...monthlyApprovedTotals, 1);
  const maxPartsLaborVal = Math.max(...monthlyPecasTotals, ...monthlyMaoDeObraTotals, 1);

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];




  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <Link 
          to="/quotes/new" 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition text-center"
        >
          Novo Orçamento
        </Link>
      </div>

      {/* Estatísticas Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Orçamentos Gerados</p>
            <h3 className="text-2xl font-bold">{stats?.quotesCount || 0}</h3>
          </div>
        </div>
        
        <div 
          className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Valor Total Vendido</p>
            <h3 className="text-2xl font-bold">{formatCurrency(stats?.totalSold || 0)}</h3>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Clientes Ativos</p>
            <h3 className="text-2xl font-bold">{stats?.activeClientsCount || 0}</h3>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="space-y-6">
          {/* Gráfico 1: Volume Financeiro por Status */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-border pb-3 justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-primary" size={20} />
                <h2 className="text-lg font-semibold">Volume Financeiro por Status</h2>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Valores Totais em R$</span>
            </div>

            <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              <div className="h-64 flex items-end justify-between gap-3 pt-16 px-2 min-w-[500px] sm:min-w-0">
                {Object.entries(statusTotals).map(([status, totalValue]) => {
                  const pct = (totalValue / maxVal) * 100;
                  const config = statusConfig[status] || { colorClass: 'bg-slate-500', textClass: 'text-slate-600' };
                  
                  return (
                    <div key={status} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-1.5 rounded-lg shadow-md text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 flex flex-col items-center">
                        <span>{status}</span>
                        <span className={`text-sm ${config.textClass}`}>{formatCurrency(totalValue)}</span>
                      </div>

                      {/* Bar */}
                      <div className="w-full flex justify-center items-end h-full">
                        <div 
                          style={{ height: `${Math.max(pct, 4)}%` }} 
                          className={`w-4/5 sm:w-1/2 rounded-t-lg transition-all duration-500 flex flex-col justify-end overflow-hidden ${config.colorClass} shadow-lg shadow-black/10 group-hover:scale-y-105 origin-bottom`}
                        >
                          {pct > 15 && (
                            <div className="w-full text-center text-[9px] font-black text-white pb-1 rotate-90 sm:rotate-0 truncate">
                              {Math.round(pct)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* X Label */}
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-2 font-medium" title={status}>
                        {status.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda compacta e bonita */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-4 border-t border-border/50 text-[11px] text-muted-foreground">
              {Object.entries(statusTotals).map(([status, totalValue]) => {
                const config = statusConfig[status] || { colorClass: 'bg-slate-500', textClass: 'text-slate-600' };
                return (
                  <div key={status} className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.colorClass}`}></span>
                    <span className="font-semibold text-foreground">{status}:</span>
                    <span>{formatCurrency(totalValue)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gráfico 2: Faturamento Mensal (Jan a Dez) */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-border pb-3 justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={20} />
                <h2 className="text-lg font-semibold">Faturamento Mensal de Aprovados ({currentYear})</h2>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Valores de Orçamentos Aprovados por Mês</span>
            </div>

            <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              <div className="h-64 flex items-end justify-between gap-2 pt-16 px-2 min-w-[650px] sm:min-w-0">
                {monthlyApprovedTotals.map((totalValue, index) => {
                  const monthName = monthNames[index];
                  const pct = (totalValue / maxMonthVal) * 100;
                  
                  return (
                    <div key={monthName} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-1.5 rounded-lg shadow-md text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 flex flex-col items-center">
                        <span>{monthName} de {currentYear}</span>
                        <span className="text-sm text-emerald-600 font-bold">{formatCurrency(totalValue)}</span>
                      </div>

                      {/* Bar */}
                      <div className="w-full flex justify-center items-end h-full">
                        <div 
                          style={{ height: `${Math.max(pct, 4)}%` }} 
                          className={`w-4/5 sm:w-1/2 rounded-t-lg transition-all duration-500 flex flex-col justify-end overflow-hidden ${
                            totalValue > 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-slate-200 dark:bg-slate-800/50'
                          } shadow-lg shadow-black/10 group-hover:scale-y-105 origin-bottom`}
                        >
                          {pct > 15 && (
                            <div className="w-full text-center text-[9px] font-black text-white pb-1 rotate-90 sm:rotate-0 truncate">
                              {Math.round(pct)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* X Label */}
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-2 font-semibold">
                        {monthName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráfico 3: Peças vs Mão de Obra (Jan a Dez) */}
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-border pb-3 justify-between">
              <div className="flex items-center gap-2">
                <FileText className="text-blue-500" size={20} />
                <h2 className="text-lg font-semibold">Faturamento por Tipo: Peças vs Mão de Obra ({currentYear})</h2>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Comparativo Mensal (Orçamentos Aprovados)</span>
            </div>

            <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              <div className="h-64 flex items-end justify-between gap-2 pt-16 px-2 min-w-[650px] sm:min-w-0">
                {monthNames.map((monthName, index) => {
                  const partsVal = monthlyPecasTotals[index];
                  const laborVal = monthlyMaoDeObraTotals[index];
                  const partsPct = (partsVal / maxPartsLaborVal) * 100;
                  const laborPct = (laborVal / maxPartsLaborVal) * 100;
                  
                  return (
                    <div key={monthName} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-1.5 rounded-lg shadow-md text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 flex flex-col items-start gap-1">
                        <span className="font-bold text-foreground border-b border-border w-full pb-0.5 mb-0.5">{monthName} de {currentYear}</span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Peças: <strong className="text-blue-600">{formatCurrency(partsVal)}</strong>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          Mão de Obra: <strong className="text-indigo-600">{formatCurrency(laborVal)}</strong>
                        </span>
                      </div>

                      {/* Dual Bars Container */}
                      <div className="w-full flex justify-center items-end h-full gap-1">
                        {/* Parts Bar (Blue) */}
                        <div className="flex-1 flex items-end h-full justify-center">
                          <div 
                            style={{ height: `${Math.max(partsPct, 4)}%` }} 
                            className={`w-full max-w-[12px] rounded-t-sm transition-all duration-500 ${
                              partsVal > 0 ? 'bg-gradient-to-t from-blue-600 to-blue-400' : 'bg-slate-200 dark:bg-slate-800/40'
                            } shadow-sm group-hover:scale-y-105 origin-bottom`}
                          />
                        </div>

                        {/* Labor Bar (Indigo) */}
                        <div className="flex-1 flex items-end h-full justify-center">
                          <div 
                            style={{ height: `${Math.max(laborPct, 4)}%` }} 
                            className={`w-full max-w-[12px] rounded-t-sm transition-all duration-500 ${
                              laborVal > 0 ? 'bg-gradient-to-t from-indigo-600 to-indigo-400' : 'bg-slate-200 dark:bg-slate-800/40'
                            } shadow-sm group-hover:scale-y-105 origin-bottom`}
                          />
                        </div>
                      </div>

                      {/* X Label */}
                      <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-2 font-semibold">
                        {monthName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4 border-t border-border/50 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-t from-blue-600 to-blue-400"></span>
                <span className="font-semibold text-foreground">Peças (Total: {formatCurrency(monthlyPecasTotals.reduce((a, b) => a + b, 0))})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-gradient-to-t from-indigo-600 to-indigo-400"></span>
                <span className="font-semibold text-foreground">Mão de Obra (Total: {formatCurrency(monthlyMaoDeObraTotals.reduce((a, b) => a + b, 0))})</span>
              </div>
            </div>
          </div>
      </div>

      {/* Tabela de Orçamentos */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-lg font-semibold">Últimos Orçamentos</h2>
            
            {/* Filtro por Empresa */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Empresa:</span>
              <select 
                value={selectedCompanyId} 
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition"
              >
                <option value="all">Todas as Empresas</option>
                {stats?.companyBreakdown?.map((c: any) => (
                  <option key={c.companyId} value={c.companyId}>{c.companyName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtros Avançados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Número ou Cliente</label>
              <input 
                type="text" 
                placeholder="Buscar nº ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition"
              >
                <option value="all">Todos os Status</option>
                {QUOTE_STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Data Início</label>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Data Fim</label>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary transition"
              />
            </div>
          </div>
        </div>

        <div className="w-full">
          <table className="w-full text-left border-collapse table-fixed break-words">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium w-1/12">Nº</th>
                <th className="p-4 font-medium hidden md:table-cell w-2/12">Empresa Emitente</th>
                <th className="p-4 font-medium w-3/12">Cliente</th>
                <th className="p-4 font-medium hidden lg:table-cell w-2/12">Data</th>
                <th className="p-4 font-medium hidden xl:table-cell w-1/12">Status</th>
                <th className="p-4 font-medium w-2/12">Valor Total</th>
                <th className="p-4 font-medium w-1/12">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuotes.map((quote: any) => (
                <tr key={quote.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                  <td className="p-4 font-semibold text-primary truncate">
                    #{String(quote.numeroOrcamento).padStart(5, '0')}
                  </td>
                  <td className="p-4 font-medium text-muted-foreground truncate hidden md:table-cell" title={quote.company?.razaoSocial}>
                    {quote.company?.razaoSocial || 'N/A'}
                  </td>
                  <td className="p-4 truncate">
                    <div className="font-semibold text-foreground truncate">{quote.client?.nome}</div>
                    {(quote.veiculoModelo || quote.veiculoPlaca) && (
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1.5 flex-wrap">
                        {quote.veiculoPlaca && (
                          <span className="bg-muted px-1.5 py-0.5 rounded font-mono text-[9px] uppercase border border-border">
                            {quote.veiculoPlaca}
                          </span>
                        )}
                        {quote.veiculoModelo && <span className="truncate">{quote.veiculoModelo}</span>}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-muted-foreground text-sm hidden lg:table-cell truncate">
                    {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4 text-sm hidden xl:table-cell">
                    <span className={`inline-block whitespace-nowrap px-2.5 py-1 rounded-full text-[10px] font-semibold border truncate text-center ${
                      (quote.status === 'Orçamento' || quote.status === 'Em Andamento' || quote.status === 'Aguardando Aprovação') ? 'bg-purple-500/10 text-purple-600 border-purple-500/20' :
                      quote.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                      quote.status === 'Aguardando Pagamento' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                      quote.status === 'Emitir Nota Fiscal' ? 'bg-teal-500/10 text-teal-600 border-teal-500/20' :
                      quote.status === 'Cobertura' ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' :
                      quote.status === 'Pago' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
                      quote.status === 'Cancelado' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                      'bg-slate-500/10 text-slate-600 border-slate-500/20'
                    }`}>
                      {(quote.status === 'Orçamento' || quote.status === 'Em Andamento') ? 'Aguardando Aprovação' : (quote.status || 'Aguardando Aprovação')}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-emerald-600 text-sm truncate">
                    {formatCurrency(quote.total)}
                  </td>
                  <td className="p-4 flex gap-1">
                    <button 
                      onClick={() => navigate(`/quotes/view/${quote.id}`)}
                      className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/25 transition active:scale-95 duration-150 flex items-center justify-center"
                      title="Visualizar"
                    >
                      <Eye size={16} />
                    </button>
                    <button 
                      onClick={() => navigate(`/quotes/edit/${quote.id}`)}
                      disabled={quote.status === 'Pago'}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/25 transition active:scale-95 duration-150 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10"
                      title={quote.status === 'Pago' ? "Orçamentos pagos não podem ser editados" : "Editar"}
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => navigate(`/quotes/new?clone=${quote.id}`)}
                      className="p-2 bg-amber-500/10 text-amber-600 rounded-lg hover:bg-amber-500/25 transition active:scale-95 duration-150 flex items-center justify-center"
                      title="Clonar"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(quote.id)}
                      disabled={quote.status === 'Pago'}
                      className="p-2 bg-rose-500/10 text-rose-600 rounded-lg hover:bg-rose-500/25 transition active:scale-95 duration-150 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-rose-500/10"
                      title={quote.status === 'Pago' ? "Orçamentos pagos não podem ser excluídos" : "Excluir"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedQuotes.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Nenhum orçamento encontrado para os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20">
            <span className="text-sm text-muted-foreground text-center sm:text-left">
              Mostrando <strong className="text-foreground">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</strong> a{' '}
              <strong className="text-foreground">{Math.min(totalItems, currentPage * itemsPerPage)}</strong> de{' '}
              <strong className="text-foreground">{totalItems}</strong> orçamentos
            </span>
            
            <div className="flex items-center gap-1 flex-wrap justify-center">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 disabled:hover:bg-background transition"
              >
                Anterior
              </button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
                    currentPage === page 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background hover:bg-muted border-border text-foreground'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg bg-background hover:bg-muted disabled:opacity-50 disabled:hover:bg-background transition"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detalhamento Valor Total Vendido has been removed */}
    </div>
  );
}
