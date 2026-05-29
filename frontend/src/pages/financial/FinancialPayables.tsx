import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Eye, 
  Paperclip, 
  Calendar, 
  FileText, 
  Check, 
  X, 
  AlertTriangle,
  History,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Attachment {
  id?: string;
  fileName: string;
  fileType: string;
  fileUrl: string; // Base64 string
}

interface Audit {
  id: string;
  action: string;
  previousStatus?: string;
  newStatus: string;
  user: string;
  changes: string;
  comments?: string;
  createdAt: string;
}

interface Payable {
  id: string;
  companyId: string;
  company?: { nomeFantasia: string; razaoSocial: string };
  fornecedor: string;
  categoria: string;
  centroCusto: string;
  descricao: string;
  valor: number;
  dataEmissao: string;
  vencimento: string;
  dataPagamento?: string | null;
  formaPagamento: string;
  responsavel: string;
  observacoes?: string | null;
  status: string;
  recorrente: boolean;
  tipoRecorrencia?: string | null;
  quantidadeParcelas?: number | null;
  parcelaAtual?: number | null;
  pagamentoAutomatico: boolean;
  parentRecurrenceId?: string | null;
  attachments: Attachment[];
  linkedQuotes?: any[];
}

export function FinancialPayables() {
  const [payables, setPayables] = useState<Payable[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('');

  // Modals & Active State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<Payable | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [recurrents, setRecurrents] = useState<Payable[]>([]);
  const [isRecurrentLoading, setIsRecurrentLoading] = useState(false);

  // Form Fields
  const [companyId, setCompanyId] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [centroCusto, setCentroCusto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [dataPagamento, setDataPagamento] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState('PENDENTE');
  const [recorrente, setRecorrente] = useState(false);
  const [tipoRecorrencia, setTipoRecorrencia] = useState('MENSAL');
  
  // Suppliers selection
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [quantidadeParcelas, setQuantidadeParcelas] = useState('12');
  const [pagamentoAutomatico, setPagamentoAutomatico] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [collaborators, setCollaborators] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  
  // Sequence update / delete
  const [editMode, setEditMode] = useState<'CURRENT' | 'SEQUENCE'>('CURRENT');
  const [approvedQuotes, setApprovedQuotes] = useState<any[]>([]);
  const [linkedQuotes, setLinkedQuotes] = useState<{ quoteId: string, valorVinculado: number }[]>([]);

  const handleAddLink = (quoteId: string) => {
    if (!quoteId) return;
    const q = approvedQuotes.find(item => item.id === quoteId);
    if (!q) return;

    // Calcular valor inicial padrão seguro
    const payableVal = Number(valor) || 0;
    const initialVal = payableVal;

    setLinkedQuotes(prev => [...prev, { quoteId, valorVinculado: initialVal }]);
  };

  // Fetch Companies & Payables
  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/companies', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/registry/suppliers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/registry/collaborators', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchApprovedQuotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/financial/approved-quotes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApprovedQuotes(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/financial/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchSuppliers();
    fetchCollaborators();
    fetchApprovedQuotes();
    fetchCategories();
  }, []);

  // Sincronizar valor alocado de forma automática com o valor do lançamento se houver apenas 1 orçamento vinculado
  useEffect(() => {
    const numericValor = Number(valor) || 0;
    if (linkedQuotes.length === 1) {
      setLinkedQuotes(prev => {
        if (prev[0].valorVinculado !== numericValor) {
          return [{ ...prev[0], valorVinculado: numericValor }];
        }
        return prev;
      });
    }
  }, [valor, linkedQuotes.length]);

  const fetchPayables = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (companyFilter) params.append('companyId', companyFilter);
      if (categoryFilter) params.append('category', categoryFilter);
      if (costCenterFilter) params.append('costCenter', costCenterFilter);

      const res = await fetch(`/financial/payables?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPayables(data.payables);
        setTotalCount(data.totalCount);
      } else {
        toast.error('Erro ao listar contas a pagar.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchPayables();
  }, [page, search, statusFilter, companyFilter, categoryFilter, costCenterFilter]);

  // Handle File Upload (Convert to Base64)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning(`O arquivo ${file.name} excede o limite de 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            fileName: file.name,
            fileType: file.type,
            fileUrl: reader.result as string, // Base64
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Open Form for Create
  const handleCreateOpen = () => {
    setSelectedPayable(null);
    setCompanyId(companies[0]?.id || '');
    setFornecedor('');
    setSupplierSearch('');
    setShowSupplierDropdown(false);
    setCategoria('');
    setCentroCusto('');
    setDescricao('');
    setValor('');
    setLinkedQuotes([]);
    fetchApprovedQuotes();
    
    // Default dates (today)
    const todayStr = new Date().toISOString().substring(0, 10);
    setDataEmissao(todayStr);
    setVencimento(todayStr);
    setDataPagamento('');
    setFormaPagamento('Pix');
    setResponsavel('');
    setObservacoes('');
    setStatus('PENDENTE');
    setRecorrente(false);
    setTipoRecorrencia('MENSAL');
    setQuantidadeParcelas('12');
    setPagamentoAutomatico(false);
    setAttachments([]);
    setEditMode('CURRENT');
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleEditOpen = (payable: Payable) => {
    setSelectedPayable(payable);
    setCompanyId(payable.companyId);
    setFornecedor(payable.fornecedor);
    setSupplierSearch(payable.fornecedor);
    setShowSupplierDropdown(false);
    setCategoria(payable.categoria);
    setCentroCusto(payable.centroCusto);
    setDescricao(payable.descricao.replace(/\s\(\d+\/\d+\)$/, '')); // strip installment label
    setValor(String(payable.valor));
    setDataEmissao(payable.dataEmissao.substring(0, 10));
    setVencimento(payable.vencimento.substring(0, 10));
    setDataPagamento(payable.dataPagamento ? payable.dataPagamento.substring(0, 10) : '');
    setFormaPagamento(payable.formaPagamento);
    setResponsavel(payable.responsavel);
    setObservacoes(payable.observacoes || '');
    setStatus(payable.status);
    setRecorrente(payable.recorrente);
    setTipoRecorrencia(payable.tipoRecorrencia || 'MENSAL');
    setQuantidadeParcelas(String(payable.quantidadeParcelas || 1));
    setPagamentoAutomatico(payable.pagamentoAutomatico);
    setAttachments(payable.attachments || []);
    
    if ((payable as any).linkedQuotes) {
      setLinkedQuotes((payable as any).linkedQuotes.map((l: any) => ({
        quoteId: l.quoteId,
        valorVinculado: l.valorVinculado
      })));
    } else {
      setLinkedQuotes([]);
    }
    fetchApprovedQuotes();

    setEditMode('CURRENT');
    setIsFormOpen(true);
  };

  // Save / Update Account Payable
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId || !fornecedor || !categoria || !centroCusto || !valor || !dataEmissao || !vencimento || !responsavel) {
      toast.warning('Preencha todos os campos obrigatórios.');
      return;
    }

    const token = localStorage.getItem('token');
    let userEmail = 'Administrador';
    try {
      const meRes = await fetch('/auth/me', { headers: { 'Authorization': `Bearer ${token}` } });
      if (meRes.ok) {
        const me = await meRes.json();
        userEmail = me.email;
      }
    } catch (err) {
      console.error(err);
    }

    // Validar se o total alocado excede os saldos dos orçamentos
    for (const link of linkedQuotes) {
      const q = approvedQuotes.find(item => item.id === link.quoteId);
      if (q) {
        const previousLinkedVal = selectedPayable && (selectedPayable as any).linkedQuotes
          ? (selectedPayable as any).linkedQuotes.find((l: any) => l.quoteId === link.quoteId)?.valorVinculado || 0
          : 0;

        const realAvailable = q.saldoDisponivel + previousLinkedVal;

        if (link.valorVinculado > realAvailable) {
          toast.error(`O valor alocado para o orçamento #${q.numeroOrcamento} (R$ ${link.valorVinculado.toFixed(2)}) ultrapassa o saldo disponível (R$ ${realAvailable.toFixed(2)}).`);
          return;
        }
      }
    }

    const payload = {
      companyId,
      fornecedor,
      categoria,
      centroCusto,
      descricao,
      valor: Number(valor),
      dataEmissao,
      vencimento,
      dataPagamento: status === 'PAGA' ? (dataPagamento || new Date()) : null,
      formaPagamento,
      responsavel,
      observacoes,
      status,
      recorrente,
      tipoRecorrencia,
      quantidadeParcelas: recorrente ? Number(quantidadeParcelas) : null,
      pagamentoAutomatico,
      attachments,
      editMode,
      linkedQuotes
    };

    try {
      const url = selectedPayable ? `/financial/payables/${selectedPayable.id}` : '/financial/payables';
      const method = selectedPayable ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-email': userEmail
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(selectedPayable ? 'Lançamento atualizado com sucesso!' : 'Lançamento(s) financeiro(s) criado(s) com sucesso!');
        setIsFormOpen(false);
        fetchPayables();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Erro ao salvar lançamento.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar.');
    }
  };

  // Delete Account
  const handleDelete = async (payable: Payable) => {
    const token = localStorage.getItem('token');

    let modeParam = 'CURRENT';
    if (payable.recorrente && payable.parentRecurrenceId) {
      const confirmAll = window.confirm('Esta despesa é parte de uma sequência recorrente. Deseja excluir TODA a sequência de parcelas vinculadas?\n\n[OK] = Excluir TODA a sequência\n[Cancelar] = Excluir apenas esta parcela');
      if (confirmAll) modeParam = 'SEQUENCE';
    } else {
      if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) return;
    }

    try {
      const res = await fetch(`/financial/payables/${payable.id}?deleteMode=${modeParam}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success(modeParam === 'SEQUENCE' ? 'Toda a sequência de parcelas foi removida!' : 'Parcela excluída com sucesso.');
        fetchPayables();
      } else {
        toast.error('Erro ao deletar lançamento.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro na conexão com o servidor.');
    }
  };

  // View Details (Including audit trail and recurrence chain)
  const handleViewDetails = async (payable: Payable) => {
    setSelectedPayable(payable);
    setIsDetailOpen(true);
    setAudits([]);
    setRecurrents([]);

    const token = localStorage.getItem('token');

    // Fetch audits
    try {
      const res = await fetch(`/financial/audits?payableId=${payable.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const auditData = await res.json();
        setAudits(auditData);
      }
    } catch (err) {
      console.error(err);
    }

    // Fetch recurrent sequences
    if (payable.parentRecurrenceId) {
      setIsRecurrentLoading(true);
      try {
        const res = await fetch(`/financial/recurrences?parentRecurrenceId=${payable.parentRecurrenceId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const recurData = await res.json();
          setRecurrents(recurData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsRecurrentLoading(false);
      }
    }
  };

  // Workflow Approval Handler
  const handleApprovalWorkflow = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedPayable) return;
    const token = localStorage.getItem('token');

    const comment = window.prompt(`Digite uma observação/comentário para esta ação (${action === 'APPROVE' ? 'Aprovar' : 'Reprovar'}):`);
    if (comment === null) return; // cancel

    // Obter email do executor
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
      const res = await fetch(`/financial/approve/${selectedPayable.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          type: 'PAGAR',
          action,
          comments: comment
        })
      });

      if (res.ok) {
        toast.success(action === 'APPROVE' ? 'Despesa aprovada!' : 'Despesa reprovada.');
        setIsDetailOpen(false);
        fetchPayables();
      } else {
        toast.error('Falha no fluxo de aprovação.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao processar aprovação.');
    }
  };

  // Status Badge Colors Helper
  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'PAGA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">Pago</span>;
      case 'PENDENTE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-yellow-500/10 text-yellow-600 uppercase tracking-wider">Pendente</span>;
      case 'EM ANÁLISE':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-500 uppercase tracking-wider">Em Análise</span>;
      case 'APROVADA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-500 uppercase tracking-wider">Aprovada</span>;
      case 'REPROVADA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500/10 text-red-500 uppercase tracking-wider">Reprovada</span>;
      case 'CANCELADA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-500/10 text-gray-500 uppercase tracking-wider">Cancelada</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gray-500/10 text-gray-600 uppercase">{statusStr}</span>;
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            💸 Contas a Pagar (Despesas)
          </h1>
          <p className="text-muted-foreground text-sm">Controle de saídas de caixa, agendamentos recorrentes e comprovantes.</p>
        </div>

        <button 
          onClick={handleCreateOpen}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/95 transition-all shadow-sm shrink-0"
        >
          <Plus size={16} /> Novo Lançamento
        </button>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text"
            placeholder="Buscar fornecedor, ref..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <select 
          value={companyFilter}
          onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Todas as Empresas</option>
          {companies.map(c => (
            <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
          ))}
        </select>

        <select 
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Todos os Status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM ANÁLISE">Em Análise</option>
          <option value="APROVADA">Aprovada</option>
          <option value="REPROVADA">Reprovada</option>
          <option value="PAGA">Paga</option>
          <option value="CANCELADA">Cancelada</option>
        </select>

        <select 
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Todas as Categorias</option>
          {categories
            .filter(c => c.type === 'PAYABLE' || c.type === 'BOTH')
            .map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
        </select>

        <select 
          value={costCenterFilter}
          onChange={(e) => { setCostCenterFilter(e.target.value); setPage(1); }}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Todos os Centros de Custo</option>
          <option value="Administrativo">Administrativo</option>
          <option value="Comercial">Comercial</option>
          <option value="Oficina Geral">Oficina Geral</option>
          <option value="Funilaria">Funilaria</option>
          <option value="Mecânica Pesada">Mecânica Pesada</option>
          <option value="Estética Automotiva">Estética Automotiva</option>
        </select>
      </div>

      {/* Main Ledger Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
            <RefreshCw size={24} className="animate-spin mb-3 text-primary" />
            <span>Processando lançamentos...</span>
          </div>
        ) : payables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm space-y-2">
            <span>Nenhuma despesa localizada com estes filtros.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-4">Empresa</th>
                  <th className="p-4">Fornecedor</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Comp.</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {payables.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-semibold text-foreground truncate max-w-[140px]">
                      {p.company?.nomeFantasia || p.company?.razaoSocial}
                    </td>
                    <td className="p-4 font-medium text-foreground">{p.fornecedor}</td>
                    <td className="p-4 text-muted-foreground">
                      <div className="flex flex-col">
                        <span>{p.descricao}</span>
                        {p.recorrente && (
                          <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mt-0.5">
                            Recorrente ({p.parcelaAtual}/{p.quantidadeParcelas})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right font-extrabold text-foreground">{formatCurrency(p.valor)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Calendar size={13} className="text-muted-foreground" />
                        {formatDate(p.vencimento)}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(p.status)}</td>
                    <td className="p-4">
                      {p.attachments && p.attachments.length > 0 ? (
                        <div className="flex items-center text-primary" title={`${p.attachments.length} anexo(s)`}>
                          <Paperclip size={14} />
                          <span className="text-[10px] font-bold ml-0.5">{p.attachments.length}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleViewDetails(p)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Ver detalhes / Aprovar"
                        >
                          <Eye size={15} />
                        </button>
                        <button 
                          onClick={() => handleEditOpen(p)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalCount > limit && (
          <div className="p-4 border-t border-border flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Mostrando {payables.length} de {totalCount} despesas</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(p - 1, 1))} 
                disabled={page === 1}
                className="px-3 py-1 bg-secondary text-xs rounded-lg text-foreground hover:bg-muted disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs font-bold text-foreground">Página {page}</span>
              <button 
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= totalCount}
                className="px-3 py-1 bg-secondary text-xs rounded-lg text-foreground hover:bg-muted disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>

      {/* modal de cadastro / edição */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">
                {selectedPayable ? '✏️ Editar Lançamento de Contas a Pagar' : '➕ Novo Lançamento de Contas a Pagar'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              {selectedPayable && selectedPayable.recorrente && selectedPayable.parentRecurrenceId && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <AlertTriangle size={15} /> 
                    Este lançamento é parte de uma recorrência agrupada (Parcela {selectedPayable.parcelaAtual}/{selectedPayable.quantidadeParcelas}).
                  </p>
                  <div className="flex items-center gap-3 text-xs">
                    <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="editMode" 
                        value="CURRENT" 
                        checked={editMode === 'CURRENT'} 
                        onChange={() => setEditMode('CURRENT')} 
                      />
                      Editar apenas esta parcela
                    </label>
                    <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                      <input 
                        type="radio" 
                        name="editMode" 
                        value="SEQUENCE" 
                        checked={editMode === 'SEQUENCE'} 
                        onChange={() => setEditMode('SEQUENCE')} 
                      />
                      Editar toda a sequência futura (pendentes)
                    </label>
                  </div>
                </div>
              )}

              {/* Grid Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Empresa *</label>
                  <select 
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  >
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1 relative">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Fornecedor *</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setFornecedor(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      placeholder="Busque ou digite o nome do fornecedor..."
                      className="w-full bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      required
                    />
                    {supplierSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierSearch('');
                          setFornecedor('');
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md hover:bg-secondary"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  {showSupplierDropdown && (
                    <>
                      {/* Overlay to close when clicking outside */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowSupplierDropdown(false)} 
                      />
                      
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-20 divide-y divide-border/60">
                        {suppliers.filter(s => {
                          const term = supplierSearch.toLowerCase();
                          return (
                            (s.razaoSocial || '').toLowerCase().includes(term) ||
                            (s.nomeFantasia || '').toLowerCase().includes(term) ||
                            (s.cnpj || '').replace(/\D/g, '').includes(term)
                          );
                        }).length === 0 ? (
                          <div className="p-3 text-xs text-muted-foreground italic">
                            Nenhum fornecedor cadastrado com esse nome. Pressione Tab ou clique fora para usar o nome digitado.
                          </div>
                        ) : (
                          suppliers.filter(s => {
                            const term = supplierSearch.toLowerCase();
                            return (
                              (s.razaoSocial || '').toLowerCase().includes(term) ||
                              (s.nomeFantasia || '').toLowerCase().includes(term) ||
                              (s.cnpj || '').replace(/\D/g, '').includes(term)
                            );
                          }).map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setFornecedor(s.razaoSocial);
                                setSupplierSearch(s.razaoSocial);
                                setShowSupplierDropdown(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-foreground hover:bg-primary/5 hover:text-primary transition-colors flex flex-col gap-0.5"
                            >
                              <span className="font-bold">{s.razaoSocial}</span>
                              {s.nomeFantasia && (
                                <span className="text-[10px] text-muted-foreground">Fantasia: {s.nomeFantasia}</span>
                              )}
                              {s.cnpj && (
                                <span className="text-[9px] font-mono text-muted-foreground font-black">CNPJ: {s.cnpj}</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Categoria *</label>
                  <select 
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    {categories
                      .filter(c => c.type === 'PAYABLE' || c.type === 'BOTH')
                      .map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Centro de Custo *</label>
                  <select 
                    value={centroCusto}
                    onChange={(e) => setCentroCusto(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="Administrativo">Administrativo</option>
                    <option value="Comercial">Comercial</option>
                    <option value="Oficina Geral">Oficina Geral</option>
                    <option value="Funilaria">Funilaria</option>
                    <option value="Mecânica Pesada">Mecânica Pesada</option>
                    <option value="Estética Automotiva">Estética Automotiva</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Descrição / Objeto do Lançamento</label>
                  <input 
                    type="text" 
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="E.g. Compra de ferramentas e scanners"
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Valor do Lançamento (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    placeholder="0,00"
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Forma de Pagamento</label>
                  <select 
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência Bancária">TED / DOC</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Data de Emissão *</label>
                  <input 
                    type="date" 
                    value={dataEmissao}
                    onChange={(e) => setDataEmissao(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Data de Vencimento *</label>
                  <input 
                    type="date" 
                    value={vencimento}
                    onChange={(e) => setVencimento(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="PENDENTE">Pendente</option>
                    <option value="EM ANÁLISE">Em Análise</option>
                    <option value="APROVADA">Aprovada</option>
                    <option value="REPROVADA">Reprovada</option>
                    <option value="PAGA">Paga (Liquidada)</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Responsável pelo Lançamento *</label>
                  <select 
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  >
                    <option value="">Selecione um colaborador...</option>
                    {collaborators.map((c: any) => (
                      <option key={c.id} value={c.nome}>
                        {c.nome} {c.cargo ? `- ${c.cargo}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {status === 'PAGA' && (
                  <div className="flex flex-col gap-1 animate-in slide-in-from-top-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Data de Pagamento</label>
                    <input 
                      type="date" 
                      value={dataPagamento}
                      onChange={(e) => setDataPagamento(e.target.value)}
                      className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Seção de Vínculo de Orçamentos Aprovados */}
              <div className="p-4 bg-secondary/20 border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div>
                    <h4 className="text-xs font-black uppercase text-foreground flex items-center gap-1.5">
                      📋 Vincular Orçamentos Aprovados
                    </h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Carregue e vincule orçamentos aprovados de clientes a este lançamento financeiro.
                    </p>
                  </div>
                  
                  {approvedQuotes.filter(q => !linkedQuotes.some(link => link.quoteId === q.id)).length > 0 && (
                    <select
                      onChange={(e) => {
                        handleAddLink(e.target.value);
                        e.target.value = ''; // Reset select
                      }}
                      className="bg-background border border-border rounded-lg text-xs px-2.5 py-1 text-foreground focus:ring-1 focus:ring-primary focus:outline-none cursor-pointer max-w-[200px]"
                      defaultValue=""
                    >
                      <option value="" disabled>+ Adicionar Orçamento...</option>
                      {approvedQuotes.filter(q => !linkedQuotes.some(link => link.quoteId === q.id)).map(q => (
                        <option key={q.id} value={q.id}>
                          #{q.numeroOrcamento} - {typeof q.client === 'object' ? q.client.nome : q.client} (Saldo: R$ {q.saldoDisponivel.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {linkedQuotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center py-2">
                    Nenhum orçamento vinculado a este lançamento.
                  </p>
                ) : (
                  <div className="space-y-3 divide-y divide-border/40">
                    {linkedQuotes.map((link, idx) => {
                      const q = approvedQuotes.find(item => item.id === link.quoteId);
                      const previousLinkedVal = selectedPayable && (selectedPayable as any).linkedQuotes
                        ? (selectedPayable as any).linkedQuotes.find((l: any) => l.quoteId === link.quoteId)?.valorVinculado || 0
                        : 0;
                      const realAvailable = (q?.saldoDisponivel || 0) + previousLinkedVal;
                      const hasError = link.valorVinculado > realAvailable;

                      return (
                        <div key={link.quoteId} className={`flex flex-col gap-2 pt-3 ${idx === 0 ? 'pt-0' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">Orçamento #{q?.numeroOrcamento}</span>
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  realAvailable === 0
                                    ? 'bg-red-500/10 text-red-500'
                                    : (q?.totalUtilizado || 0) > 0
                                      ? 'bg-amber-500/10 text-amber-500'
                                      : 'bg-emerald-500/10 text-emerald-500'
                                }`}>
                                  {realAvailable === 0
                                    ? 'Consumido'
                                    : (q?.totalUtilizado || 0) > 0
                                      ? 'Parcialmente Consumido'
                                      : 'Disponível'}
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Cliente: <span className="font-bold text-foreground/80">{typeof q?.client === 'object' ? q.client.nome : q?.client}</span>
                              </p>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                setLinkedQuotes(prev => prev.filter(item => item.quoteId !== link.quoteId));
                              }}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/5 p-1 rounded-lg transition-colors"
                              title="Remover vínculo"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-background/50 border border-border/40 rounded-lg p-2.5 text-[10px]">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground uppercase font-black text-[9px]">Aprovado</span>
                              <span className="font-bold text-foreground">R$ {q?.total.toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground uppercase font-black text-[9px]">Já Utilizado</span>
                              <span className="font-bold text-foreground">R$ {((q?.totalUtilizado || 0) - previousLinkedVal).toFixed(2)}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-muted-foreground uppercase font-black text-[9px]">Saldo Restante</span>
                              <span className={`font-bold ${realAvailable <= 0 ? 'text-red-500' : 'text-foreground'}`}>
                                R$ {realAvailable.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-muted-foreground uppercase font-black text-[9px]">Valor Alocado (R$) *</span>
                              <input
                                type="number"
                                step="0.01"
                                value={link.valorVinculado || ''}
                                onChange={(e) => {
                                  const newVal = Number(e.target.value);
                                  setLinkedQuotes(prev => prev.map(item => item.quoteId === link.quoteId ? { ...item, valorVinculado: newVal } : item));
                                }}
                                className={`bg-background border ${hasError ? 'border-red-500 focus:ring-red-500' : 'border-border focus:ring-primary'} rounded-md text-[11px] px-1.5 py-0.5 text-foreground focus:outline-none w-full disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-muted/30`}
                                required
                                disabled={linkedQuotes.length === 1}
                              />
                            </div>
                          </div>

                          {hasError && (
                            <p className="text-[10px] text-red-500 font-bold flex items-center gap-1 animate-pulse">
                              ⚠️ O valor alocado ultrapassa o saldo disponível do orçamento!
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Recorrência e Pagamento Automático (Apenas na Criação) */}
              {!selectedPayable && (
                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={recorrente}
                        onChange={(e) => setRecorrente(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      Despesa Recorrente?
                    </label>

                    <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={pagamentoAutomatico}
                        onChange={(e) => setPagamentoAutomatico(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      Dar Baixa Automática ao Aprovar?
                    </label>
                  </div>

                  {recorrente && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 animate-in slide-in-from-top-2">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Frequência da Recorrência</label>
                        <select 
                          value={tipoRecorrencia}
                          onChange={(e) => setTipoRecorrencia(e.target.value)}
                          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          <option value="DIARIA">Diária</option>
                          <option value="SEMANAL">Semanal</option>
                          <option value="QUINZENAL">Quinzenal</option>
                          <option value="MENSAL">Mensal</option>
                          <option value="BIMESTRAL">Bimestral</option>
                          <option value="TRIMESTRAL">Trimestral</option>
                          <option value="SEMESTRAL">Semestral</option>
                          <option value="ANUAL">Anual</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Quantidade de Parcelas (Meses)</label>
                        <input 
                          type="number" 
                          min="2"
                          max="120"
                          value={quantidadeParcelas}
                          onChange={(e) => setQuantidadeParcelas(e.target.value)}
                          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Observações */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Observações Internas</label>
                <textarea 
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Detalhamento adicional do lançamento..."
                  className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Anexar Comprovante / Arquivos */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Paperclip size={13} /> Anexos e Comprovantes (PNG, JPG, PDF - Max 5MB)
                </label>
                
                <div className="flex items-center justify-center border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-6 text-center cursor-pointer relative">
                  <input 
                    type="file" 
                    multiple 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="font-bold text-foreground">Clique para fazer upload</p>
                    <p>ou arraste os arquivos até aqui</p>
                  </div>
                </div>

                {/* Lista de Arquivos Carregados */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-secondary/40 rounded-lg border border-border/80">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={15} className="text-primary/70 shrink-0" />
                          <span className="text-xs text-foreground font-semibold truncate max-w-[150px]">{att.fileName}</span>
                        </div>
                        <button 
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-border text-foreground hover:bg-secondary transition-colors text-sm rounded-xl font-semibold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/95 transition-colors text-sm rounded-xl font-semibold shadow-xs"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* modal de detalhes do lançamento */}
      {isDetailOpen && selectedPayable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">🔍 Detalhes da Despesa</h3>
                {getStatusBadge(selectedPayable.status)}
              </div>
              <button 
                onClick={() => setIsDetailOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto max-h-[85vh]">
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Empresa</span>
                  <span className="font-bold text-foreground">{selectedPayable.company?.nomeFantasia || selectedPayable.company?.razaoSocial}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Fornecedor</span>
                  <span className="font-bold text-foreground">{selectedPayable.fornecedor}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Descrição / Objeto</span>
                  <span className="font-medium text-foreground">{selectedPayable.descricao}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Valor Total</span>
                  <span className="text-base font-black text-red-500">{formatCurrency(selectedPayable.valor)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Categoria</span>
                  <span className="font-semibold text-foreground">{selectedPayable.categoria}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Centro de Custo</span>
                  <span className="font-semibold text-foreground">{selectedPayable.centroCusto}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Data de Emissão</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedPayable.dataEmissao)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Data de Vencimento</span>
                  <span className="font-extrabold text-foreground flex items-center gap-1.5 text-xs">
                    <Calendar size={14} className="text-muted-foreground" />
                    {formatDate(selectedPayable.vencimento)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Forma de Pagamento</span>
                  <span className="font-semibold text-foreground">{selectedPayable.formaPagamento}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Responsável</span>
                  <span className="font-semibold text-foreground">{selectedPayable.responsavel}</span>
                </div>
                {selectedPayable.status === 'PAGA' && selectedPayable.dataPagamento && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Data do Pagamento (Baixa)</span>
                    <span className="font-bold text-emerald-500">{formatDate(selectedPayable.dataPagamento)}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Baixa Automática ao Aprovar?</span>
                  <span className="font-semibold text-foreground">{selectedPayable.pagamentoAutomatico ? 'Sim' : 'Não'}</span>
                </div>
              </div>

              {/* Observações */}
              {selectedPayable.observacoes && (
                <div className="p-3 bg-muted/40 border border-border rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Observações Internas</span>
                  <p className="text-xs text-foreground leading-relaxed">{selectedPayable.observacoes}</p>
                </div>
              )}

              {/* Orçamentos Vinculados */}
              {(selectedPayable as any).linkedQuotes && (selectedPayable as any).linkedQuotes.length > 0 && (
                <div className="p-4 bg-secondary/30 border border-border rounded-xl space-y-3">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                    📋 Orçamentos Aprovados Vinculados
                  </h4>
                  <div className="space-y-2">
                    {(selectedPayable as any).linkedQuotes.map((link: any) => (
                      <div key={link.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-foreground">Orçamento #{link.quote?.numeroOrcamento}</span>
                          <span className="text-[10px] text-muted-foreground">Cliente: {link.quote?.client?.nome}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">Valor Alocado</span>
                          <span className="text-xs font-black text-foreground">{formatCurrency(link.valorVinculado)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comprovantes e Anexos */}
              <div>
                <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip size={14} /> Comprovantes e Documentos Anexados
                </h4>
                {selectedPayable.attachments && selectedPayable.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedPayable.attachments.map((att) => (
                      <div key={att.id} className="flex items-center justify-between p-3 bg-secondary/40 border border-border rounded-xl">
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={16} className="text-primary" />
                          <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">{att.fileName}</span>
                        </div>
                        <a 
                          href={att.fileUrl} 
                          download={att.fileName}
                          className="text-xs font-bold text-primary hover:underline px-2.5 py-1 bg-secondary rounded-lg"
                        >
                          Baixar
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhum anexo disponível para esta despesa.</p>
                )}
              </div>

              {/* Workflow de Aprovação */}
              {selectedPayable.status === 'EM ANÁLISE' && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Workflow de Aprovação Financeira</h4>
                    <p className="text-xs text-muted-foreground">Esta despesa requer aprovação ou reprovação oficial.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleApprovalWorkflow('APPROVE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white font-semibold text-xs rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <Check size={14} /> Aprovar Lançamento
                    </button>
                    <button 
                      onClick={() => handleApprovalWorkflow('REJECT')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white font-semibold text-xs rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X size={14} /> Reprovar
                    </button>
                  </div>
                </div>
              )}

              {/* Histórico da Sequência Recorrente */}
              {selectedPayable.recorrente && selectedPayable.parentRecurrenceId && (
                <div className="border-t border-border/60 pt-4">
                  <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2.5 flex items-center gap-1.5">
                    <History size={14} /> Cadeia de Parcelas Recorrentes
                  </h4>
                  
                  {isRecurrentLoading ? (
                    <div className="text-xs text-muted-foreground">Carregando parcelas...</div>
                  ) : (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {recurrents.map((r) => (
                        <div key={r.id} className={`flex items-center justify-between p-2 rounded-lg border text-xs ${r.id === selectedPayable.id ? 'bg-primary/10 border-primary/20 font-bold' : 'bg-secondary/20 border-border/40'}`}>
                          <span className="text-foreground">Parcela {r.parcelaAtual}/{r.quantidadeParcelas}</span>
                          <span className="text-muted-foreground">{formatDate(r.vencimento)}</span>
                          <span className="font-extrabold text-foreground">{formatCurrency(r.valor)}</span>
                          <div>{getStatusBadge(r.status)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Logs de Auditoria */}
              <div className="border-t border-border/60 pt-4">
                <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5">
                  <History size={14} /> Histórico de Alterações (Auditoria)
                </h4>
                {audits.length > 0 ? (
                  <div className="space-y-3">
                    {audits.map((a) => (
                      <div key={a.id} className="text-xs leading-relaxed border-b border-border/40 pb-2.5 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between font-bold text-foreground">
                          <span className="flex items-center gap-1">
                            👤 {a.user}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {new Date(a.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-0.5">{a.changes}</p>
                        {a.comments && (
                          <p className="text-foreground font-semibold pl-2 border-l-2 border-primary mt-1 italic">
                            Observação: &quot;{a.comments}&quot;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Nenhum log de alteração registrado.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
