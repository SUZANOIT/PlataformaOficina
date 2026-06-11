import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, Edit3, Trash2, FileText } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { toast } from 'sonner';
import { useRef } from 'react';
import { authStorage } from '../../utils/auth';
import html2pdf from 'html2pdf.js';
import { TowingPdfTemplate } from '../../components/TowingPdfTemplate';

export function TowingQuotesList() {
  const navigate = useNavigate();
  const user = authStorage.getUser();
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // PDF state
  const pdfRef = useRef<HTMLDivElement>(null);
  const [printingQuote, setPrintingQuote] = useState<any>(null);

  useEffect(() => {
    loadQuotes();
  }, []);

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

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      try {
        await towingService.deleteQuote(id);
        toast.success('Orçamento excluído com sucesso!');
        loadQuotes();
      } catch (error) {
        toast.error('Erro ao excluir orçamento');
      }
    }
  };

  const handlePrint = async (quote: any) => {
    setPrintingQuote(quote);
    // Give react time to render the template
    setTimeout(() => {
      const element = pdfRef.current;
      if (!element) {
        setPrintingQuote(null);
        return;
      }
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Orcamento_Guincho_${quote.numeroFormatado || quote.numeroSequencial || quote.id.substring(0, 8)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        setPrintingQuote(null);
        toast.success('PDF gerado com sucesso!');
      });
    }, 500);
  };

  const filteredQuotes = quotes.filter(q => 
    q.numeroSequencial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.clienteNome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.veiculoPlaca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Truck className="text-primary" />
          Orçamentos de Guincho
        </h1>
        <Link to="/towing/quotes/new" className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors">
          <Plus size={20} />
          Novo Orçamento
        </Link>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Buscar por número, cliente ou placa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border rounded-lg focus:outline-none focus:border-primary transition-colors text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
              <tr>
                <th className="px-6 py-4 font-medium">Nº Orçamento</th>
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Cliente</th>
                <th className="px-6 py-4 font-medium">Veículo / Placa</th>
                <th className="px-6 py-4 font-medium">Origem / Destino</th>
                <th className="px-6 py-4 font-medium text-right">Valor Total</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Carregando orçamentos...
                  </td>
                </tr>
              ) : filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum orçamento de guincho encontrado.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-primary whitespace-nowrap">
                      {quote.numeroSequencial || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(quote.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{quote.clienteNome || '-'}</div>
                      <div className="text-xs text-muted-foreground">{quote.clienteTelefone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{quote.veiculoPlaca || '-'}</div>
                      <div className="text-xs text-muted-foreground">{quote.veiculoModelo}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-1 text-xs">
                        <span className="font-medium text-blue-500">De:</span> 
                        <span className="truncate max-w-[150px] block" title={quote.origemCidade}>{quote.origemCidade} - {quote.origemEstado}</span>
                      </div>
                      <div className="flex items-start gap-1 text-xs mt-1">
                        <span className="font-medium text-green-500">Para:</span>
                        <span className="truncate max-w-[150px] block" title={quote.destinoCidade}>{quote.destinoCidade} - {quote.destinoEstado}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(quote.valorTotal || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handlePrint(quote)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded transition-colors"
                          title="Imprimir PDF"
                        >
                          <FileText size={16} />
                        </button>
                        <button 
                          onClick={() => navigate(`/towing/quotes/edit/${quote.id}`)}
                          className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(quote.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
}
