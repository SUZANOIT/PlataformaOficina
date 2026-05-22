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
  History,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface Attachment {
  id?: string;
  fileName: string;
  fileType: string;
  fileUrl: string; // Base64
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

interface Receivable {
  id: string;
  companyId: string;
  company?: { nomeFantasia: string; razaoSocial: string };
  cliente: string;
  categoria: string;
  descricao: string;
  valor: number;
  dataEmissao: string;
  vencimento: string;
  dataRecebimento?: string | null;
  formaRecebimento: string;
  responsavel: string;
  observacoes?: string | null;
  status: string;
  quoteId?: string | null;
  quote?: { id: string; numeroOrcamento: number } | null;
  attachments: Attachment[];
}

export function FinancialReceivables() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals & Active State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [audits, setAudits] = useState<Audit[]>([]);

  // Form Fields
  const [companyId, setCompanyId] = useState('');
  const [cliente, setCliente] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataEmissao, setDataEmissao] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState('');
  const [formaRecebimento, setFormaRecebimento] = useState('Pix');
  const [responsavel, setResponsavel] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState('PENDENTE');
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Fetch Companies, Quotes & Receivables
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

  const fetchApprovedQuotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/quotes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const approved = data.filter((q: any) => q.status === 'Aprovado');
        setQuotes(approved);
      }
    } catch (err) {
      console.error('Failed to fetch approved quotes:', err);
    }
  };

  const fetchReceivables = async () => {
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

      const res = await fetch(`/financial/receivables?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReceivables(data.receivables);
        setTotalCount(data.totalCount);
      } else {
        toast.error('Erro ao listar contas a receber.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro na conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchApprovedQuotes();
  }, []);

  useEffect(() => {
    fetchReceivables();
  }, [page, search, statusFilter, companyFilter, categoryFilter]);

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
    setSelectedReceivable(null);
    setCompanyId(companies[0]?.id || '');
    setCliente('');
    setCategoria('');
    setDescricao('');
    setValor('');
    
    // Default dates (today)
    const todayStr = new Date().toISOString().substring(0, 10);
    setDataEmissao(todayStr);
    setVencimento(todayStr);
    setDataRecebimento('');
    setFormaRecebimento('Pix');
    setResponsavel('');
    setObservacoes('');
    setStatus('PENDENTE');
    setSelectedQuoteId('');
    setAttachments([]);
    setIsFormOpen(true);
  };

  // Open Form for Edit
  const handleEditOpen = (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setCompanyId(receivable.companyId);
    setCliente(receivable.cliente);
    setCategoria(receivable.categoria);
    setDescricao(receivable.descricao);
    setValor(String(receivable.valor));
    setDataEmissao(receivable.dataEmissao.substring(0, 10));
    setVencimento(receivable.vencimento.substring(0, 10));
    setDataRecebimento(receivable.dataRecebimento ? receivable.dataRecebimento.substring(0, 10) : '');
    setFormaRecebimento(receivable.formaRecebimento);
    setResponsavel(receivable.responsavel);
    setObservacoes(receivable.observacoes || '');
    setStatus(receivable.status);
    setSelectedQuoteId(receivable.quoteId || '');
    setAttachments(receivable.attachments || []);
    setIsFormOpen(true);
  };

  const handleQuoteChange = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    if (!quoteId) return;

    const selected = quotes.find(q => q.id === quoteId);
    if (selected) {
      setCliente(selected.client?.nome || '');
      setValor(String(selected.total || ''));
      setDescricao(`Faturamento ref. Orçamento #${selected.numeroOrcamento}`);
      setCompanyId(selected.companyId || '');
      setCategoria('Serviços Mecânicos');
      toast.info(`Preenchido automaticamente com dados do Orçamento #${selected.numeroOrcamento}!`);
    }
  };

  // Save / Update Account Receivable
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId || !cliente || !categoria || !valor || !dataEmissao || !vencimento || !responsavel) {
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

    const payload = {
      companyId,
      cliente,
      categoria,
      descricao,
      valor: Number(valor),
      dataEmissao,
      vencimento,
      dataRecebimento: status === 'RECEBIDA' ? (dataRecebimento || new Date()) : null,
      formaRecebimento,
      responsavel,
      observacoes,
      status,
      quoteId: selectedQuoteId || null,
      attachments
    };

    try {
      const url = selectedReceivable ? `/financial/receivables/${selectedReceivable.id}` : '/financial/receivables';
      const method = selectedReceivable ? 'PUT' : 'POST';

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
        toast.success(selectedReceivable ? 'Receita atualizada com sucesso!' : 'Receita criada com sucesso!');
        setIsFormOpen(false);
        fetchReceivables();
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Erro ao salvar receita.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao salvar.');
    }
  };

  // Delete Account
  const handleDelete = async (receivable: Receivable) => {
    if (!window.confirm('Tem certeza que deseja excluir esta receita?')) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/financial/receivables/${receivable.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        toast.success('Lançamento de receita excluído com sucesso.');
        fetchReceivables();
      } else {
        toast.error('Erro ao deletar lançamento.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro na conexão com o servidor.');
    }
  };

  // View Details
  const handleViewDetails = async (receivable: Receivable) => {
    setSelectedReceivable(receivable);
    setIsDetailOpen(true);
    setAudits([]);

    const token = localStorage.getItem('token');

    // Fetch audits
    try {
      const res = await fetch(`/financial/audits?receivableId=${receivable.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const auditData = await res.json();
        setAudits(auditData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Workflow Approval Handler
  const handleApprovalWorkflow = async (action: 'APPROVE' | 'REJECT') => {
    if (!selectedReceivable) return;
    const token = localStorage.getItem('token');

    const comment = window.prompt(`Digite uma observação para esta aprovação/reprovação:`);
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
      const res = await fetch(`/financial/approve/${selectedReceivable.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-email': userEmail
        },
        body: JSON.stringify({
          type: 'RECEBER',
          action,
          comments: comment
        })
      });

      if (res.ok) {
        toast.success(action === 'APPROVE' ? 'Receita aprovada!' : 'Receita reprovada.');
        setIsDetailOpen(false);
        fetchReceivables();
      } else {
        toast.error('Falha no fluxo de aprovação.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro de conexão ao processar.');
    }
  };

  // Status Badge Colors Helper
  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'RECEBIDA':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-500 uppercase tracking-wider">Recebida</span>;
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
            📈 Contas a Receber (Receitas)
          </h1>
          <p className="text-muted-foreground text-sm">Controle de receitas, faturamento de serviços e conciliação.</p>
        </div>

        <button 
          onClick={handleCreateOpen}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-xl hover:bg-primary/95 transition-all shadow-sm shrink-0"
        >
          <Plus size={16} /> Novo Recebimento
        </button>
      </div>

      {/* Advanced Filters Panel */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input 
            type="text"
            placeholder="Buscar cliente, ref..."
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
          <option value="RECEBIDA">Recebida</option>
          <option value="CANCELADA">Cancelada</option>
        </select>

        <select 
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
        >
          <option value="">Todas as Categorias</option>
          <option value="Serviços Mecânicos">Serviços Mecânicos</option>
          <option value="Serviços Funilaria">Serviços Funilaria</option>
          <option value="Venda de Peças">Venda de Peças</option>
          <option value="Contrato Mensal">Contrato Mensal</option>
          <option value="Rendimento Aplicações">Rendimento Aplicações</option>
          <option value="Outros">Outros</option>
        </select>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm">
            <RefreshCw size={24} className="animate-spin mb-3 text-primary" />
            <span>Processando receitas...</span>
          </div>
        ) : receivables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground text-sm space-y-2">
            <span>Nenhuma receita localizada com estes filtros.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-4">Empresa</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Descrição</th>
                  <th className="p-4 text-right">Valor</th>
                  <th className="p-4">Vencimento</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Comp.</th>
                  <th className="p-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {receivables.map((r) => (
                  <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 font-semibold text-foreground truncate max-w-[140px]">
                      {r.company?.nomeFantasia || r.company?.razaoSocial}
                    </td>
                    <td className="p-4 font-medium text-foreground">
                      <div>{r.cliente}</div>
                      {r.quote && (
                        <div className="text-[10px] text-primary font-bold flex items-center gap-1 mt-0.5" title="Orçamento vinculado">
                          📋 Ref. Orçamento #{r.quote.numeroOrcamento}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">{r.descricao}</td>
                    <td className="p-4 text-right font-extrabold text-foreground">{formatCurrency(r.valor)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <Calendar size={13} className="text-muted-foreground" />
                        {formatDate(r.vencimento)}
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(r.status)}</td>
                    <td className="p-4">
                      {r.attachments && r.attachments.length > 0 ? (
                        <div className="flex items-center text-primary" title={`${r.attachments.length} anexo(s)`}>
                          <Paperclip size={14} />
                          <span className="text-[10px] font-bold ml-0.5">{r.attachments.length}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => handleViewDetails(r)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Ver detalhes"
                        >
                          <Eye size={15} />
                        </button>
                        <button 
                          onClick={() => handleEditOpen(r)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Editar"
                        >
                          <Edit size={15} />
                        </button>
                        <button 
                          onClick={() => handleDelete(r)}
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
            <span className="text-xs text-muted-foreground">Mostrando {receivables.length} de {totalCount} receitas</span>
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
                {selectedReceivable ? '✏️ Editar Receita' : '➕ Novo Lançamento de Receita'}
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              
              {/* Vínculo de Orçamento */}
              <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-2">
                <label className="text-xs font-bold text-primary uppercase flex items-center gap-1.5">
                  📋 Vincular Orçamento Aprovado (Opcional)
                </label>
                <select
                  value={selectedQuoteId}
                  onChange={(e) => handleQuoteChange(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                >
                  <option value="">Nenhum orçamento vinculado</option>
                  {quotes.map((q: any) => (
                    <option key={q.id} value={q.id}>
                      Orçamento #{q.numeroOrcamento} - {q.client?.nome} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(q.total)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Selecionar um orçamento aprovado irá auto-preencher Cliente, Valor, Descrição e Empresa de forma inteligente.
                </p>
              </div>

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

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Cliente *</label>
                  <input 
                    type="text" 
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nome do cliente corporativo ou particular"
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Categoria de Receita *</label>
                  <select 
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="Serviços Mecânicos">Serviços Mecânicos</option>
                    <option value="Serviços Funilaria">Serviços Funilaria</option>
                    <option value="Venda de Peças">Venda de Peças</option>
                    <option value="Contrato Mensal">Contrato Mensal</option>
                    <option value="Rendimento Aplicações">Rendimento Aplicações</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1 text-sm md:col-span-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Descrição / Faturamento</label>
                  <input 
                    type="text" 
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="E.g. Manutenção de frota de veículos"
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Valor a Receber (R$) *</label>
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
                  <label className="text-xs font-bold text-muted-foreground uppercase">Meio de Recebimento</label>
                  <select 
                    value={formaRecebimento}
                    onChange={(e) => setFormaRecebimento(e.target.value)}
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
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
                    <option value="RECEBIDA">Recebida (Conciliada)</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted-foreground uppercase">Responsável *</label>
                  <input 
                    type="text" 
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Colaborador que efetuou a cobrança"
                    className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>

                {status === 'RECEBIDA' && (
                  <div className="flex flex-col gap-1 animate-in slide-in-from-top-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Data do Recebimento</label>
                    <input 
                      type="date" 
                      value={dataRecebimento}
                      onChange={(e) => setDataRecebimento(e.target.value)}
                      className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted-foreground uppercase">Observações do Recebimento</label>
                <textarea 
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Detalhamento do adiantamento ou faturamento..."
                  className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none h-16 resize-none"
                />
              </div>

              {/* Anexos */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Paperclip size={13} /> Comprovante de Transferência / Nota Fiscal (Max 5MB)
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
                    <p>ou arraste os arquivos</p>
                  </div>
                </div>

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

      {/* modal de detalhes */}
      {isDetailOpen && selectedReceivable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col my-8">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">🔍 Detalhes da Receita</h3>
                {getStatusBadge(selectedReceivable.status)}
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
                  <span className="font-bold text-foreground">{selectedReceivable.company?.nomeFantasia || selectedReceivable.company?.razaoSocial}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Cliente</span>
                  <span className="font-bold text-foreground">{selectedReceivable.cliente}</span>
                </div>
                {selectedReceivable.quote && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Orçamento Vinculado</span>
                    <span className="font-extrabold text-primary flex items-center gap-1">
                      📋 Orçamento #{selectedReceivable.quote.numeroOrcamento}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Descrição</span>
                  <span className="font-medium text-foreground">{selectedReceivable.descricao}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Valor Estimado</span>
                  <span className="text-base font-black text-emerald-500">{formatCurrency(selectedReceivable.valor)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Categoria</span>
                  <span className="font-semibold text-foreground">{selectedReceivable.categoria}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Data de Emissão</span>
                  <span className="font-semibold text-foreground">{formatDate(selectedReceivable.dataEmissao)}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Data de Vencimento</span>
                  <span className="font-extrabold text-foreground flex items-center gap-1.5 text-xs">
                    <Calendar size={14} className="text-muted-foreground" />
                    {formatDate(selectedReceivable.vencimento)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Meio de Recebimento</span>
                  <span className="font-semibold text-foreground">{selectedReceivable.formaRecebimento}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Responsável</span>
                  <span className="font-semibold text-foreground">{selectedReceivable.responsavel}</span>
                </div>
                {selectedReceivable.status === 'RECEBIDA' && selectedReceivable.dataRecebimento && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Data da Conciliação</span>
                    <span className="font-bold text-emerald-500">{formatDate(selectedReceivable.dataRecebimento)}</span>
                  </div>
                )}
              </div>

              {/* Observações */}
              {selectedReceivable.observacoes && (
                <div className="p-3 bg-muted/40 border border-border rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block mb-1">Observações do Recebimento</span>
                  <p className="text-xs text-foreground leading-relaxed">{selectedReceivable.observacoes}</p>
                </div>
              )}

              {/* Anexos */}
              <div>
                <h4 className="font-bold text-xs uppercase text-muted-foreground tracking-wider mb-2 flex items-center gap-1.5">
                  <Paperclip size={14} /> Anexos e Notas Fiscais
                </h4>
                {selectedReceivable.attachments && selectedReceivable.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedReceivable.attachments.map((att) => (
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
                  <p className="text-xs text-muted-foreground italic">Nenhum anexo disponível para esta receita.</p>
                )}
              </div>

              {/* Workflow de Aprovação */}
              {selectedReceivable.status === 'EM ANÁLISE' && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Workflow de Aprovação Financeira</h4>
                    <p className="text-xs text-muted-foreground">Esta receita requer aprovação de lançamento.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleApprovalWorkflow('APPROVE')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white font-semibold text-xs rounded-lg hover:bg-emerald-600 transition-colors"
                    >
                      <Check size={14} /> Confirmar Recebimento
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
