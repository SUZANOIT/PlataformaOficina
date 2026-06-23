import { useState, useEffect, useRef } from 'react';
import { DollarSign, Save, Edit3, History, FileDown, ArrowRight, User, Calendar, X } from 'lucide-react';
import { towingService } from '../../services/towing.service';
import { authStorage } from '../../utils/auth';
import { toast } from 'sonner';
import html2pdf from 'html2pdf.js';
import { TowingRatesPdfTemplate } from '../../components/TowingRatesPdfTemplate';

export function TowingRates() {
  const user = authStorage.getUser();
  const company = user?.company;

  const [rates, setRates] = useState<any[]>([]);
  const [towingTypes, setTowingTypes] = useState<any[]>([]);
  const [, setLoading] = useState(true);

  // Form Data
  const [formData, setFormData] = useState({
    id: '',
    towingTypeId: '',
    taxaSaida: 0,
    valorKm: 0,
    valorHoraParada: 0,
    status: 'ATIVO'
  });

  // History State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedRateForHistory, setSelectedRateForHistory] = useState<any>(null);

  // PDF Printing Reference
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ratesData, typesData] = await Promise.all([
        towingService.listRates(),
        towingService.listTowingTypes()
      ]);
      setRates(ratesData);
      setTowingTypes(typesData);

      // Auto-set first towing type in form if none selected
      if (typesData.length > 0) {
        setFormData(prev => ({
          ...prev,
          towingTypeId: prev.towingTypeId || typesData[0].id
        }));
      }
    } catch (error) {
      toast.error('Erro ao carregar taxas e tipos de guincho');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.towingTypeId) {
      toast.error('Selecione um Tipo de Guincho para vincular à tabela.');
      return;
    }

    try {
      await towingService.saveRate({
        towingTypeId: formData.towingTypeId,
        taxaSaida: Number(formData.taxaSaida),
        valorKm: Number(formData.valorKm),
        valorHoraParada: Number(formData.valorHoraParada),
        status: formData.status
      });
      toast.success('Taxa salva com sucesso!');
      loadData();
      setFormData({
        id: '',
        towingTypeId: towingTypes[0]?.id || '',
        taxaSaida: 0,
        valorKm: 0,
        valorHoraParada: 0,
        status: 'ATIVO'
      });
    } catch (error) {
      toast.error('Erro ao salvar taxa de frete');
    }
  };

  const handleEdit = (rate: any) => {
    setFormData({
      id: rate.id,
      towingTypeId: rate.towingTypeId || '',
      taxaSaida: rate.taxaSaida,
      valorKm: rate.valorKm,
      valorHoraParada: rate.valorHoraParada,
      status: rate.status || 'ATIVO'
    });
  };

  const handleViewHistory = async (rate: any) => {
    setSelectedRateForHistory(rate);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const historyData = await towingService.getRateHistory(rate.id);
      setRateHistory(historyData);
    } catch (error) {
      toast.error('Erro ao carregar histórico de alterações');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCloseModals = () => {
    setIsHistoryModalOpen(false);
    setSelectedRateForHistory(null);
    setRateHistory([]);
  };

  const handlePrintPdf = () => {
    setIsGeneratingPdf(true);
    toast.loading('Gerando PDF...', { id: 'pdf-tabela' });
    setTimeout(() => {
      const element = pdfRef.current;
      if (!element) {
        setIsGeneratingPdf(false);
        toast.dismiss('pdf-tabela');
        return;
      }

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `Tabela_Frete_Guinchos_${new Date().getFullYear()}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        setIsGeneratingPdf(false);
        toast.success('PDF exportado com sucesso!', { id: 'pdf-tabela' });
      }).catch((err: any) => {
        console.error(err);
        setIsGeneratingPdf(false);
        toast.error('Erro ao gerar PDF.', { id: 'pdf-tabela' });
      });
    }, 500);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
            <DollarSign className="text-primary" />
            Tabelas de Frete
          </h1>
          <p className="text-muted-foreground text-sm">Defina os valores padrão por tipo de guincho e acesse os históricos.</p>
        </div>
        <button
          onClick={handlePrintPdf}
          disabled={isGeneratingPdf || rates.length === 0}
          className="flex items-center gap-2 bg-secondary hover:bg-muted text-foreground px-4 py-2.5 rounded-lg border border-border text-sm font-semibold transition shadow-sm disabled:opacity-50"
        >
          <FileDown size={18} />
          <span>Exportar PDF</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário de Cadastro/Edição */}
        <div className="lg:col-span-1 bg-card border rounded-xl p-5 shadow-sm h-fit space-y-4">
          <h2 className="font-bold text-foreground text-lg border-b pb-2">
            {formData.id ? 'Editar Tarifa' : 'Nova Tarifa de Frete'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">Tipo de Guincho Vinculado <span className="text-red-500">*</span></label>
              <select
                value={formData.towingTypeId}
                onChange={e => setFormData({ ...formData, towingTypeId: e.target.value })}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm text-foreground"
                required
              >
                <option value="" disabled>Selecione o tipo...</option>
                {towingTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">Taxa de Saída (R$) <span className="text-red-500">*</span></label>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={formData.taxaSaida}
                onChange={e => setFormData({ ...formData, taxaSaida: Number(e.target.value) })}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">Valor por KM (R$) <span className="text-red-500">*</span></label>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={formData.valorKm}
                onChange={e => setFormData({ ...formData, valorKm: Number(e.target.value) })}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">Valor Hora Parada (R$) <span className="text-red-500">*</span></label>
              <input 
                type="number"
                step="0.01"
                min="0"
                value={formData.valorHoraParada}
                onChange={e => setFormData({ ...formData, valorHoraParada: Number(e.target.value) })}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm text-foreground"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-foreground uppercase tracking-wide">Status</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-background border rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-sm text-foreground"
              >
                <option value="ATIVO">Ativo</option>
                <option value="INATIVO">Inativo</option>
              </select>
            </div>

            <button type="submit" className="w-full bg-primary text-primary-foreground py-2 rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-primary/95 transition shadow-sm">
              <Save size={16} /> Salvar Tarifa
            </button>
          </form>
        </div>

        {/* Tabela de Tarifas Cadastradas */}
        <div className="lg:col-span-2 bg-card border rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 font-semibold border-b">
              <tr>
                <th className="px-5 py-3.5 font-medium">Tipo Guincho</th>
                <th className="px-5 py-3.5 font-medium text-right">Taxa Saída</th>
                <th className="px-5 py-3.5 font-medium text-right">Valor KM</th>
                <th className="px-5 py-3.5 font-medium text-right">Hora Parada</th>
                <th className="px-5 py-3.5 font-medium text-center">Status</th>
                <th className="px-5 py-3.5 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rates.map(r => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-700">{r.towingType?.name || r.tipoGuincho}</td>
                  <td className="px-5 py-3.5 text-right font-medium">R$ {Number(r.taxaSaida).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right font-medium">R$ {Number(r.valorKm).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-right font-medium">R$ {Number(r.valorHoraParada).toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                    }`}>
                      {r.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex gap-1.5 justify-end">
                      <button 
                        onClick={() => handleViewHistory(r)} 
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        title="Ver Histórico"
                      >
                        <History size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(r)} 
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        title="Editar"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rates.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground italic">Nenhuma tabela cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Histórico */}
      {isHistoryModalOpen && selectedRateForHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 relative my-8">
            <button 
              onClick={handleCloseModals}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition z-50"
            >
              <X size={18} />
            </button>
            <div className="p-6 border-b border-border bg-muted/20">
              <div className="flex items-center gap-2">
                <History className="text-primary" size={22} />
                <h3 className="text-lg font-bold text-foreground">
                  Histórico de Tarifas: <span className="text-primary font-black">{selectedRateForHistory.towingType?.name || selectedRateForHistory.tipoGuincho}</span>
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {historyLoading ? (
                <p className="text-center text-muted-foreground py-6 text-sm">Carregando histórico...</p>
              ) : rateHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm italic">Nenhum histórico encontrado para esta tarifa.</p>
              ) : (
                <div className="space-y-4">
                  {rateHistory.map((h, index) => (
                    <div key={h.id || index} className="border border-border/80 p-4 rounded-xl space-y-3 bg-muted/10 relative">
                      <div className="flex flex-wrap justify-between items-center gap-2 text-xs border-b border-border/60 pb-2">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                          <User size={13} className="text-primary" /> {h.userName}
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <Calendar size={13} /> {new Date(h.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-card p-2 rounded border border-border/50">
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Taxa de Saída</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-muted-foreground">R$ {h.taxaSaidaAnterior.toFixed(2)}</span>
                            <ArrowRight size={10} className="text-slate-400" />
                            <span className="font-bold text-slate-800">R$ {h.taxaSaidaNova.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="bg-card p-2 rounded border border-border/50">
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Valor por KM</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-muted-foreground">R$ {h.valorKmAnterior.toFixed(2)}</span>
                            <ArrowRight size={10} className="text-slate-400" />
                            <span className="font-bold text-slate-800">R$ {h.valorKmNovo.toFixed(2)}</span>
                          </div>
                        </div>

                        <div className="bg-card p-2 rounded border border-border/50">
                          <span className="text-[10px] text-muted-foreground block font-bold uppercase">Hora Parada</span>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-muted-foreground">R$ {h.valorHoraParadaAnterior.toFixed(2)}</span>
                            <ArrowRight size={10} className="text-slate-400" />
                            <span className="font-bold text-slate-800">R$ {h.valorHoraParadaNovo.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {h.statusNovo && h.statusAnterior !== h.statusNovo && (
                        <div className="flex items-center gap-2 text-xs pt-1.5 border-t border-border/40">
                          <span className="text-muted-foreground font-semibold">Status:</span>
                          <span className="text-muted-foreground font-mono">{h.statusAnterior}</span>
                          <ArrowRight size={10} className="text-slate-400" />
                          <span className={`px-2 py-0.2 rounded font-bold ${
                            h.statusNovo === 'ATIVO' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {h.statusNovo}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-4 border-t border-border bg-muted/10">
              <button
                onClick={handleCloseModals}
                className="px-5 py-2 bg-secondary text-foreground hover:bg-muted border border-border rounded-lg text-sm font-semibold transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden container for PDF rendering */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {rates.length > 0 && (
          <TowingRatesPdfTemplate 
            ref={pdfRef} 
            rates={rates} 
            company={company}
          />
        )}
      </div>
    </div>
  );
}
