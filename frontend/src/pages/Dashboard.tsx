import { FileText, TrendingUp, Users, Edit, Copy, Trash2, Building } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const navigate = useNavigate();

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3333/dashboard', {
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

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza de que deseja excluir este orçamento?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3333/quotes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success('Orçamento excluído com sucesso!');
        fetchStats();
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

  // Filter recent quotes by company if selected
  const filteredQuotes = stats?.recentQuotes?.filter((quote: any) => {
    if (selectedCompanyId === 'all') return true;
    return quote.company?.id === selectedCompanyId;
  }) || [];

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

      {/* Desempenho por Empresa ("Quebra por Empresa") */}
      {stats?.companyBreakdown && stats.companyBreakdown.length > 0 && (
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Building className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">Desempenho por Empresa</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.companyBreakdown.map((c: any) => (
              <div key={c.companyId} className="bg-muted/20 border border-border p-4 rounded-xl space-y-2 hover:border-primary/50 transition">
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
      )}

      {/* Tabela de Orçamentos */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-lg font-semibold">Últimos Orçamentos</h2>
          
          {/* Filtro por Empresa */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por Empresa:</span>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="p-4 font-medium">Nº</th>
                <th className="p-4 font-medium">Empresa Emitente</th>
                <th className="p-4 font-medium">Cliente</th>
                <th className="p-4 font-medium">Data</th>
                <th className="p-4 font-medium">Valor Total</th>
                <th className="p-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map((quote: any) => (
                <tr key={quote.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  <td className="p-4">#{String(quote.numeroOrcamento).padStart(5, '0')}</td>
                  <td className="p-4 font-medium text-muted-foreground truncate max-w-[200px]" title={quote.company?.razaoSocial}>
                    {quote.company?.razaoSocial || 'N/A'}
                  </td>
                  <td className="p-4 font-medium">{quote.client?.nome}</td>
                  <td className="p-4 text-muted-foreground">{new Date(quote.createdAt).toLocaleDateString('pt-BR')}</td>
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
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    Nenhum orçamento encontrado para os critérios selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
