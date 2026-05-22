import { useState, useEffect } from 'react';
import { 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  RefreshCw,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface FinancialRecord {
  id: string;
  type: 'RECEITA' | 'DESPESA';
  companyName: string;
  party: string;
  categoria: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: string;
}

export function FinancialReports() {
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // DRE Aggregations
  const [dreData, setDreData] = useState<{
    receitas: Record<string, number>;
    despesas: Record<string, number>;
    totalReceitas: number;
    totalDespesas: number;
    resultado: number;
  }>({
    receitas: {},
    despesas: {},
    totalReceitas: 0,
    totalDespesas: 0,
    resultado: 0
  });
  const [reportTab, setReportTab] = useState<'DRE' | 'BUDGET'>('DRE');
  const [approvedQuotes, setApprovedQuotes] = useState<any[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [selectedQuoteDetail, setSelectedQuoteDetail] = useState<any | null>(null);
  const [linkedPayables, setLinkedPayables] = useState<any[]>([]);
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

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('token');

      // Build params
      const params = new URLSearchParams();
      if (selectedCompanyId) params.append('companyId', selectedCompanyId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      // Fetch consolidated details using dashboard endpoint
      const res = await fetch(`/financial/dashboard?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        
        // Build DRE structures from API graphs and totals
        const graficos = data.graficos;
        const kpis = data.kpis;

        setDreData({
          receitas: graficos.receitasPorCategoria || {},
          despesas: graficos.despesasPorCategoria || {},
          totalReceitas: kpis.recebimentosRealizados,
          totalDespesas: kpis.despesasPagas,
          resultado: kpis.saldoLiquido
        });

        // Let's also fetch actual lists for the transaction detail appendix
        const [payablesRes, receivablesRes] = await Promise.all([
          fetch(`/financial/payables?limit=150&${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`/financial/receivables?limit=150&${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        let items: FinancialRecord[] = [];

        if (payablesRes.ok) {
          const payData = await payablesRes.json();
          const pItems = payData.payables.map((p: any) => ({
            id: p.id,
            type: 'DESPESA' as const,
            companyName: p.company?.nomeFantasia || p.company?.razaoSocial || 'Empresa',
            party: p.fornecedor,
            categoria: p.categoria,
            descricao: p.descricao,
            valor: p.valor,
            vencimento: p.vencimento,
            status: p.status
          }));
          items = [...items, ...pItems];
        }

        if (receivablesRes.ok) {
          const recData = await receivablesRes.json();
          const rItems = recData.receivables.map((r: any) => ({
            id: r.id,
            type: 'RECEITA' as const,
            companyName: r.company?.nomeFantasia || r.company?.razaoSocial || 'Empresa',
            party: r.cliente,
            categoria: r.categoria,
            descricao: r.descricao,
            valor: r.valor,
            vencimento: r.vencimento,
            status: r.status
          }));
          items = [...items, ...rItems];
        }

        // Sort by due date
        items.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime());
        setRecords(items);

      } else {
        toast.error('Erro ao gerar DRE / Fluxo consolidado.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao contatar servidor de relatórios.');
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

  const fetchQuoteReportData = async () => {
    if (!selectedQuoteId) {
      setSelectedQuoteDetail(null);
      setLinkedPayables([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const q = approvedQuotes.find(item => item.id === selectedQuoteId);
      if (q) {
        setSelectedQuoteDetail(q);
      }

      const res = await fetch(`/financial/payables?limit=200&quoteId=${selectedQuoteId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLinkedPayables(data.payables || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao buscar contas vinculadas ao orçamento.');
    }
  };

  useEffect(() => {
    if (reportTab === 'BUDGET') {
      fetchApprovedQuotes();
    }
  }, [reportTab]);

  useEffect(() => {
    if (reportTab === 'BUDGET') {
      fetchQuoteReportData();
    }
  }, [selectedQuoteId, reportTab, approvedQuotes]);

  useEffect(() => {
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedCompanyId, startDate, endDate]);

  // Export CSV dynamic builder
  const exportToCSV = () => {
    if (records.length === 0) {
      toast.warning('Não há dados para exportar.');
      return;
    }

    // CSV Headers
    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility
    csvContent += 'Tipo;Empresa;Beneficiário/Pagador;Categoria;Descrição;Valor;Vencimento;Status\r\n';

    records.forEach(r => {
      const line = [
        r.type,
        r.companyName,
        r.party,
        r.categoria,
        r.descricao.replace(/;/g, ','),
        r.valor.toFixed(2).replace('.', ','),
        new Date(r.vencimento).toLocaleDateString('pt-BR'),
        r.status
      ].join(';');
      csvContent += line + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_financeiro_${selectedCompanyId || 'consolidado'}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório CSV exportado com sucesso!');
  };

  const exportBudgetToCSV = () => {
    if (!selectedQuoteDetail) {
      toast.warning('Selecione um orçamento para exportar.');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += `Relatório do Orçamento #${selectedQuoteDetail.numeroOrcamento}\r\n`;
    csvContent += `Cliente;${selectedQuoteDetail.client?.nome || 'Cliente'}\r\n`;
    csvContent += `Valor Total Aprovado;R$ ${selectedQuoteDetail.total.toFixed(2)}\r\n`;
    csvContent += `Total Utilizado em Contas a Pagar;R$ ${selectedQuoteDetail.totalUtilizado.toFixed(2)}\r\n`;
    csvContent += `Saldo Disponível;R$ ${selectedQuoteDetail.saldoDisponivel.toFixed(2)}\r\n\r\n`;

    csvContent += 'Fornecedor;Categoria;Descrição;Vencimento;Valor Alocado;Status\r\n';

    linkedPayables.forEach(p => {
      const allocatedVal = p.linkedQuotes?.find((l: any) => l.quoteId === selectedQuoteId)?.valorVinculado || 0;
      const line = [
        p.fornecedor,
        p.categoria,
        p.descricao.replace(/;/g, ','),
        new Date(p.vencimento).toLocaleDateString('pt-BR'),
        allocatedVal.toFixed(2).replace('.', ','),
        p.status
      ].join(';');
      csvContent += line + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_orcamento_${selectedQuoteDetail.numeroOrcamento}_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório do orçamento exportado com sucesso!');
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      
      {/* CSS customizado para ocultação de menus na impressão PDF do browser */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          /* Oculta Sidebars, Navegações, Cabeçalhos dinâmicos e botões de filtro */
          aside, nav, header, button, select, input, .no-print, toast {
            display: none !important;
          }
          /* Ajusta largura do main container */
          main, .print-container {
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
          }
          .bg-card {
            border: 1px solid #ccc !important;
            background: transparent !important;
            box-shadow: none !important;
          }
          table {
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #ddd !important;
            padding: 8px !important;
          }
        }
      `}</style>

      {/* Header / Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            📊 Relatórios & Execução Financeira
          </h1>
          <p className="text-muted-foreground text-sm">Demonstrativos estruturados de DRE consolidado e execução orçamentária detalhada.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={reportTab === 'DRE' ? exportToCSV : exportBudgetToCSV}
            className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground text-sm rounded-lg hover:bg-muted font-bold transition-all shadow-xs"
          >
            <Download size={14} /> Exportar Planilha (CSV)
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/95 font-bold transition-all shadow-xs"
          >
            <Printer size={14} /> Imprimir Relatório (PDF)
          </button>
        </div>
      </div>

      {/* Abas de Seleção de Relatório */}
      <div className="flex border-b border-border/80 no-print gap-1.5">
        <button
          onClick={() => setReportTab('DRE')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${reportTab === 'DRE' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          📊 DRE Financeiro Consolidado
        </button>
        <button
          onClick={() => setReportTab('BUDGET')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-all ${reportTab === 'BUDGET' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
        >
          📋 Relatório por Orçamento
        </button>
      </div>

      {/* Toolbar de Filtros DRE */}
      {reportTab === 'DRE' && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-3 no-print">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Empresa</label>
            <select 
              value={selectedCompanyId} 
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            >
              <option value="">Consolidado Geral</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Data Inicial</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Data Final</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div className="flex items-end">
            <button 
              onClick={fetchReportData}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-sm rounded-lg text-foreground font-semibold hover:bg-muted transition-colors"
            >
              <RefreshCw size={14} /> Atualizar Filtros
            </button>
          </div>
        </div>
      )}

      {/* Toolbar de Filtros por Orçamento */}
      {reportTab === 'BUDGET' && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-2 gap-3 no-print">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase">Selecione o Orçamento Aprovado</label>
            <select
              value={selectedQuoteId}
              onChange={(e) => setSelectedQuoteId(e.target.value)}
              className="bg-background border border-border rounded-lg text-sm px-3 py-2 text-foreground focus:ring-1 focus:ring-primary focus:outline-none w-full"
            >
              <option value="">Selecione um orçamento...</option>
              {approvedQuotes.map(q => (
                <option key={q.id} value={q.id}>
                  Orçamento #{q.numeroOrcamento} - Cliente: {q.client?.nome || 'Sem Cliente'} (Saldo: {formatCurrency(q.saldoDisponivel)})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Relatório Imprimível */}
      <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xs print:border-none print:shadow-none print-container space-y-6">
        
        {reportTab === 'DRE' ? (
          <>
            {/* Cabeçalho do PDF Imprimível */}
            <div className="border-b border-border/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-extrabold text-foreground">DEMONSTRATIVO DO RESULTADO DO EXERCÍCIO (DRE)</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Empresa: <span className="font-bold text-foreground">{selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.nomeFantasia || 'Filtro Selecionado' : 'Consolidado Geral'}</span>
                </p>
                {startDate || endDate ? (
                  <p className="text-xs text-muted-foreground">
                    Período: <span className="font-bold text-foreground">{startDate ? new Date(startDate).toLocaleDateString('pt-BR') : 'Início'}</span> até <span className="font-bold text-foreground">{endDate ? new Date(endDate).toLocaleDateString('pt-BR') : 'Fim'}</span>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Período: Histórico Consolidado Completo</p>
                )}
              </div>
              <div className="text-right text-xs text-muted-foreground/80">
                <p>Gerado em: <span className="font-bold text-foreground">{new Date().toLocaleString('pt-BR')}</span></p>
                <p>Status base: <span className="font-bold text-emerald-500">LIQUIDADO (Realizado)</span></p>
              </div>
            </div>

            {/* Estrutura DRE Padrão */}
            <div className="space-y-4">
              {/* 1. Receitas de Operação */}
              <div>
                <div className="flex items-center justify-between border-b border-border/80 pb-2 text-sm font-black text-foreground bg-secondary/30 px-3 py-2 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp size={16} className="text-emerald-500" />
                    1. RECEITA OPERACIONAL BRUTA (FATURAMENTO)
                  </span>
                  <span className="text-emerald-500">{formatCurrency(dreData.totalReceitas)}</span>
                </div>
                
                <div className="mt-2 pl-6 space-y-1.5 text-xs text-muted-foreground">
                  {Object.entries(dreData.receitas).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between border-b border-border/20 pb-1">
                      <span>(+) {cat}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(val)}</span>
                    </div>
                  ))}
                  {Object.keys(dreData.receitas).length === 0 && (
                    <p className="italic">Nenhum faturamento operado</p>
                  )}
                </div>
              </div>

              {/* 3. Despesas de Operação */}
              <div className="pt-2">
                <div className="flex items-center justify-between border-b border-border/80 pb-2 text-sm font-black text-foreground bg-secondary/30 px-3 py-2 rounded-lg">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown size={16} className="text-red-500" />
                    2. (-) DESPESAS OPERACIONAIS
                  </span>
                  <span className="text-red-500">({formatCurrency(dreData.totalDespesas)})</span>
                </div>
                
                <div className="mt-2 pl-6 space-y-1.5 text-xs text-muted-foreground">
                  {Object.entries(dreData.despesas).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between border-b border-border/20 pb-1">
                      <span>(-) {cat}</span>
                      <span className="font-semibold text-foreground">{formatCurrency(val)}</span>
                    </div>
                  ))}
                  {Object.keys(dreData.despesas).length === 0 && (
                    <p className="italic">Nenhuma despesa operada no período</p>
                  )}
                </div>
              </div>

              {/* 4. Resultado Líquido EBITDA */}
              <div className="pt-4">
                <div className={`flex items-center justify-between border-2 p-4 rounded-xl text-base font-black ${dreData.resultado >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                  <span className="flex items-center gap-2">
                    <DollarSign size={20} />
                    RESULTADO LÍQUIDO DO PERÍODO
                  </span>
                  <span>{formatCurrency(dreData.resultado)}</span>
                </div>
              </div>
            </div>

            {/* Rodapé DRE - Assinaturas em Impressão */}
            <div className="hidden print:flex justify-around items-center pt-20 text-center text-xs">
              <div className="w-1/3 border-t border-border/80 pt-2 font-bold text-foreground">
                Diretoria Financeira
              </div>
              <div className="w-1/3 border-t border-border/80 pt-2 font-bold text-foreground">
                Controladoria Interna
              </div>
            </div>

            {/* ANEXO: Detalhamento Físico de Transações em Impressão */}
            <div className="border-t border-border/60 pt-6">
              <h3 className="text-xs font-black uppercase text-muted-foreground tracking-wider mb-4 flex items-center gap-1.5">
                <FileText size={15} /> Apêndice: Livro Caixa Consolidado (Títulos Lançados)
              </h3>
              
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/80 font-bold uppercase text-[9px] text-muted-foreground">
                    <th className="p-2.5">Tipo</th>
                    <th className="p-2.5">Empresa</th>
                    <th className="p-2.5">Fornecedor/Cliente</th>
                    <th className="p-2.5">Categoria</th>
                    <th className="p-2.5">Vencimento</th>
                    <th className="p-2.5 text-right">Valor</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                      <td className="p-2.5 font-bold">
                        <span className={r.type === 'RECEITA' ? 'text-emerald-500' : 'text-red-500'}>{r.type}</span>
                      </td>
                      <td className="p-2.5 font-medium text-foreground truncate max-w-[120px]">{r.companyName}</td>
                      <td className="p-2.5 font-medium text-foreground">{r.party}</td>
                      <td className="p-2.5 text-muted-foreground">{r.categoria}</td>
                      <td className="p-2.5">{formatDate(r.vencimento)}</td>
                      <td className="p-2.5 text-right font-bold text-foreground">{formatCurrency(r.valor)}</td>
                      <td className="p-2.5 font-semibold text-foreground uppercase text-[9px]">{r.status}</td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-muted-foreground italic">Nenhum lançamento no livro caixa</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            {/* Resumo do Orçamento */}
            {selectedQuoteDetail ? (
              <div className="space-y-6">
                <div className="border-b border-border/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-extrabold text-foreground">RELATÓRIO DE EXECUÇÃO ORÇAMENTÁRIA</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Orçamento: <span className="font-bold text-foreground">#{selectedQuoteDetail.numeroOrcamento}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Cliente: <span className="font-bold text-foreground">{selectedQuoteDetail.client?.nome || 'N/A'}</span>
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground/80">
                    <p>Gerado em: <span className="font-bold text-foreground">{new Date().toLocaleString('pt-BR')}</span></p>
                    <p>Status: <span className="font-bold text-emerald-500 uppercase">{selectedQuoteDetail.status}</span></p>
                  </div>
                </div>

                {/* Métricas do Orçamento */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-secondary/20 border border-border p-4 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Aprovado</span>
                    <span className="text-lg font-black text-foreground">{formatCurrency(selectedQuoteDetail.total)}</span>
                  </div>
                  <div className="bg-secondary/20 border border-border p-4 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Total Utilizado</span>
                    <span className="text-lg font-black text-red-500">{formatCurrency(selectedQuoteDetail.totalUtilizado)}</span>
                  </div>
                  <div className="bg-secondary/20 border border-border p-4 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider block">Saldo Restante Disponível</span>
                    <span className={`text-lg font-black ${selectedQuoteDetail.saldoDisponivel <= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {formatCurrency(selectedQuoteDetail.saldoDisponivel)}
                    </span>
                  </div>
                </div>

                {/* Detalhamento das Contas a Pagar Vinculadas */}
                <div className="pt-4">
                  <h3 className="text-xs font-black uppercase text-muted-foreground tracking-wider mb-4 flex items-center gap-1.5">
                    <FileText size={15} /> Contas a Pagar Vinculadas ao Orçamento
                  </h3>
                  
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border/80 font-bold uppercase text-[9px] text-muted-foreground">
                        <th className="p-2.5">Fornecedor</th>
                        <th className="p-2.5">Categoria</th>
                        <th className="p-2.5">Descrição / Objeto</th>
                        <th className="p-2.5">Vencimento</th>
                        <th className="p-2.5 text-right">Valor Alocado</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedPayables.map((p) => {
                        const allocatedVal = p.linkedQuotes?.find((l: any) => l.quoteId === selectedQuoteId)?.valorVinculado || 0;
                        return (
                          <tr key={p.id} className="border-b border-border/40 hover:bg-secondary/10 transition-colors">
                            <td className="p-2.5 font-bold text-foreground">{p.fornecedor}</td>
                            <td className="p-2.5 text-muted-foreground">{p.categoria}</td>
                            <td className="p-2.5 font-medium text-foreground">{p.descricao}</td>
                            <td className="p-2.5">{formatDate(p.vencimento)}</td>
                            <td className="p-2.5 text-right font-bold text-foreground">{formatCurrency(allocatedVal)}</td>
                            <td className="p-2.5 font-semibold text-foreground uppercase text-[9px]">{p.status}</td>
                          </tr>
                        );
                      })}
                      {linkedPayables.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-muted-foreground italic">
                            Nenhum lançamento de Contas a Pagar vinculado a este orçamento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground italic">
                Por favor, selecione um orçamento no menu superior para gerar o demonstrativo.
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
