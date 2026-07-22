import { Edit, Copy, Trash2, Search, Filter, Eye, Paperclip, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { QUOTE_STATUS_OPTIONS } from '../utils/constants';

export function QuotesList() {
  const [stats, setStats] = useState<any>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [vehiclePlateFilter, setVehiclePlateFilter] = useState('');
  const [showClientsDropdown, setShowClientsDropdown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  // Modal de Anexos
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [selectedQuoteForAttachment, setSelectedQuoteForAttachment] = useState<any>(null);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [nfServicoBase64, setNfServicoBase64] = useState<string>('');
  const [nfPecaBase64, setNfPecaBase64] = useState<string>('');
  const [comprovantePosBase64, setComprovantePosBase64] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAttachments = async () => {
    if (!selectedQuoteForAttachment) return;
    setUploadingAttachments(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/quotes/${selectedQuoteForAttachment.id}/attachments`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nfServicoUrl: nfServicoBase64 || undefined,
          nfPecaUrl: nfPecaBase64 || undefined,
          comprovantePosUrl: comprovantePosBase64 || undefined
        })
      });

      if (response.ok) {
        toast.success('Anexos salvos com sucesso!');
        setIsAttachmentModalOpen(false);
        fetchQuotes();
      } else {
        toast.error('Erro ao atualizar anexos.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Erro de conexão ao salvar anexos.');
    } finally {
      setUploadingAttachments(false);
    }
  };

  const clientsList = useMemo(() => {
    const map = new Map();
    quotes.forEach((q: any) => {
      if (q.client && q.client.id && q.client.nome) {
        map.set(q.client.id, q.client.nome);
      }
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [quotes]);

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
  }, [searchTerm, statusFilter, startDate, endDate, selectedCompanyId, selectedClientId, vehiclePlateFilter]);

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

    if (selectedClientId !== 'all' && quote.client?.id !== selectedClientId) {
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
    
    if (vehiclePlateFilter) {
      const cleanPlate = vehiclePlateFilter.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const quotePlate = quote.veiculoPlaca?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || '';
      if (!quotePlate.includes(cleanPlate)) {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            📋 Gestão de Orçamentos
          </h1>
          <p className="text-muted-foreground text-sm">Visualização completa de orçamentos gerados, filtragem avançada e controle de execução.</p>
        </div>
        <button 
          onClick={() => navigate('/quotes/new')}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium shadow hover:bg-primary/90 transition text-center shrink-0"
        >
          Novo Orçamento
        </button>
      </div>

      {/* Tabela de Orçamentos */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              Filtrar Orçamentos
            </h2>
            
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Número ou Termo</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm outline-none focus:border-primary transition"
                />
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* Combobox de Cliente */}
            <div className="space-y-1 relative">
              <label className="text-xs font-semibold text-muted-foreground">Cliente</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Buscar cliente..."
                  value={clientSearchTerm}
                  onChange={(e) => {
                    setClientSearchTerm(e.target.value);
                    setShowClientsDropdown(true);
                    if (!e.target.value) {
                      setSelectedClientId('all');
                    }
                  }}
                  onFocus={() => setShowClientsDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowClientsDropdown(false), 200);
                  }}
                  className="w-full bg-background border border-border rounded-lg pl-3 pr-8 py-1.5 text-sm outline-none focus:border-primary transition"
                  autoComplete="off"
                />
                {selectedClientId !== 'all' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId('all');
                      setClientSearchTerm('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground font-bold text-xs"
                    title="Limpar cliente"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showClientsDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-border/50 animate-in fade-in duration-100">
                  {clientsList
                    .filter(c => c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setClientSearchTerm(c.nome);
                          setShowClientsDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/70 transition-colors flex items-center justify-between ${
                          selectedClientId === c.id ? 'bg-primary/5 font-semibold text-primary' : 'text-foreground'
                        }`}
                      >
                        {c.nome}
                      </button>
                    ))}
                  {clientsList.filter(c => c.nome.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">
                      Nenhum cliente encontrado
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Placa Veículo</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Ex: ABC1D23"
                  value={vehiclePlateFilter}
                  onChange={(e) => setVehiclePlateFilter(e.target.value.toUpperCase())}
                  className="w-full bg-background border border-border rounded-lg pl-3 pr-3 py-1.5 text-sm outline-none focus:border-primary transition"
                />
              </div>
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

        <div className="w-full overflow-x-auto scrollbar-thin">
          <table className="w-full text-left border-collapse table-fixed break-words min-w-[950px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-sm">
                <th className="py-4 pl-4 pr-2 font-medium w-[100px]">Nº</th>
                <th className="p-4 font-medium hidden md:table-cell w-[22%]">Empresa Emitente</th>
                <th className="p-4 font-medium w-[25%]">Cliente</th>
                <th className="p-4 font-medium hidden lg:table-cell w-[110px]">Data</th>
                <th className="p-4 font-medium hidden xl:table-cell w-[150px]">Status</th>
                <th className="p-4 font-medium w-[130px]">Valor Total</th>
                <th className="p-4 font-medium w-[160px] text-center lg:text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedQuotes.map((quote: any) => (
                <tr key={quote.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                  <td className="py-4 pl-4 pr-2 font-semibold text-primary truncate">
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
                  <td className="p-4">
                    <div className="flex gap-1.5 justify-center lg:justify-start items-center">
                      <button 
                        onClick={() => navigate(`/quotes/view/${quote.id}`)}
                        className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg hover:bg-emerald-500/25 transition active:scale-95 duration-150 flex items-center justify-center"
                        title="Visualizar"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => navigate(`/quotes/edit/${quote.id}`)}
                        className="p-2 bg-blue-500/10 text-blue-600 rounded-lg hover:bg-blue-500/25 transition active:scale-95 duration-150 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-blue-500/10"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      {quote.status === 'Pago' && (
                        <button 
                          onClick={() => {
                            setSelectedQuoteForAttachment(quote);
                            setNfServicoBase64(quote.nfServicoUrl || '');
                            setNfPecaBase64(quote.nfPecaUrl || '');
                            setComprovantePosBase64(quote.comprovantePosUrl || '');
                            setIsAttachmentModalOpen(true);
                          }}
                          className="p-2 bg-sky-500/10 text-sky-600 rounded-lg hover:bg-sky-500/25 transition active:scale-95 duration-150 flex items-center justify-center"
                          title="Anexar Comprovantes"
                        >
                          <Paperclip size={16} />
                        </button>
                      )}
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
                    </div>
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

      {isAttachmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg border border-border">
            <div className="flex justify-between items-center p-4 border-b border-border">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-primary" />
                Anexos de Faturamento
              </h2>
              <button onClick={() => setIsAttachmentModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nota Fiscal de Serviço (PDF ou Imagem)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={(e) => handleFileChange(e, setNfServicoBase64)}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {nfServicoBase64 && (
                  <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                    <Upload size={12} /> Arquivo Selecionado/Enviado
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nota Fiscal de Peça (PDF ou Imagem)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={(e) => handleFileChange(e, setNfPecaBase64)}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {nfPecaBase64 && (
                  <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                    <Upload size={12} /> Arquivo Selecionado/Enviado
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Comprovante POS Cielo (PDF ou Imagem)</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf" 
                  onChange={(e) => handleFileChange(e, setComprovantePosBase64)}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
                {comprovantePosBase64 && (
                  <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                    <Upload size={12} /> Arquivo Selecionado/Enviado
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20">
              <button 
                onClick={() => setIsAttachmentModalOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-border rounded-lg bg-background hover:bg-muted"
                disabled={uploadingAttachments}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveAttachments}
                disabled={uploadingAttachments}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
              >
                {uploadingAttachments ? 'Salvando...' : 'Salvar Anexos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
