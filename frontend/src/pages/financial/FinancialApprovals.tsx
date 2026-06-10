import { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Search, 
  Check, 
  X, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface PendingItem {
  id: string;
  type: 'PAGAR' | 'RECEBER';
  companyName: string;
  party: string; // fornecedor ou cliente
  categoria: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
  responsavel: string;
  payableRef?: any;
  receivableRef?: any;
}

export function FinancialApprovals() {
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');

  const fetchPendingWorkflow = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch payables and receivables in parallel
      const [payablesRes, receivablesRes] = await Promise.all([
        fetch('/financial/payables?limit=100&status=PENDENTE,EM ANÁLISE', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/financial/receivables?limit=100&status=PENDENTE,EM ANÁLISE', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      let consolidated: PendingItem[] = [];

      if (payablesRes.ok) {
        const payData = await payablesRes.json();
        const formattedPayables = payData.payables.map((p: any) => ({
          id: p.id,
          type: 'PAGAR' as const,
          companyName: p.company?.nomeFantasia || p.company?.razaoSocial || 'Empresa',
          party: p.fornecedor,
          categoria: p.categoria,
          descricao: p.descricao,
          valor: p.valor,
          vencimento: p.vencimento,
          status: p.status,
          responsavel: p.responsavel,
          payableRef: p
        }));
        consolidated = [...consolidated, ...formattedPayables];
      }

      if (receivablesRes.ok) {
        const recData = await receivablesRes.json();
        const formattedReceivables = recData.receivables.map((r: any) => ({
          id: r.id,
          type: 'RECEBER' as const,
          companyName: r.company?.nomeFantasia || r.company?.razaoSocial || 'Empresa',
          party: r.cliente,
          categoria: r.categoria,
          descricao: r.descricao,
          valor: r.valor,
          vencimento: r.vencimento,
          status: r.status,
          responsavel: r.responsavel,
          receivableRef: r
        }));
        consolidated = [...consolidated, ...formattedReceivables];
      }

      // Sort by due date ascending
      consolidated.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());

      setPendingItems(consolidated);
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao carregar fila de aprovações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingWorkflow();
  }, []);

  // Quick Action workflow approval
  const handleWorkflowAction = async (item: PendingItem, action: 'APPROVE' | 'REJECT') => {
    const token = localStorage.getItem('token');
    const comment = window.prompt(`Digite uma observação para esta ação (${action === 'APPROVE' ? 'Aprovar' : 'Reprovar'}):`);
    if (comment === null) return;

    let userEmail = 'Aprovador';
    try {
      const meRes = await fetch('/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
      if (meRes.ok) {
        const me = await meRes.json();
        userEmail = me.email;
      }
    } catch (err) {
      console.error(err);
    }

    try {
      const res = await fetch(`/financial/approve/${item.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          type: item.type,
          action,
          comments: comment
        })
      });

      if (res.ok) {
        toast.success(action === 'APPROVE' ? 'Lançamento autorizado com sucesso!' : 'Lançamento rejeitado.');
        fetchPendingWorkflow();
      } else {
        toast.error('Erro ao salvar decisão de aprovação.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão com o servidor.');
    }
  };

  // Filters application
  const filteredItems = pendingItems.filter(item => {
    const matchesSearch = item.party.toLowerCase().includes(search.toLowerCase()) || 
                          item.descricao.toLowerCase().includes(search.toLowerCase()) ||
                          item.categoria.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter ? item.type === typeFilter : true;
    const matchesCompany = companyFilter ? item.companyName === companyFilter : true;

    return matchesSearch && matchesType && matchesCompany;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          🛡️ Central de Aprovações Financeiras
        </h1>
        <p className="text-muted-foreground text-sm">Gerenciamento centralizado de fluxo de caixa pendente de autorização da diretoria.</p>
      </div>

      {/* Stats Quick Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Pendente</span>
            <span className="text-xl font-black text-foreground mt-1 block">{pendingItems.length} lançamentos</span>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <CheckSquare size={18} />
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Contas a Pagar</span>
            <span className="text-xl font-black text-red-500 mt-1 block">
              {formatCurrency(pendingItems.filter(p => p.type === 'PAGAR').reduce((s, i) => s + i.valor, 0))}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
            <TrendingDown size={18} />
          </div>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Contas a Receber</span>
            <span className="text-xl font-black text-emerald-500 mt-1 block">
              {formatCurrency(pendingItems.filter(p => p.type === 'RECEBER').reduce((s, i) => s + i.valor, 0))}
            </span>
          </div>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <TrendingUp size={18} />
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text"
            placeholder="Buscar fornecedor, cliente, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <select 
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Todos os Tipos</option>
          <option value="PAGAR">Contas a Pagar</option>
          <option value="RECEBER">Contas a Receber</option>
        </select>

        <select 
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Todas as Empresas</option>
          {Array.from(new Set(pendingItems.map(i => i.companyName))).map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>

        <button 
          onClick={fetchPendingWorkflow}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-sm rounded-lg text-foreground font-semibold hover:bg-muted transition-colors"
        >
          <RefreshCw size={14} /> Atualizar Fila
        </button>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
            <RefreshCw size={24} className="animate-spin mb-3 text-primary" />
            <span>Processando autorizações...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
            <span>🎉 Excelente! Fila de aprovação vazia no momento.</span>
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full border-collapse text-left text-sm table-fixed break-words">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-4 hidden md:table-cell w-1/12">Tipo</th>
                  <th className="p-4 hidden lg:table-cell w-2/12">Empresa</th>
                  <th className="p-4 w-4/12 md:w-3/12 lg:w-2/12">Beneficiário / Pagador</th>
                  <th className="p-4 w-4/12 md:w-3/12 lg:w-2/12">Descrição / Categoria</th>
                  <th className="p-4 hidden sm:table-cell w-2/12 lg:w-1/12 text-right">Valor</th>
                  <th className="p-4 hidden md:table-cell w-2/12">Vencimento</th>
                  <th className="p-4 w-4/12 sm:w-6/12 md:w-4/12 lg:w-2/12 text-center">Autorização Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredItems.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 hidden md:table-cell truncate">
                      {item.type === 'PAGAR' ? (
                        <div className="flex items-center gap-1.5 text-xs font-black text-red-500 uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded-full w-fit truncate">
                          <TrendingDown size={12} className="shrink-0" /> <span className="truncate">Pagar</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full w-fit truncate">
                          <TrendingUp size={12} className="shrink-0" /> <span className="truncate">Receber</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-semibold text-foreground truncate hidden lg:table-cell">{item.companyName}</td>
                    <td className="p-4 font-medium text-foreground truncate">
                      <div className="flex flex-col truncate">
                        <span className="truncate">{item.party}</span>
                        {/* Tipo mobile fallback */}
                        <span className={`text-[10px] font-bold uppercase tracking-wider md:hidden ${item.type === 'PAGAR' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {item.type === 'PAGAR' ? 'A Pagar' : 'A Receber'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground truncate">
                      <div className="flex flex-col truncate">
                        <span className="truncate">{item.descricao}</span>
                        <span className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold mt-0.5 truncate">{item.categoria}</span>
                      </div>
                    </td>
                    <td className={`p-4 text-right font-black hidden sm:table-cell truncate ${item.type === 'PAGAR' ? 'text-red-500' : 'text-emerald-500'}`}>
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="p-4 hidden md:table-cell truncate">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
                        <Calendar size={13} className="text-muted-foreground shrink-0" />
                        <span className="truncate">{formatDate(item.vencimento)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col xl:flex-row items-center justify-center gap-2">
                        <button 
                          onClick={() => handleWorkflowAction(item, 'APPROVE')}
                          className="flex items-center justify-center gap-1 px-2 py-1 xl:px-2.5 xl:py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors shadow-xs w-full xl:w-auto truncate"
                          title="Aprovar lançamento"
                        >
                          <Check size={13} className="shrink-0" /> <span className="truncate">Aprovar</span>
                        </button>
                        <button 
                          onClick={() => handleWorkflowAction(item, 'REJECT')}
                          className="flex items-center justify-center gap-1 px-2 py-1 xl:px-2.5 xl:py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-colors shadow-xs w-full xl:w-auto truncate"
                          title="Reprovar lançamento"
                        >
                          <X size={13} className="shrink-0" /> <span className="truncate">Reprovar</span>
                        </button>
                      </div>
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
}
