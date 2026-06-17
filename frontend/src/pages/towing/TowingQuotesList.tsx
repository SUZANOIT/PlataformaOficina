import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Truck, Plus, Search, ClipboardCheck, CheckCircle2, DollarSign, RefreshCw 
} from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { toast } from 'sonner';
import { authStorage } from '../../utils/auth';
import { TowingPdfTemplate } from '../../components/TowingPdfTemplate';
import { useGeneratePdf } from '../../hooks/useGeneratePdf';
import { GuiaTransporteModal } from '../../components/GuiaTransporteModal';
import { TableActionMenu } from '../../components/ui/TableActionMenu';
import { TablePagination } from '../../components/ui/TablePagination';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

export function TowingQuotesList() {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  
  // PDF state
  const pdfRef = useRef<HTMLDivElement>(null);
  const [printingQuote, setPrintingQuote] = useState<any>(null);
  const { generatePdf } = useGeneratePdf();

  const [selectedQuoteForGuia, setSelectedQuoteForGuia] = useState<any>(null);
  const [isGuiaModalOpen, setIsGuiaModalOpen] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete modal state
  const [quoteToDelete, setQuoteToDelete] = useState<any>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const data = await towingService.listQuotes();
      setQuotes(data);
    } catch (error) {
      toast.error('Erro ao carregar orçamentos de guincho');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await towingService.deleteQuote(id);
      toast.success('Orçamento excluído com sucesso!');
      loadQuotes();
    } catch (error) {
      toast.error('Erro ao excluir orçamento');
    }
  };

  const handlePrint = async (quote: any) => {
    setPrintingQuote(quote);
    // Give react time to render the template
    setTimeout(async () => {
      const element = pdfRef.current;
      if (!element) {
        setPrintingQuote(null);
        return;
      }
      
      const filename = `Orcamento_Guincho_${quote.numeroFormatado || quote.numeroSequencial || quote.id.substring(0, 8)}.pdf`;
      
      try {
        await generatePdf(element, filename);
      } catch (error) {
        console.error(error);
        toast.error('Erro ao gerar PDF');
      } finally {
        setPrintingQuote(null);
      }
    }, 500);
  };

  // Filter logic
  const filteredQuotes = quotes.filter(q => {
    // Status Filter
    if (statusFilter !== 'Todos') {
      const qStatus = q.status || 'Orçamento';
      if (statusFilter === 'Orçamento' && q.status && q.status !== 'Orçamento') return false;
      if (statusFilter !== 'Orçamento' && qStatus.toLowerCase() !== statusFilter.toLowerCase()) return false;
    }

    // Search query
    const term = searchTerm.toLowerCase();
    return (
      q.numeroFormatado?.toLowerCase().includes(term) ||
      q.numeroSequencial?.toString().includes(term) ||
      q.clienteNome?.toLowerCase().includes(term) ||
      q.veiculoPlaca?.toLowerCase().includes(term) ||
      q.veiculoModelo?.toLowerCase().includes(term)
    );
  });

  // Pagination calculations
  const totalCount = filteredQuotes.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const paginatedQuotes = filteredQuotes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate Metrics
  const totalCountAll = quotes.length;
  const approvedQuotes = quotes.filter(q => q.status === 'Aprovado');
  const approvedCount = approvedQuotes.length;
  const approvedRatio = totalCountAll > 0 ? (approvedCount / totalCountAll) * 100 : 0;
  
  const estimatedRevenue = quotes
    .filter(q => q.status === 'Aprovado' || q.status === 'Pago' || q.status === 'Emitir Nota Fiscal')
    .reduce((sum, q) => sum + (q.valorTotal || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER PAGE SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-card border border-border p-5 rounded-2xl shadow-sm gap-4">
        <div className="space-y-1 text-left">
          <h1 className="text-xl font-black text-foreground flex items-center gap-2.5">
            <Truck className="text-primary" size={24} />
            Orçamentos de Guincho
          </h1>
          <p className="text-xs text-muted-foreground">
            Gerencie cotações de transporte, envie propostas e visualize guias de transporte autorizadas.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button 
            onClick={loadQuotes}
            className="p-2 border border-border hover:bg-muted text-muted-foreground rounded-lg transition active:scale-95 flex items-center justify-center"
            title="Atualizar Lista"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link 
            to="/towing/quotes/new" 
            className="flex-1 md:flex-none bg-primary text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-primary/95 font-semibold text-sm transition shadow-sm"
          >
            <Plus size={18} />
            Novo Orçamento
          </Link>
        </div>
      </div>

      {/* METRICS DASHBOARD PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric Card 1 */}
        <div className="bg-card border border-border p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl shrink-0">
            <Truck size={22} />
          </div>
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Total de Orçamentos</span>
            <span className="text-2xl font-black text-foreground">{totalCountAll}</span>
            <span className="text-[10px] text-muted-foreground block">Cadastrados no sistema</span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-card border border-border p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Orçamentos Aprovados</span>
            <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
            <span className="text-[10px] text-muted-foreground block">{approvedRatio.toFixed(0)}% taxa de conversão</span>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-card border border-border p-4.5 rounded-2xl shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl shrink-0">
            <DollarSign size={22} />
          </div>
          <div className="space-y-0.5 text-left">
            <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">Faturamento Estimado</span>
            <span className="text-2xl font-black text-blue-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(estimatedRevenue)}
            </span>
            <span className="text-[10px] text-muted-foreground block">Dos serviços aprovados ou pagos</span>
          </div>
        </div>
      </div>

      {/* FILTER & TABLE AREA */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
        
        {/* FILTER BAR CONTAINER */}
        <div className="p-4 border-b border-border bg-muted/10 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input Box */}
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
            <input
              type="text"
              placeholder="Buscar por número, cliente ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg focus:outline-none focus:border-primary transition-colors text-xs placeholder:text-muted-foreground"
            />
          </div>

          {/* Segmented Status Tab Selector */}
          <div className="flex border border-border rounded-lg p-0.5 bg-muted/40 w-full md:w-auto overflow-x-auto select-none">
            {['Todos', 'Orçamento', 'Aprovado', 'Rejeitado'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 md:flex-none px-3.5 py-1 rounded-md text-xs font-bold transition whitespace-nowrap ${
                  statusFilter === status 
                    ? 'bg-background text-foreground shadow-xs' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* LIST TABLE PANEL (TABLE FIXED & RESPONSIVE HIDING) */}
        <div className="overflow-x-auto w-full">
          <table className="w-full table-fixed min-w-[700px] text-sm text-left border-collapse">
            <thead className="text-[10px] text-muted-foreground uppercase bg-muted/20 border-b border-border tracking-wider font-extrabold">
              <tr>
                <th className="px-5 py-3.5 font-bold w-[15%]">Nº Orçamento</th>
                <th className="px-5 py-3.5 font-bold w-[12%] hidden sm:table-cell">Data</th>
                <th className="px-5 py-3.5 font-bold w-[23%]">Cliente</th>
                <th className="px-5 py-3.5 font-bold w-[18%] hidden md:table-cell">Veículo</th>
                <th className="px-5 py-3.5 font-bold w-[18%] hidden lg:table-cell">Rota</th>
                <th className="px-5 py-3.5 font-bold w-[14%] text-right">Valor Total</th>
                <th className="px-5 py-3.5 font-bold w-[15%] text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      <span className="text-xs">Carregando cotações de guincho...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground text-xs">
                    Nenhum orçamento de guincho localizado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginatedQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-muted/15 transition-colors group">
                    
                    {/* ID & STATUS BADGE */}
                    <td className="px-5 py-3.5 font-semibold text-primary whitespace-nowrap text-xs">
                      <div className="truncate font-mono tracking-tight font-bold">{quote.numeroFormatado || quote.numeroSequencial || '-'}</div>
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase mt-1.5 tracking-wider ${
                        quote.status === 'Aprovado'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : quote.status === 'Rejeitado'
                          ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                      }`}>
                        {quote.status || 'Orçamento'}
                      </span>
                    </td>

                    {/* DATE */}
                    <td className="px-5 py-3.5 text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    {/* CLIENT INFO */}
                    <td className="px-5 py-3.5 text-xs">
                      <div className="font-semibold text-foreground truncate max-w-[170px]" title={quote.clienteNome}>
                        {quote.clienteNome || '-'}
                      </div>
                      <div className="text-muted-foreground font-mono text-[10px] mt-0.5">
                        {quote.clienteTelefone || '—'}
                      </div>
                    </td>

                    {/* VEHICLE INFO */}
                    <td className="px-5 py-3.5 text-xs hidden md:table-cell">
                      <div className="font-mono font-bold text-foreground truncate max-w-[130px]">{quote.veiculoPlaca || '-'}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[130px] mt-0.5">{quote.veiculoModelo || '—'}</div>
                    </td>

                    {/* ROUTE INFO */}
                    <td className="px-5 py-3.5 text-xs hidden lg:table-cell">
                      <div className="flex items-center gap-1 text-[11px] text-foreground truncate max-w-[140px]" title={`Origem: ${quote.origemCidade}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="truncate">{quote.origemCidade || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-foreground truncate max-w-[140px] mt-1" title={`Destino: ${quote.destinoCidade}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">{quote.destinoCidade || '—'}</span>
                      </div>
                    </td>

                    {/* TOTAL VALUE */}
                    <td className="px-5 py-3.5 text-right font-bold text-foreground text-xs whitespace-nowrap">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.valorTotal || 0)}
                    </td>

                    {/* ACTION BUTTONS */}
                    <td className="px-5 py-3.5 text-right">
                      <TableActionMenu
                        onEdit={() => navigate(`/towing/quotes/edit/${quote.id}`)}
                        onPrint={() => handlePrint(quote)}
                        onDelete={() => setQuoteToDelete(quote)}
                        extraActions={
                          quote.status === 'Aprovado' ? [
                            {
                              label: 'Guia de Transporte',
                              icon: <ClipboardCheck size={14} />,
                              onClick: () => {
                                setSelectedQuoteForGuia(quote);
                                setIsGuiaModalOpen(true);
                              },
                              className: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                            }
                          ] : []
                        }
                      />
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          totalCount={totalCount}
        />
      </div>
      
      {/* Hidden container for PDF rendering */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {printingQuote && (
          <TowingPdfTemplate 
            ref={pdfRef} 
            quote={printingQuote} 
            company={user?.company}
          />
        )}
      </div>

      <GuiaTransporteModal 
        isOpen={isGuiaModalOpen}
        onClose={() => {
          setIsGuiaModalOpen(false);
          setSelectedQuoteForGuia(null);
        }}
        quote={selectedQuoteForGuia}
        company={user?.company}
      />

      {/* CONFIRMATION DIALOG */}
      <ConfirmModal
        isOpen={!!quoteToDelete}
        onClose={() => setQuoteToDelete(null)}
        onConfirm={() => {
          if (quoteToDelete) confirmDelete(quoteToDelete.id);
        }}
        title="Confirmar Exclusão"
        message={`Tem certeza que deseja excluir o orçamento ${quoteToDelete?.numeroFormatado || quoteToDelete?.numeroSequencial || ''}? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        isDanger={true}
      />
    </div>
  );
}
