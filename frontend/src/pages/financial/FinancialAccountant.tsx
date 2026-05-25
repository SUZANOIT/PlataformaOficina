import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  RefreshCw, 
  FileText, 
  Calculator, 
  Download, 
  Search, 
  File, 
  History, 
  User, 
  Clock, 
  Lock, 
  Eye,
  Settings,
  Plus,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { toast } from 'sonner';

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  createdAt: string;
}

interface FinancialRecord {
  id: string;
  valor: number;
  vencimento: string;
  status: string;
  categoria: string;
  descricao: string;
  fornecedor?: string;
  cliente?: string;
  centroCusto?: string;
  attachments?: Attachment[];
}

interface AuditLog {
  id: string;
  action: string;
  previousStatus: string | null;
  newStatus: string | null;
  user: string;
  changes: string | null;
  comments: string | null;
  createdAt: string;
  payableId?: string;
  receivableId?: string;
}

interface DashboardData {
  kpis: {
    totalContasPagar: number;
    totalContasReceber: number;
    despesasPagas: number;
    despesasPendentes: number;
    recebimentosRealizados: number;
    recebimentosPendentes: number;
    saldoLiquido: number;
    totalMovimentado: number;
    contasVencidas: number;
    totalLancamentos: number;
  };
  graficos: {
    despesasPorCategoria: Record<string, number>;
    receitasPorCategoria: Record<string, number>;
    contasPorStatus: Record<string, number>;
    contasPorCentroCusto: Record<string, number>;
    fluxoMensal: Record<string, { receitas: number; despesas: number; saldo: number }>;
  };
}

interface TaxSetting {
  id: string;
  nome: string;
  aliquota: number;
  tipo: 'FATURAMENTO' | 'RETENCAO' | 'OUTRO';
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
}

export function FinancialAccountant() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'documents' | 'audit' | 'taxes'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Data States
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [payables, setPayables] = useState<FinancialRecord[]>([]);
  const [receivables, setReceivables] = useState<FinancialRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [taxes, setTaxes] = useState<TaxSetting[]>([]);

  // Search & Filter States
  const [selectedCompetence, setSelectedCompetence] = useState<string>('todos');
  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('todos');
  const [docSearch, setDocSearch] = useState<string>('');
  const [auditSearch, setAuditSearch] = useState<string>('');

  // Tax Modal States
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<TaxSetting | null>(null);
  const [taxForm, setTaxForm] = useState({
    nome: '',
    aliquota: '',
    tipo: 'FATURAMENTO' as 'FATURAMENTO' | 'RETENCAO' | 'OUTRO',
    status: 'ATIVO' as 'ATIVO' | 'INATIVO'
  });

  // Fetch Data Function
  const fetchData = async (showToast = false) => {
    try {
      if (showToast) setRefreshing(true);
      else setLoading(true);
      
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Dashboard
      const dashRes = await fetch('/financial/dashboard', { headers });
      const dashData = dashRes.ok ? await dashRes.json() : null;

      // Fetch Payables
      const payRes = await fetch('/financial/payables?limit=200', { headers });
      const payData = payRes.ok ? await payRes.json() : { payables: [] };

      // Fetch Receivables
      const recRes = await fetch('/financial/receivables?limit=200', { headers });
      const recData = recRes.ok ? await recRes.json() : { receivables: [] };

      // Fetch Audits
      const auditRes = await fetch('/financial/audits', { headers });
      const auditData = auditRes.ok ? await auditRes.json() : [];

      // Fetch Taxes
      const taxRes = await fetch('/financial/taxes', { headers });
      const taxData = taxRes.ok ? await taxRes.json() : [];

      if (dashData) setDashboardData(dashData);
      setPayables(payData.payables || []);
      setReceivables(recData.receivables || []);
      setAuditLogs(auditData || []);
      setTaxes(taxData || []);

      if (showToast) toast.success('Dados contábeis atualizados com sucesso!');
    } catch (error) {
      console.error('Error fetching accountant data:', error);
      toast.error('Erro ao carregar os dados contábeis.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Utility to Format Currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Utility to Format Date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  // Dynamic Tax calculations based on the registered tax settings
  const calculateDynamicTaxes = () => {
    if (!dashboardData) return { totalFaturamento: 0, totalRetencao: 0, total: 0, list: [] };
    const grossRevenue = dashboardData.kpis.totalContasReceber;
    const realizedRevenue = dashboardData.kpis.recebimentosRealizados;
    
    // Filter only active taxes
    const activeTaxes = taxes.filter(t => t.status === 'ATIVO');
    
    const list = activeTaxes.map(t => {
      const base = t.tipo === 'RETENCAO' ? realizedRevenue : grossRevenue;
      const valor = base * (t.aliquota / 100);
      return {
        nome: t.nome,
        aliquota: t.aliquota,
        tipo: t.tipo,
        valor
      };
    });

    const totalFaturamento = list.filter(l => l.tipo === 'FATURAMENTO').reduce((sum, item) => sum + item.valor, 0);
    const totalRetencao = list.filter(l => l.tipo === 'RETENCAO').reduce((sum, item) => sum + item.valor, 0);

    return {
      totalFaturamento,
      totalRetencao,
      total: totalFaturamento + totalRetencao,
      list
    };
  };

  const dynamicTaxes = calculateDynamicTaxes();

  // Suggesting/Creating default taxes
  const createDefaultTaxes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const defaults = [
        { nome: 'Simples Nacional MCA', aliquota: 6.5, tipo: 'FATURAMENTO', status: 'ATIVO' },
        { nome: 'ISS Retido MCA', aliquota: 1.5, tipo: 'RETENCAO', status: 'ATIVO' }
      ];

      for (const t of defaults) {
        await fetch('/financial/taxes', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(t)
        });
      }

      toast.success('Impostos padrão configurados com sucesso!');
      await fetchData();
    } catch (error) {
      console.error('Error creating default taxes:', error);
      toast.error('Erro ao configurar impostos padrão.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Tax Form (Create or Edit)
  const handleTaxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taxForm.nome || !taxForm.aliquota) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      };

      const payload = {
        nome: taxForm.nome,
        aliquota: Number(taxForm.aliquota),
        tipo: taxForm.tipo,
        status: taxForm.status
      };

      let res;
      if (editingTax) {
        res = await fetch(`/financial/taxes/${editingTax.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload)
        });
      } else {
        res = await fetch('/financial/taxes', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      if (res.ok) {
        toast.success(editingTax ? 'Imposto atualizado com sucesso!' : 'Imposto cadastrado com sucesso!');
        setIsTaxModalOpen(false);
        setEditingTax(null);
        setTaxForm({ nome: '', aliquota: '', tipo: 'FATURAMENTO', status: 'ATIVO' });
        await fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erro ao processar requisição.');
      }
    } catch (error) {
      console.error('Error submitting tax form:', error);
      toast.error('Erro de conexão com o servidor.');
    }
  };

  // Delete Tax
  const handleDeleteTax = async (id: string) => {
    if (!confirm('Deseja realmente excluir este imposto?')) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/financial/taxes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Imposto deletado com sucesso!');
        await fetchData();
      } else {
        toast.error('Erro ao deletar imposto.');
      }
    } catch (error) {
      console.error('Error deleting tax:', error);
      toast.error('Erro de conexão.');
    }
  };

  // Open Edit Modal
  const openEditTax = (tax: TaxSetting) => {
    setEditingTax(tax);
    setTaxForm({
      nome: tax.nome,
      aliquota: String(tax.aliquota),
      tipo: tax.tipo,
      status: tax.status
    });
    setIsTaxModalOpen(true);
  };

  // Export functions
  const exportToCSV = (type: 'dre' | 'payables' | 'receivables') => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    if (type === 'dre') {
      csvContent += "Demonstração do Resultado do Exercício (DRE) - MCA\n\n";
      csvContent += "Categoria;Valor;Percentual\n";
      csvContent += `Receita Bruta;${formatCurrency(dashboardData?.kpis.totalContasReceber || 0)};100%\n`;
      
      dynamicTaxes.list.forEach(t => {
        csvContent += `(-) ${t.nome} (${t.aliquota}%);${formatCurrency(t.valor)};\n`;
      });

      csvContent += `Receita Líquida;${formatCurrency((dashboardData?.kpis.totalContasReceber || 0) - dynamicTaxes.totalFaturamento)};\n`;
      csvContent += `(-) Custos Operacionais;${formatCurrency(dashboardData?.kpis.totalContasPagar || 0)};\n`;
      csvContent += `Resultado Líquido;${formatCurrency((dashboardData?.kpis.recebimentosRealizados || 0) - (dashboardData?.kpis.despesasPagas || 0) - dynamicTaxes.totalRetencao)};\n`;
    } else if (type === 'payables') {
      csvContent += "Contas a Pagar - MCA\n\n";
      csvContent += "Descrição;Fornecedor;Categoria;Vencimento;Valor;Status\n";
      payables.forEach(p => {
        csvContent += `"${p.descricao}";"${p.fornecedor || ''}";"${p.categoria}";"${formatDate(p.vencimento)}";"${p.valor.toFixed(2)}";"${p.status}"\n`;
      });
    } else if (type === 'receivables') {
      csvContent += "Contas a Receber - MCA\n\n";
      csvContent += "Descrição;Cliente;Categoria;Vencimento;Valor;Status\n";
      receivables.forEach(r => {
        csvContent += `"${r.descricao}";"${r.cliente || ''}";"${r.categoria}";"${formatDate(r.vencimento)}";"${r.valor.toFixed(2)}";"${r.status}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `contabilidade_${type}_mca_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Arquivo exportado com sucesso!');
  };

  const triggerPrint = () => {
    window.print();
  };

  // Competency (Month/Year) extractor
  const getCompetences = () => {
    const list = new Set<string>();
    const allRecords = [...payables, ...receivables];
    allRecords.forEach(r => {
      const d = new Date(r.vencimento);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      list.add(key);
    });
    return Array.from(list).sort().reverse();
  };

  const competences = getCompetences();

  // Document attachments compiler
  const getAttachments = () => {
    const docs: Array<{ record: FinancialRecord; att: Attachment; type: 'Pagar' | 'Receber' }> = [];
    
    payables.forEach(p => {
      if (p.attachments) {
        p.attachments.forEach(a => {
          docs.push({ record: p, att: a, type: 'Pagar' });
        });
      }
    });

    receivables.forEach(r => {
      if (r.attachments) {
        r.attachments.forEach(a => {
          docs.push({ record: r, att: a, type: 'Receber' });
        });
      }
    });

    return docs.filter(d => {
      // Competence Filter
      if (selectedCompetence !== 'todos') {
        const date = new Date(d.record.vencimento);
        const comp = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        if (comp !== selectedCompetence) return false;
      }

      // Document category/type filter
      if (selectedDocCategory !== 'todos') {
        const ext = d.att.fileName.split('.').pop()?.toLowerCase();
        if (selectedDocCategory === 'pdf' && ext !== 'pdf') return false;
        if (selectedDocCategory === 'img' && ext !== 'jpg' && ext !== 'png' && ext !== 'jpeg') return false;
      }

      // Search filter
      if (docSearch) {
        const searchLower = docSearch.toLowerCase();
        return (
          d.att.fileName.toLowerCase().includes(searchLower) ||
          d.record.descricao.toLowerCase().includes(searchLower) ||
          (d.record.fornecedor && d.record.fornecedor.toLowerCase().includes(searchLower)) ||
          (d.record.cliente && d.record.cliente.toLowerCase().includes(searchLower))
        );
      }

      return true;
    });
  };

  const filteredDocs = getAttachments();

  // Audit Logs Filter
  const filteredAudits = auditLogs.filter(log => {
    if (!auditSearch) return true;
    const s = auditSearch.toLowerCase();
    return (
      log.user.toLowerCase().includes(s) ||
      (log.changes && log.changes.toLowerCase().includes(s)) ||
      (log.comments && log.comments.toLowerCase().includes(s)) ||
      log.action.toLowerCase().includes(s)
    );
  });

  // Graph Helper: SVG Donut Chart
  const renderSVGDonut = (chartData: Record<string, number> = {}, colors: string[]) => {
    const entries = Object.entries(chartData);
    const total = entries.reduce((sum, [_, v]) => sum + v, 0);

    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-xs">
          <span>Sem dados para apresentar</span>
        </div>
      );
    }

    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
        <div className="relative w-36 h-36">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {entries.map(([cat, val], idx) => {
              const percent = (val / total) * 100;
              const strokeLength = (percent / 100) * circumference;
              const strokeOffset = circumference - ((accumulatedPercent / 100) * circumference);
              accumulatedPercent += percent;
              const strokeColor = colors[idx % colors.length];

              return (
                <circle
                  key={cat}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth="10"
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-500 hover:stroke-[12px] cursor-pointer"
                >
                  <title>{`${cat}: ${formatCurrency(val)} (${percent.toFixed(1)}%)`}</title>
                </circle>
              );
            })}
            <circle cx="60" cy="60" r="40" className="fill-card" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider">Total</span>
            <span className="text-xs font-black text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5 w-full">
          {entries.map(([cat, val], idx) => {
            const percent = (val / total) * 100;
            const color = colors[idx % colors.length];
            return (
              <div key={cat} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: color }}></span>
                  <span className="text-muted-foreground truncate max-w-[120px]">{cat}</span>
                </div>
                <span className="font-bold text-foreground">{formatCurrency(val)} ({percent.toFixed(0)}%)</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <RefreshCw className="animate-spin text-primary" size={32} />
        <span className="text-muted-foreground font-semibold">Carregando painel de contabilidade...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com efeito Glassmorphism */}
      <div className="bg-card/40 backdrop-blur-md border border-border/80 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 text-violet-500 rounded-xl">
              <Calculator size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground tracking-tight uppercase">Visão do Contador</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Lock size={12} className="text-violet-500" />
                <span>Portal Fiscal e Contábil • <b>Empresa MCA</b> • Acesso de Leitura Seguro</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-sm font-semibold hover:bg-secondary transition-all w-full md:w-auto"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            <span>Atualizar</span>
          </button>
          
          <button 
            onClick={triggerPrint}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all w-full md:w-auto"
          >
            <Download size={16} />
            <span>Imprimir DRE</span>
          </button>
        </div>
      </div>

      {/* Navegação de Abas Premium */}
      <div className="flex border-b border-border/60 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calculator size={16} />
          <span>Dashboard Fiscal</span>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText size={16} />
          <span>DRE & Relatórios</span>
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'documents'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <File size={16} />
          <span>Documentos Contábeis</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <History size={16} />
          <span>Auditoria</span>
        </button>

        <button
          onClick={() => setActiveTab('taxes')}
          className={`flex items-center gap-2 px-4 py-2.5 border-b-2 text-sm font-bold transition-all uppercase tracking-wider whitespace-nowrap ${
            activeTab === 'taxes'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Settings size={16} />
          <span>Cadastrar Impostos</span>
        </button>
      </div>

      {/* CONTEÚDO DAS ABAS */}

      {/* ABA 1: DASHBOARD FISCAL */}
      {activeTab === 'dashboard' && dashboardData && (
        <div className="space-y-6">
          {/* Grid de KPIs inteligentes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI 1: Receita Bruta */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Receita Bruta Est.</p>
                  <h3 className="text-xl font-black text-foreground mt-1.5">
                    {formatCurrency(dashboardData.kpis.totalContasReceber)}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Faturamento Geral</span>
                <span className="text-emerald-500 font-bold">Total Recebível</span>
              </div>
            </div>

            {/* KPI 2: Receita Líquida */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Receita Líquida (Realizada)</p>
                  <h3 className="text-xl font-black text-emerald-500 mt-1.5">
                    {formatCurrency(dashboardData.kpis.recebimentosRealizados)}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <DollarSign size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Total Recebido</span>
                <span className="text-muted-foreground/80">Base de Imposto</span>
              </div>
            </div>

            {/* KPI 3: Despesas Operacionais */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Custos Operacionais</p>
                  <h3 className="text-xl font-black text-red-500 mt-1.5">
                    {formatCurrency(dashboardData.kpis.totalContasPagar)}
                  </h3>
                </div>
                <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                  <TrendingDown size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Total Contas a Pagar</span>
                <span className="text-red-500 font-bold">Saídas</span>
              </div>
            </div>

            {/* KPI 4: Fluxo de Caixa (Líquido) */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Saldo em Caixa Realizado</p>
                  <h3 className={`text-xl font-black mt-1.5 ${dashboardData.kpis.saldoLiquido >= 0 ? 'text-primary' : 'text-red-500'}`}>
                    {formatCurrency(dashboardData.kpis.saldoLiquido)}
                  </h3>
                </div>
                <div className="p-2 bg-primary/10 text-primary rounded-xl">
                  <Calendar size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Recebidos - Pagos</span>
                <span className="text-primary font-bold">Líquido</span>
              </div>
            </div>

            {/* KPIs Fiscais Especiais (Calculados Dinamicamente da Tabela) */}
            
            {/* Impostos Estimados (Dinâmicos) */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Impostos Est. Totais</p>
                  <h3 className="text-xl font-black text-amber-500 mt-1.5">
                    {formatCurrency(dynamicTaxes.total)}
                  </h3>
                </div>
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <FileText size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Total de Impostos Ativos</span>
                <span className="text-amber-500 font-bold">Provisão Dinâmica</span>
              </div>
            </div>

            {/* Margem Operacional */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Margem Operacional Est.</p>
                  <h3 className="text-xl font-black text-violet-500 mt-1.5">
                    {dashboardData.kpis.recebimentosRealizados > 0 
                      ? `${((dashboardData.kpis.saldoLiquido / dashboardData.kpis.recebimentosRealizados) * 100).toFixed(1)}%` 
                      : '0.0%'}
                  </h3>
                </div>
                <div className="p-2 bg-violet-500/10 text-violet-500 rounded-xl">
                  <Calculator size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Eficiência de Caixa</span>
                <span className="text-violet-500 font-bold">Desempenho</span>
              </div>
            </div>

            {/* Inadimplência */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Contas Vencidas</p>
                  <h3 className="text-xl font-black text-red-400 mt-1.5">
                    {dashboardData.kpis.contasVencidas} Lançamento(s)
                  </h3>
                </div>
                <div className="p-2 bg-red-500/10 text-red-400 rounded-xl">
                  <AlertTriangle size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Contas Pendentes Vencidas</span>
                <span className="text-red-400 font-bold">Risco</span>
              </div>
            </div>

            {/* Lucro Líquido Realizado com Dedução Fiscal Dinâmica */}
            <div className="bg-card border border-border rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resultado Líquido do Período</p>
                  <h3 className="text-xl font-black text-emerald-400 mt-1.5">
                    {formatCurrency(dashboardData.kpis.recebimentosRealizados - dashboardData.kpis.despesasPagas - dynamicTaxes.totalRetencao)}
                  </h3>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <TrendingUp size={18} />
                </div>
              </div>
              <div className="mt-4 text-[10px] text-muted-foreground pt-3 border-t border-border/40 flex justify-between">
                <span>Recebidos - Pagos - Retenções</span>
                <span className="text-emerald-400 font-bold">Resultado</span>
              </div>
            </div>
          </div>

          {/* Gráficos de Contabilidade */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
              <h4 className="font-bold text-xs text-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-1 h-3 rounded bg-red-500 inline-block"></span>
                Despesas Operacionais por Categoria
              </h4>
              {renderSVGDonut(dashboardData.graficos.despesasPorCategoria, [
                '#ef4444', '#f59e0b', '#ec4899', '#a855f7', '#3b82f6', '#6b7280'
              ])}
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs">
              <h4 className="font-bold text-xs text-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                <span className="w-1 h-3 rounded bg-emerald-500 inline-block"></span>
                Receitas por Categoria
              </h4>
              {renderSVGDonut(dashboardData.graficos.receitasPorCategoria, [
                '#10b981', '#06b6d4', '#3b82f6', '#a855f7', '#f59e0b', '#6b7280'
              ])}
            </div>

            {/* Fluxo de Caixa Mensal */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-xs lg:col-span-2">
              <h4 className="font-bold text-xs text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-1 h-3 rounded bg-primary inline-block"></span>
                Evolução Mensal (Entradas vs Saídas)
              </h4>
              
              {Object.keys(dashboardData.graficos.fluxoMensal).length === 0 ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                  Sem movimentações nos últimos meses.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative h-60 w-full flex items-end justify-around border-b border-border/80 pb-3 pt-6">
                    {/* Grid Lines */}
                    <div className="absolute inset-x-0 top-6 bottom-12 flex flex-col justify-between pointer-events-none">
                      <div className="border-b border-border/10 w-full"></div>
                      <div className="border-b border-border/10 w-full"></div>
                      <div className="border-b border-border/10 w-full"></div>
                    </div>

                    {(() => {
                      const values = Object.values(dashboardData.graficos.fluxoMensal);
                      const maxVal = Math.max(...values.map(v => Math.max(v.receitas, v.despesas, 100)));

                      return Object.entries(dashboardData.graficos.fluxoMensal).map(([mesAno, val]) => {
                        const recPercent = (val.receitas / maxVal) * 100;
                        const desPercent = (val.despesas / maxVal) * 100;

                        return (
                          <div key={mesAno} className="flex flex-col items-center gap-2 w-20 group relative z-10">
                            <div className="flex items-end gap-1.5 h-36 w-full justify-center">
                              {/* Receitas Bar */}
                              <div 
                                style={{ height: `${recPercent}%` }}
                                className="w-4 bg-emerald-500/80 hover:bg-emerald-500 rounded-t-xs transition-all duration-300 relative group-hover:scale-x-110"
                              >
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border text-[9px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-25">
                                  Rec: {formatCurrency(val.receitas)}
                                </span>
                              </div>

                              {/* Despesas Bar */}
                              <div 
                                style={{ height: `${desPercent}%` }}
                                className="w-4 bg-red-500/80 hover:bg-red-500 rounded-t-xs transition-all duration-300 relative group-hover:scale-x-110"
                              >
                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground border border-border text-[9px] font-bold px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-25">
                                  Des: {formatCurrency(val.despesas)}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-bold tracking-tight">{mesAno}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Legenda do Fluxo */}
                  <div className="flex justify-center gap-6 text-xs pt-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
                      <span className="text-muted-foreground font-bold">Entradas (Receitas Realizadas)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500 rounded-xs"></span>
                      <span className="text-muted-foreground font-bold">Saídas (Despesas Operacionais)</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ABA 2: DRE & RELATÓRIOS (Com cálculo e listagem detalhada de impostos reais) */}
      {activeTab === 'reports' && dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Demonstração do Resultado (DRE) */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs lg:col-span-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-3 rounded bg-violet-500 inline-block"></span>
                  Estrutura de DRE Simplificado
                </h4>
                <button 
                  onClick={() => exportToCSV('dre')}
                  className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  title="Exportar DRE para Excel/CSV"
                >
                  <Download size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs py-2 border-b border-border/40">
                  <span className="text-muted-foreground font-bold">1. RECEITA BRUTA OPERACIONAL</span>
                  <span className="font-extrabold text-foreground">{formatCurrency(dashboardData.kpis.totalContasReceber)}</span>
                </div>

                {/* Deduções de impostos cadastrados */}
                {dynamicTaxes.list.length === 0 ? (
                  <div className="text-[10px] text-muted-foreground/60 py-1.5">
                    Sem impostos ativos cadastrados. Configure impostos na aba de Configurações.
                  </div>
                ) : (
                  dynamicTaxes.list.map((t, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] py-1.5 border-b border-border/20 text-red-400 pl-3">
                      <span className="font-medium flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-red-400 inline-block"></span>
                        (-) {t.nome} ({t.aliquota}%)
                      </span>
                      <span className="font-bold">({formatCurrency(t.valor)})</span>
                    </div>
                  ))
                )}

                <div className="flex justify-between items-center text-xs py-2 border-b border-border/40 bg-secondary/35 px-2 rounded">
                  <span className="text-primary font-bold">2. RECEITA OPERACIONAL LÍQUIDA</span>
                  <span className="font-extrabold text-primary">
                    {formatCurrency(dashboardData.kpis.totalContasReceber - dynamicTaxes.totalFaturamento)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-xs py-2 border-b border-border/40 text-red-500">
                  <span className="font-medium">(-) Custos & Despesas Operacionais</span>
                  <span className="font-bold">({formatCurrency(dashboardData.kpis.totalContasPagar)})</span>
                </div>

                <div className="flex justify-between items-center text-xs py-2 bg-primary/10 px-2 rounded font-black">
                  <span className="text-emerald-500 font-extrabold">3. RESULTADO LÍQUIDO DO PERÍODO</span>
                  <span className="font-black text-emerald-400">
                    {formatCurrency((dashboardData.kpis.recebimentosRealizados) - (dashboardData.kpis.despesasPagas) - dynamicTaxes.totalRetencao)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-border/40 text-[10px] text-muted-foreground leading-relaxed">
              * O DRE apresentado acima calcula dinamicamente as deduções contábeis e fiscais com base nos alíquotas reais configuradas no sistema contábil de MCA.
            </div>
          </div>

          {/* Listagens de Contas */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-xs lg:col-span-2 space-y-6">
            
            {/* Contas a Pagar MCA */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-3 rounded bg-red-500 inline-block"></span>
                  Lançamentos de Contas a Pagar
                </h4>
                <button 
                  onClick={() => exportToCSV('payables')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-secondary text-xs text-muted-foreground hover:text-foreground font-semibold transition-all border border-border"
                >
                  <Download size={14} />
                  <span>Excel/CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-56 border border-border/60 rounded-xl">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="p-3 font-black text-muted-foreground uppercase">Descrição</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Fornecedor</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Vencimento</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Valor</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payables.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-muted-foreground">Nenhum registro encontrado</td>
                      </tr>
                    ) : (
                      payables.slice(0, 15).map(p => (
                        <tr key={p.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                          <td className="p-3 font-bold text-foreground truncate max-w-[160px]">{p.descricao}</td>
                          <td className="p-3 text-muted-foreground">{p.fornecedor || '-'}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(p.vencimento)}</td>
                          <td className="p-3 font-bold text-red-500">{formatCurrency(p.valor)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              p.status === 'PAGA' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Contas a Receber MCA */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1 h-3 rounded bg-emerald-500 inline-block"></span>
                  Lançamentos de Contas a Receber
                </h4>
                <button 
                  onClick={() => exportToCSV('receivables')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg hover:bg-secondary text-xs text-muted-foreground hover:text-foreground font-semibold transition-all border border-border"
                >
                  <Download size={14} />
                  <span>Excel/CSV</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-56 border border-border/60 rounded-xl">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-card border-b border-border">
                      <th className="p-3 font-black text-muted-foreground uppercase">Descrição</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Cliente</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Vencimento</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Valor</th>
                      <th className="p-3 font-black text-muted-foreground uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivables.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-muted-foreground">Nenhum registro encontrado</td>
                      </tr>
                    ) : (
                      receivables.slice(0, 15).map(r => (
                        <tr key={r.id} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                          <td className="p-3 font-bold text-foreground truncate max-w-[160px]">{r.descricao}</td>
                          <td className="p-3 text-muted-foreground">{r.cliente || '-'}</td>
                          <td className="p-3 text-muted-foreground">{formatDate(r.vencimento)}</td>
                          <td className="p-3 font-bold text-emerald-500">{formatCurrency(r.valor)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                              r.status === 'RECEBIDA' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA 3: CENTRAL DE DOCUMENTOS */}
      {activeTab === 'documents' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-3 rounded bg-violet-500 inline-block"></span>
              Central de Documentos Contábeis por Competência
            </h4>
            
            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-secondary/40 border border-border px-3 py-1.5 rounded-xl text-xs w-full sm:w-auto">
                <Search size={14} className="text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Pesquisar arquivos..." 
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="bg-transparent border-none outline-hidden focus:ring-0 text-foreground w-full placeholder-muted-foreground"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={14} className="text-muted-foreground" />
                <select
                  value={selectedCompetence}
                  onChange={(e) => setSelectedCompetence(e.target.value)}
                  className="bg-secondary/40 border border-border text-xs rounded-xl px-3 py-1.5 text-foreground outline-hidden focus:ring-0"
                >
                  <option value="todos">Competência (Todas)</option>
                  {competences.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <select
                value={selectedDocCategory}
                onChange={(e) => setSelectedDocCategory(e.target.value)}
                className="bg-secondary/40 border border-border text-xs rounded-xl px-3 py-1.5 text-foreground outline-hidden focus:ring-0"
              >
                <option value="todos">Tipo (Todos)</option>
                <option value="pdf">Apenas PDFs</option>
                <option value="img">Apenas Imagens</option>
              </select>
            </div>
          </div>

          {/* Grid de Arquivos e Anexos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.length === 0 ? (
              <div className="col-span-full py-12 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <File size={28} className="text-muted-foreground/50" />
                <span>Nenhum documento contábil carregado ou localizado.</span>
              </div>
            ) : (
              filteredDocs.map(({ record, att, type }) => {
                const ext = att.fileName.split('.').pop()?.toLowerCase();
                const d = new Date(record.vencimento);
                const comp = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

                return (
                  <div key={att.id} className="bg-secondary/25 border border-border/80 hover:border-violet-500/50 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all hover:bg-secondary/45 relative group">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${ext === 'pdf' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        <FileText size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider mb-1 inline-block">
                          {type} • Competência: {comp}
                        </span>
                        <h5 className="text-xs font-bold text-foreground truncate">{att.fileName}</h5>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{record.descricao}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        Valor: <span className={type === 'Pagar' ? 'text-red-500' : 'text-emerald-500'}>{formatCurrency(record.valor)}</span>
                      </span>
                      <a 
                        href={att.fileUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary font-bold hover:underline"
                      >
                        <Eye size={12} />
                        <span>Visualizar</span>
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ABA 4: AUDITORIA */}
      {activeTab === 'audit' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-3 rounded bg-violet-500 inline-block"></span>
              Timeline e Logs de Auditoria Financeira
            </h4>
            
            <div className="flex items-center gap-2 bg-secondary/40 border border-border px-3 py-1.5 rounded-xl text-xs w-full md:w-64">
              <Search size={14} className="text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Pesquisar por usuário ou ação..." 
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="bg-transparent border-none outline-hidden focus:ring-0 text-foreground w-full placeholder-muted-foreground"
              />
            </div>
          </div>

          <div className="relative border-l border-border/60 ml-4 pl-6 space-y-6">
            {filteredAudits.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-xs pl-0">
                Nenhum log de auditoria encontrado.
              </div>
            ) : (
              filteredAudits.map((log) => {
                const isApproval = log.action === 'APPROVAL';
                const isCreation = log.action === 'CREATE';
                
                return (
                  <div key={log.id} className="relative group">
                    {/* Indicador tipo Timeline */}
                    <span className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center ${
                      isApproval ? 'bg-emerald-500' : isCreation ? 'bg-primary' : 'bg-amber-500'
                    }`}>
                      <span className="w-1.5 h-1.5 bg-card rounded-full"></span>
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black text-foreground uppercase bg-secondary px-2.5 py-0.5 rounded-full border border-border">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock size={11} />
                          {formatDate(log.createdAt)} {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-foreground">
                        {log.changes || 'Lançamento atualizado no sistema contábil'}
                      </p>

                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground bg-secondary/20 p-2 rounded-xl border border-border/40 inline-flex">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-violet-400" />
                          Responsável: <b>{log.user}</b>
                        </span>
                        
                        {log.comments && (
                          <span className="border-l border-border/60 pl-3">
                            Comentário: <i>{log.comments}</i>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ABA 5: CADASTRO E CONFIGURAÇÃO DE IMPOSTOS (NEW TAB!) */}
      {activeTab === 'taxes' && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h4 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-3 rounded bg-violet-500 inline-block"></span>
                Configuração e Cadastro de Alíquotas de Impostos
              </h4>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cadastre e ative as alíquotas fiscais de MCA para calcular impostos sobre o faturamento ou retenções na fonte.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {taxes.length === 0 && (
                <button
                  onClick={createDefaultTaxes}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-bold transition-all border border-violet-500/20 w-full md:w-auto"
                >
                  <Plus size={14} />
                  <span>Gerar Impostos Padrão</span>
                </button>
              )}

              <button
                onClick={() => {
                  setEditingTax(null);
                  setTaxForm({ nome: '', aliquota: '', tipo: 'FATURAMENTO', status: 'ATIVO' });
                  setIsTaxModalOpen(true);
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-extrabold hover:bg-primary/95 transition-all w-full md:w-auto"
              >
                <Plus size={14} />
                <span>Novo Imposto</span>
              </button>
            </div>
          </div>

          {/* Listagem de Impostos */}
          <div className="overflow-x-auto border border-border/60 rounded-2xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-secondary/20 border-b border-border">
                  <th className="p-4 font-black text-muted-foreground uppercase">Nome do Imposto</th>
                  <th className="p-4 font-black text-muted-foreground uppercase">Alíquota (%)</th>
                  <th className="p-4 font-black text-muted-foreground uppercase">Tipo / Base de Cálculo</th>
                  <th className="p-4 font-black text-muted-foreground uppercase">Status</th>
                  <th className="p-4 font-black text-muted-foreground uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {taxes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      Nenhum imposto cadastrado no sistema. Clique em "Novo Imposto" ou "Gerar Impostos Padrão".
                    </td>
                  </tr>
                ) : (
                  taxes.map(tax => (
                    <tr key={tax.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                      <td className="p-4 font-bold text-foreground">{tax.nome}</td>
                      <td className="p-4 font-black text-violet-400 text-sm">{tax.aliquota.toFixed(2)}%</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          tax.tipo === 'FATURAMENTO' 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : tax.tipo === 'RETENCAO' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-muted/10 text-muted-foreground'
                        }`}>
                          {tax.tipo === 'FATURAMENTO' 
                            ? 'FATURAMENTO (SOBRE RECEITA BRUTA)' 
                            : tax.tipo === 'RETENCAO' 
                            ? 'RETENÇÃO NA FONTE (SOBRE LIQUIDADO)' 
                            : 'OUTRO'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                          tax.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {tax.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openEditTax(tax)}
                            className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          
                          <button
                            onClick={() => handleDeleteTax(tax.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Efeito Modal para Cadastro/Edição de Impostos */}
          {isTaxModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-5 border-b border-border">
                  <h3 className="font-black text-sm uppercase text-foreground">
                    {editingTax ? 'Editar Imposto' : 'Cadastrar Novo Imposto'}
                  </h3>
                  <button 
                    onClick={() => setIsTaxModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleTaxSubmit} className="p-5 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Nome do Imposto *</label>
                    <input 
                      type="text"
                      placeholder="Ex: Simples Nacional, ISS MCA"
                      value={taxForm.nome}
                      onChange={(e) => setTaxForm({ ...taxForm, nome: e.target.value })}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Alíquota (%) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        placeholder="Ex: 6.5"
                        value={taxForm.aliquota}
                        onChange={(e) => setTaxForm({ ...taxForm, aliquota: e.target.value })}
                        className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Status</label>
                      <select
                        value={taxForm.status}
                        onChange={(e) => setTaxForm({ ...taxForm, status: e.target.value as 'ATIVO' | 'INATIVO' })}
                        className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                      >
                        <option value="ATIVO">Ativo</option>
                        <option value="INATIVO">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Tipo / Base de Cálculo</label>
                    <select
                      value={taxForm.tipo}
                      onChange={(e) => setTaxForm({ ...taxForm, tipo: e.target.value as 'FATURAMENTO' | 'RETENCAO' | 'OUTRO' })}
                      className="w-full bg-secondary/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                    >
                      <option value="FATURAMENTO">Faturamento (Sobre Faturamento Bruto)</option>
                      <option value="RETENCAO">Retenção na Fonte (Sobre Receitas Recebidas/Liquidadas)</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t border-border mt-6">
                    <button
                      type="button"
                      onClick={() => setIsTaxModalOpen(false)}
                      className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                    
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-black text-primary-foreground bg-primary hover:bg-primary/95 rounded-xl transition-all"
                    >
                      {editingTax ? 'Salvar Alterações' : 'Cadastrar Imposto'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
