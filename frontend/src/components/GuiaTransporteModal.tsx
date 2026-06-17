import { useState, useRef, useEffect } from 'react';
import { 
  X, Download, Printer, Share2, History, Eye, 
  Send, Calendar, Clock, CheckCircle2, AlertCircle, FileText
} from 'lucide-react';
import { towingService } from '../services/towing.service';
import { toast } from 'sonner';
import { useGeneratePdf } from '../hooks/useGeneratePdf';
import { TowingGuiaPdfTemplate } from './TowingGuiaPdfTemplate';

interface GuiaTransporteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: any;
  company: any;
}

export function GuiaTransporteModal({ isOpen, onClose, quote, company }: GuiaTransporteModalProps) {
  const [activeTab, setActiveTab] = useState<'view' | 'actions' | 'history'>('view');
  const [guia, setGuia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Email sharing state
  const [emailInput, setEmailInput] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // PDF Ref & generatePdf hook
  const pdfRef = useRef<HTMLDivElement>(null);
  const { generatePdf, isGeneratingPdf } = useGeneratePdf();

  useEffect(() => {
    if (isOpen && quote?.id) {
      loadGuia();
    }
  }, [isOpen, quote]);

  const loadGuia = async () => {
    try {
      setLoading(true);
      const data = await towingService.getGuia(quote.id);
      setGuia(data);
      if (data && quote?.clienteEmail) {
        setEmailInput(quote.clienteEmail);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar Guia de Transporte');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!guia) return;
    const filename = `Guia_Transporte_${guia.numeroFormatado || guia.numeroGuia}.pdf`;
    try {
      await generatePdf(pdfRef.current, filename);
      const audit = await towingService.logGuiaAudit(
        guia.id, 
        'DOWNLOAD_PDF', 
        `Download do PDF da guia de transporte realizado pelo usuário.`
      );
      // Update local audits
      setGuia((prev: any) => ({
        ...prev,
        audits: [audit, ...(prev?.audits || [])]
      }));
      toast.success('PDF gerado e salvo com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handlePrint = async () => {
    if (!guia) return;
    const filename = `Guia_Transporte_${guia.numeroFormatado || guia.numeroGuia}.pdf`;
    try {
      await generatePdf(pdfRef.current, filename);
      const audit = await towingService.logGuiaAudit(
        guia.id, 
        'IMPRESSÃO', 
        `Impressão da guia de transporte acionada.`
      );
      setGuia((prev: any) => ({
        ...prev,
        audits: [audit, ...(prev?.audits || [])]
      }));
      toast.success('Guia enviada para impressão!');
    } catch (err) {
      toast.error('Erro ao abrir impressão');
    }
  };

  const handleSendEmail = async () => {
    if (!guia || !emailInput) return;
    try {
      setSendingEmail(true);
      const res = await towingService.sendGuiaEmail(guia.id, emailInput);
      toast.success(res.message || 'E-mail enviado com sucesso!');
      if (res.audit) {
        setGuia((prev: any) => ({
          ...prev,
          audits: [res.audit, ...(prev?.audits || [])]
        }));
      }
    } catch (err) {
      toast.error('Erro ao enviar e-mail');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleShareWhatsapp = async () => {
    if (!guia) return;
    
    const clientPhone = quote.clienteTelefone ? quote.clienteTelefone.replace(/\D/g, '') : '';
    const text = `Olá! Segue a Guia de Transporte *${guia.numeroFormatado || guia.numeroGuia}* vinculada ao Orçamento *${quote.numeroFormatado || quote.numeroSequencial}*.\n\n*Detalhes do Serviço:*\n- Veículo: ${quote.veiculoModelo || ''} (${quote.veiculoPlaca || ''})\n- Rota: ${quote.origemCidade || ''} -> ${quote.destinoCidade || ''}\n- Valor Total: R$ ${guia.valorTotal.toFixed(2)}`;
    
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${clientPhone}&text=${encodeURIComponent(text)}`;
    
    try {
      window.open(whatsappUrl, '_blank');
      const audit = await towingService.logGuiaAudit(
        guia.id, 
        'ENVIO_WHATSAPP', 
        `Guia compartilhada via WhatsApp para o contato: ${quote.clienteTelefone || 'Cliente'}`
      );
      setGuia((prev: any) => ({
        ...prev,
        audits: [audit, ...(prev?.audits || [])]
      }));
      toast.success('Compartilhamento via WhatsApp iniciado!');
    } catch (err) {
      toast.error('Erro ao compartilhar via WhatsApp');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-card border border-border w-full max-w-4xl h-[85vh] rounded-2xl shadow-xl flex flex-col overflow-hidden animate-slide-up">
        
        {/* MODAL HEADER */}
        <div className="p-4 border-b border-border flex justify-between items-center bg-muted/20">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FileText className="text-primary" size={20} />
              Guia de Transporte de Atendimento de Guincho
            </h3>
            {guia && (
              <p className="text-xs text-muted-foreground font-mono">
                {guia.numeroFormatado} | Ref: {quote.numeroFormatado || quote.numeroSequencial}
              </p>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* MAIN BODY LAYOUT */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* TABS SIDEBAR / NAVIGATION */}
          <div className="w-52 border-r border-border bg-muted/10 p-3 flex flex-col gap-1.5 shrink-0">
            <button
              onClick={() => setActiveTab('view')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                activeTab === 'view' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <Eye size={18} />
              Visualizar Guia
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                activeTab === 'actions' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <Share2 size={18} />
              Ações & Compartilhar
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2.5 transition ${
                activeTab === 'history' 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
              }`}
            >
              <History size={18} />
              Histórico / Auditoria
            </button>
          </div>

          {/* TAB CONTENT PANEL */}
          <div className="flex-1 p-5 overflow-y-auto bg-background flex flex-col">
            {loading ? (
              <div className="flex-1 flex flex-col justify-center items-center gap-2 text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="text-sm">Buscando informações da guia...</p>
              </div>
            ) : !guia ? (
              <div className="flex-1 flex flex-col justify-center items-center gap-3 text-center max-w-md mx-auto">
                <AlertCircle className="text-rose-500" size={40} />
                <h4 className="font-bold text-foreground text-base">Guia de Transporte não localizada</h4>
                <p className="text-sm text-muted-foreground">
                  Esta guia só é gerada automaticamente quando o orçamento de guincho correspondente é alterado para o status <strong className="text-foreground">Aprovado</strong>.
                </p>
              </div>
            ) : (
              <>
                {/* TAB 1: VIEW */}
                {activeTab === 'view' && (
                  <div className="flex-1 flex flex-col items-center justify-start gap-4">
                    <div className="w-full flex justify-end gap-2 border-b pb-3 mb-2">
                      <button 
                        onClick={handleDownload} 
                        disabled={isGeneratingPdf}
                        className="px-3.5 py-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                      >
                        <Download size={14} /> Baixar PDF
                      </button>
                      <button 
                        onClick={handlePrint}
                        disabled={isGeneratingPdf}
                        className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 text-xs font-bold rounded-lg transition flex items-center gap-1.5"
                      >
                        <Printer size={14} /> Imprimir Guia
                      </button>
                    </div>
                    
                    {/* Document Page container */}
                    <div className="border border-border rounded-xl shadow-md overflow-hidden bg-slate-100 p-4 max-h-[60vh] overflow-y-auto w-full flex justify-center">
                      <div className="bg-white p-2 shadow rounded">
                        <TowingGuiaPdfTemplate 
                          ref={pdfRef} 
                          quote={quote} 
                          guia={guia} 
                          company={company} 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ACTIONS */}
                {activeTab === 'actions' && (
                  <div className="space-y-6 max-w-xl">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground">Ações e Compartilhamento</h4>
                      <p className="text-xs text-muted-foreground">Compartilhe o atendimento de guincho diretamente com o cliente e registre na auditoria.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* PDF Actions */}
                      <button 
                        onClick={handleDownload}
                        disabled={isGeneratingPdf}
                        className="p-4 bg-muted/30 border border-border rounded-xl hover:bg-muted/60 transition active:scale-98 flex flex-col items-start text-left gap-2"
                      >
                        <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                          <Download size={20} />
                        </div>
                        <span className="font-bold text-sm text-foreground">Baixar PDF Oficial</span>
                        <span className="text-xs text-muted-foreground">Gera e realiza o download do arquivo PDF em formato A4 para arquivo interno.</span>
                      </button>

                      <button 
                        onClick={handlePrint}
                        disabled={isGeneratingPdf}
                        className="p-4 bg-muted/30 border border-border rounded-xl hover:bg-muted/60 transition active:scale-98 flex flex-col items-start text-left gap-2"
                      >
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-lg">
                          <Printer size={20} />
                        </div>
                        <span className="font-bold text-sm text-foreground">Imprimir Guia</span>
                        <span className="text-xs text-muted-foreground">Abre a tela de impressão do navegador configurado para saída física.</span>
                      </button>
                    </div>

                    <div className="border-t border-border pt-5 space-y-4">
                      {/* WhatsApp Share */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 border border-border rounded-xl gap-4">
                        <div className="space-y-1 text-left">
                          <span className="font-bold text-sm text-foreground block">Compartilhar via WhatsApp</span>
                          <span className="text-xs text-muted-foreground">Envia mensagem com os detalhes resumidos e link de consulta do serviço.</span>
                        </div>
                        <button 
                          onClick={handleShareWhatsapp}
                          className="w-full md:w-auto px-4 py-2 bg-emerald-650 text-white font-semibold text-sm rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                          style={{ backgroundColor: '#25D366' }}
                        >
                          <Share2 size={16} /> Compartilhar WhatsApp
                        </button>
                      </div>

                      {/* Email Send Form */}
                      <div className="p-4 border border-border rounded-xl space-y-3">
                        <div className="text-left">
                          <span className="font-bold text-sm text-foreground block">Enviar por E-mail</span>
                          <span className="text-xs text-muted-foreground">Encaminhe os dados formais da guia de transporte diretamente ao cliente.</span>
                        </div>
                        <div className="flex gap-2">
                          <input 
                            type="email"
                            placeholder="email@cliente.com"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            className="flex-1 bg-background border border-border px-3.5 py-2 rounded-lg text-sm focus:border-primary focus:outline-none"
                          />
                          <button 
                            onClick={handleSendEmail}
                            disabled={sendingEmail || !emailInput}
                            className="px-4 py-2 bg-primary text-white font-semibold text-sm rounded-lg hover:bg-primary/95 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                          >
                            {sendingEmail ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                              <>
                                <Send size={16} /> Enviar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: AUDITS HISTORY */}
                {activeTab === 'history' && (
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="space-y-1 text-left">
                      <h4 className="text-base font-bold text-foreground">Histórico de Auditoria</h4>
                      <p className="text-xs text-muted-foreground">Lista cronológica de eventos de emissão, download, impressão e compartilhamento da guia.</p>
                    </div>

                    <div className="flex-1 border border-border rounded-xl overflow-hidden shadow-xs bg-muted/5 p-4 overflow-y-auto max-h-[50vh]">
                      {!guia.audits || guia.audits.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Nenhum evento registrado no histórico.</p>
                      ) : (
                        <div className="relative border-l-2 border-border ml-2 pl-6 space-y-6">
                          {guia.audits.map((audit: any) => {
                            const date = new Date(audit.createdAt);
                            return (
                              <div key={audit.id} className="relative text-left">
                                {/* Dot Indicator */}
                                <div className="absolute -left-[31px] top-0.5 bg-background border-2 border-primary rounded-full p-0.5 shrink-0 flex items-center justify-center text-primary">
                                  <CheckCircle2 size={12} className="fill-background" />
                                </div>
                                <div className="space-y-1">
                                  <div className="flex justify-between items-baseline gap-4">
                                    <span className="font-bold text-sm text-foreground uppercase tracking-wide">
                                      {audit.acao.replace('_', ' ')}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                      <Calendar size={10} />
                                      {date.toLocaleDateString('pt-BR')} 
                                      <Clock size={10} className="ml-1" />
                                      {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed">{audit.detalhes || '-'}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      {/* Hidden container for PDF rendering during trigger print/download */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {guia && quote && (
          <div ref={pdfRef}>
            <TowingGuiaPdfTemplate quote={quote} guia={guia} company={company} />
          </div>
        )}
      </div>
    </div>
  );
}
