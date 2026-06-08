import { useState, useEffect } from 'react';
import { 
  CheckSquare, 
  Lock, 
  Unlock, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  AlertCircle,
  Users,
  ArrowRight,
  X,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

interface ClosingItem {
  collaboratorId: string;
  nome: string;
  salario: number;
  faltasCount: number;
  faltasDesconto: number;
  adiantamentos: number;
  saldoLiquido: number;
}

interface ClosingResponse {
  items: ClosingItem[];
  totals: {
    salarios: number;
    descontos: number;
    adiantamentos: number;
    saldos: number;
  };
  status: 'ABERTO' | 'FECHADO';
}

export function MonthlyClosing() {
  const [loading, setLoading] = useState(true);
  const [closingData, setClosingData] = useState<ClosingResponse | null>(null);
  
  // Date Selection
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Confirm Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [submittingClose, setSubmittingClose] = useState(false);

  // Drilldown Detail Modal State
  const [detailItem, setDetailItem] = useState<ClosingItem | null>(null);
  const [detailAbsences, setDetailAbsences] = useState<any[]>([]);
  const [detailAdvances, setDetailAdvances] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchClosingData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rh/closing', {
        params: {
          month: selectedMonth,
          year: selectedYear
        }
      });
      setClosingData(response.data);
    } catch (error) {
      console.error('Error fetching closing data', error);
      toast.error('Não foi possível carregar a consolidação de fechamento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClosingData();
  }, [selectedMonth, selectedYear]);

  // Load detailed absences & advances for the selected collaborator
  const handleOpenDetails = async (item: ClosingItem) => {
    setDetailItem(item);
    setLoadingDetails(true);
    try {
      // 1. Fetch collaborator absences
      const absRes = await api.get('/rh/absences');
      // Filter for this month/year and this collaborator
      const collabAbs = absRes.data.filter((a: any) => {
        const date = new Date(a.dataFalta);
        const matchCollab = a.collaboratorId === item.collaboratorId;
        const matchMonth = (date.getUTCMonth() + 1) === selectedMonth;
        const matchYear = date.getUTCFullYear() === selectedYear;
        return matchCollab && matchMonth && matchYear;
      });
      setDetailAbsences(collabAbs);

      // 2. Fetch collaborator advances
      const advRes = await api.get(`/registry/collaborators/${item.collaboratorId}/advances`);
      // Filter for this month/year
      const collabAdv = advRes.data.filter((a: any) => {
        const date = new Date(a.data);
        const matchMonth = (date.getUTCMonth() + 1) === selectedMonth;
        const matchYear = date.getUTCFullYear() === selectedYear;
        return matchMonth && matchYear;
      });
      setDetailAdvances(collabAdv);
    } catch (error) {
      console.error('Error loading detail drilldown', error);
      toast.error('Erro ao buscar detalhes do colaborador.');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleCloseMonth = async () => {
    try {
      setSubmittingClose(true);
      await api.post('/rh/closing', {
        month: selectedMonth,
        year: selectedYear
      });
      toast.success('Competência fechada com sucesso! Lançamentos de folha gerados no financeiro.');
      setIsConfirmOpen(false);
      fetchClosingData();
    } catch (error: any) {
      console.error('Error closing month', error);
      toast.error(error.response?.data?.error || 'Erro ao processar fechamento da folha.');
    } finally {
      setSubmittingClose(false);
    }
  };

  const monthsList = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const yearsList = [
    new Date().getFullYear() - 1,
    new Date().getFullYear(),
    new Date().getFullYear() + 1
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <CheckSquare className="text-primary" size={28} />
            <span>Fechamento Mensal de Folha</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Consolidação de salários, adiantamentos e faltas do período. Realize o fechamento contábil.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border/80 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar size={16} className="text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent font-semibold text-sm text-foreground focus:outline-none"
            >
              {monthsList.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-semibold text-sm text-foreground focus:outline-none ml-1"
            >
              {yearsList.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {closingData && (
            closingData.status === 'FECHADO' ? (
              <span className="flex items-center gap-1.5 px-4 py-2 bg-slate-500/10 text-slate-500 border border-slate-500/20 text-sm font-semibold rounded-xl">
                <Lock size={16} />
                <span>Competência Fechada</span>
              </span>
            ) : (
              <button
                onClick={() => setIsConfirmOpen(true)}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:bg-primary/95 transition duration-150 transform hover:-translate-y-0.5"
              >
                <Unlock size={16} />
                <span>Fechar Competência</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* KPI Consolidation Dashboard */}
      {closingData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Folha de Salários Bruta</p>
              <h3 className="text-2xl font-bold mt-0.5">
                R$ {closingData.totals.salarios.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total de Descontos Faltas</p>
              <h3 className="text-2xl font-bold mt-0.5 text-red-500">
                R$ {closingData.totals.descontos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Adiantamentos Concedidos</p>
              <h3 className="text-2xl font-bold mt-0.5 text-amber-500">
                R$ {closingData.totals.adiantamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>

          <div className="bg-card border border-border/60 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Saldo Líquido a Pagar</p>
              <h3 className="text-2xl font-bold mt-0.5 text-emerald-500">
                R$ {closingData.totals.saldos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid Table */}
      <div className="bg-card border border-border/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
              <span>Consolidando dados da folha...</span>
            </div>
          ) : !closingData || closingData.items.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <AlertCircle className="mx-auto text-muted-foreground/30 mb-2" size={40} />
              <p>Nenhum colaborador com salário parametrizado nesta competência.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase bg-secondary/10">
                  <th className="p-4">Colaborador</th>
                  <th className="p-4">Salário Base</th>
                  <th className="p-4 text-center">Nº Faltas</th>
                  <th className="p-4">Desconto Faltas</th>
                  <th className="p-4">Adiantamentos</th>
                  <th className="p-4">Saldo Líquido</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {closingData.items.map((item) => (
                  <tr key={item.collaboratorId} className="hover:bg-secondary/10 transition-colors">
                    <td className="p-4 font-bold text-foreground">
                      {item.nome}
                    </td>
                    <td className="p-4">
                      R$ {item.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center font-semibold">
                      {item.faltasCount > 0 ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold">
                          {item.faltasCount}
                        </span>
                      ) : (
                        <span className="opacity-40">0</span>
                      )}
                    </td>
                    <td className="p-4 text-rose-500 font-medium">
                      R$ {item.faltasDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-amber-500 font-medium">
                      R$ {item.adiantamentos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 font-extrabold text-emerald-500">
                      R$ {item.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleOpenDetails(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition"
                      >
                        <span>Detalhamento</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm Month Close Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <Lock size={32} />
                <h3 className="text-lg font-bold text-foreground">Confirmar Fechamento de Folha</h3>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed">
                Você está prestes a fechar a folha de pagamento de <strong>{monthsList.find(m => m.value === selectedMonth)?.label} de {selectedYear}</strong>.
              </p>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 space-y-2 text-xs text-amber-600 dark:text-amber-500">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertCircle size={14} />
                  <span>Atenção para as regras de fechamento:</span>
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Todas as faltas e adiantamentos deste mês serão bloqueados para alterações.</li>
                  <li>Novos lançamentos retroativos nesta competência serão desabilitados.</li>
                  <li>Lançamentos automáticos de Contas a Pagar serão gerados no financeiro para o <strong>dia 05 do mês subsequente</strong>, referentes ao saldo líquido de cada colaborador.</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-border/40">
                <button
                  type="button"
                  onClick={() => setIsConfirmOpen(false)}
                  className="px-4 py-2 border border-border/80 text-muted-foreground rounded-xl text-sm font-semibold hover:bg-secondary transition"
                  disabled={submittingClose}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCloseMonth}
                  className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition flex items-center gap-1.5 shadow-md shadow-primary/20"
                  disabled={submittingClose}
                >
                  {submittingClose ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    <span>Fechar Mês</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Details Modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-secondary/10">
              <div>
                <h2 className="text-xl font-bold text-foreground">{detailItem.nome}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Detalhamento Financeiro - {monthsList.find(m => m.value === selectedMonth)?.label} / {selectedYear}</p>
              </div>
              <button 
                onClick={() => setDetailItem(null)}
                className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Formula Panel */}
              <div className="bg-secondary/10 border border-border/60 rounded-2xl p-5 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fórmula de Cálculo do Saldo</h4>
                <div className="grid grid-cols-4 gap-2 text-center items-center">
                  <div className="bg-card border border-border/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Salário Base</span>
                    <span className="font-bold text-foreground text-xs sm:text-sm">R$ {detailItem.salario.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="text-muted-foreground font-semibold text-lg">-</div>
                  <div className="bg-card border border-border/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Desconto Faltas</span>
                    <span className="font-bold text-red-500 text-xs sm:text-sm">R$ {detailItem.faltasDesconto.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="text-muted-foreground font-semibold text-lg">-</div>
                  <div className="bg-card border border-border/40 p-2.5 rounded-xl">
                    <span className="text-[10px] text-muted-foreground block uppercase font-medium">Adiantamentos</span>
                    <span className="font-bold text-amber-500 text-xs sm:text-sm">R$ {detailItem.adiantamentos.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="text-muted-foreground font-semibold text-lg">=</div>
                  <div className="bg-card border border-primary/20 p-2.5 rounded-xl col-span-2">
                    <span className="text-[10px] text-primary block uppercase font-extrabold">Saldo Líquido</span>
                    <span className="font-black text-emerald-500 text-sm sm:text-base">R$ {detailItem.saldoLiquido.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              {loadingDetails ? (
                <div className="py-10 flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <span>Carregando detalhamento de lançamentos...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Absences */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <AlertCircle size={16} className="text-red-500" />
                      <span>Faltas Não Justificadas ({detailAbsences.length})</span>
                    </h4>
                    <div className="border border-border/60 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      {detailAbsences.length === 0 ? (
                        <p className="p-4 text-xs text-muted-foreground italic text-center">Nenhuma falta não justificada registrada.</p>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-secondary/15 border-b border-border/40 text-muted-foreground font-medium uppercase text-[10px]">
                              <th className="p-2">Data</th>
                              <th className="p-2">Observações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {detailAbsences.map((a) => (
                              <tr key={a.id} className="hover:bg-secondary/5">
                                <td className="p-2 font-bold whitespace-nowrap">
                                  {new Date(a.dataFalta).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </td>
                                <td className="p-2 text-muted-foreground truncate max-w-[120px]" title={a.observacao || ''}>
                                  {a.observacao || 'N/A'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Advances */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <DollarSign size={16} className="text-amber-500" />
                      <span>Adiantamentos Concedidos ({detailAdvances.length})</span>
                    </h4>
                    <div className="border border-border/60 rounded-xl overflow-hidden max-h-[220px] overflow-y-auto">
                      {detailAdvances.length === 0 ? (
                        <p className="p-4 text-xs text-muted-foreground italic text-center">Nenhum adiantamento concedido.</p>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-secondary/15 border-b border-border/40 text-muted-foreground font-medium uppercase text-[10px]">
                              <th className="p-2">Data</th>
                              <th className="p-2">Forma</th>
                              <th className="p-2 text-right">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {detailAdvances.map((a) => (
                              <tr key={a.id} className="hover:bg-secondary/5">
                                <td className="p-2 font-bold">
                                  {new Date(a.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                </td>
                                <td className="p-2">{a.formaPagamento}</td>
                                <td className="p-2 text-right font-bold text-foreground">
                                  R$ {a.valor.toLocaleString('pt-BR')}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t border-border/60 bg-secondary/5">
              <button
                type="button"
                onClick={() => setDetailItem(null)}
                className="px-5 py-2 bg-secondary text-foreground hover:bg-secondary/80 border border-border/70 rounded-xl text-sm font-semibold transition"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
