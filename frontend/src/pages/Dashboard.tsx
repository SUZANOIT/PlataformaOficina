import { FileText, TrendingUp, Users, Edit, Copy, Trash2, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
    
    if (statusFilter !== 'all' && quote.status !== statusFilter) {
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
    'Orçamento': 0,
    'Em Andamento': 0,
    'Aguardando Aprovação': 0,
    'Aprovado': 0,
    'Emitir Nota Fiscal': 0,
    'Cobertura': 0,
    'Cancelado': 0
  };

  const quotesForChart = selectedCompanyId === 'all' 
    ? quotes 
    : quotes.filter((q: any) => q.company?.id === selectedCompanyId);

  quotesForChart.forEach((q: any) => {
    const status = q.status || 'Orçamento';
    if (statusTotals.hasOwnProperty(status)) {
      statusTotals[status] += Number(q.total) || 0;
    }
  });

  const maxVal = Math.max(...Object.values(statusTotals), 1);

  const statusConfig: Record<string, { colorClass: string; textClass: string }> = {
    'Orçamento': { colorClass: 'bg-blue-500', textClass: 'text-blue-600' },
    'Em Andamento': { colorClass: 'bg-amber-500', textClass: 'text-amber-600' },
    'Aguardando Aprovação': { colorClass: 'bg-purple-500', textClass: 'text-purple-600' },
    'Aprovado': { colorClass: 'bg-emerald-500', textClass: 'text-emerald-600' },
    'Emitir Nota Fiscal': { colorClass: 'bg-teal-500', textClass: 'text-teal-600' },
    'Cobertura': { colorClass: 'bg-indigo-500', textClass: 'text-indigo-600' },
    'Cancelado': { colorClass: 'bg-rose-500', textClass: 'text-rose-600' },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <Link 
          to="/quotes/new" 
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition"
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
        
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm flex items-center gap-4">
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
            <h3 className="text-2xl font-bold">{stats?.quotesCount || 0}</h3>
          </div>
        </div>
      </div>

      {/* Gráfico de Status e Desempenho por Empresa */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Orçamentos por Status */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3 justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-primary" size={20} />
              <h2 className="text-lg font-semibold">Volume Financeiro por Status</h2>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Valores Totais em R$</span>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 pt-6 px-2">
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

        {/* Desempenho por Empresa ("Quebra por Empresa") */}
        {stats?.companyBreakdown && stats.companyBreakdown.length > 0 && (
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="w-full">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Building className="text-primary" size={20} />
                <h2 className="text-lg font-semibold">Desempenho por Empresa</h2>
              </div>
              <div className="space-y-3 pt-4">
                {stats.companyBreakdown.map((c: any) => (
                  <div key={c.companyId} className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2 hover:border-primary/50 transition">
                    <h4 className="font-bold text-foreground text-sm truncate" title={c.companyName}>
                      {c.companyName}
                    </h4>
                    <div className="flex justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                      <span>Orçamentos: <strong className="text-foreground">{c.quotesCount}</strong></span>
                      <span>Total: <strong className="text-emerald-600 font-bold">{formatCurrency(c.totalSold)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
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
                <option value="Orçamento">Orçamento</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Aguardando Aprovação">Aguardando Aprovação</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Emitir Nota Fiscal">Emitir Nota Fiscal</option>
                <option value="Cobertura">Cobertura</option>
                <option value="Cancelado">Cancelado</option>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium">Nº</th>
                <th className="p-4 font-medium">Empresa Emitente</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Valor Total</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuotes.map((quote: any) => (
                <tr key={quote.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">#{String(quote.numeroOrcamento).padStart(5, '0')}</td>
                  <td className="p-4 font-medium text-muted-foreground truncate max-w-[200px]" title={quote.company?.razaoSocial}>
                    {quote.company?.razaoSocial || 'N/A'}
                  </td>
                  <td className="p-4 font-medium">{quote.client?.nome}</td>
                  <td className="p-4 text-muted-foreground">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      quote.status === 'Orçamento' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
                      quote.status === 'Em Andamento' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                      quote.status === 'Aguardando Aprovação' ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' :
                      quote.status === 'Aprovado' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                      quote.status === 'Emitir Nota Fiscal' ? 'bg-teal-500/10 text-teal-600 border border-teal-500/20' :
                      quote.status === 'Cobertura' ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20' :
                      quote.status === 'Cancelado' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                      'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                    }`}>
                      {quote.status || 'Orçamento'}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-emerald-600">{formatCurrency(quote.total)}</td>
                  <td className="p-4 flex gap-2">
                    <button 
                      onClick={() => navigate(`/quotes/edit/${quote.id}`)}
                      className="p-2 bg-blue-500/10 text-blue-600 rounded hover:bg-blue-500/20 transition"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => navigate(`/quotes/new?clone=${quote.id}`)}
                      className="p-2 bg-amber-500/10 text-amber-600 rounded hover:bg-amber-500/20 transition"
                      title="Clonar"
                    >
                      <Copy size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(quote.id)}
                      className="p-2 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                      title="Excluir"
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
            <span className="text-sm text-muted-foreground">
              Mostrando <strong className="text-foreground">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</strong> a{' '}
              <strong className="text-foreground">{Math.min(totalItems, currentPage * itemsPerPage)}</strong> de{' '}
              <strong className="text-foreground">{totalItems}</strong> orçamentos
            </span>
            
            <div className="flex items-center gap-1">
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
    </div>
  );
}
