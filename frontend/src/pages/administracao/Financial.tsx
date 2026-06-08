import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Percent, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  Download
} from 'lucide-react';
import { toast } from 'sonner';

interface FinancialData {
  receitaMensal: number;
  receitaAnual: number;
  ticketMedio: number;
  ltv: number;
  cac: number;
  fluxoCaixa: {
    receitas: number;
    despesas: number;
    saldo: number;
  };
  inadimplenciaPercent: number;
  faturamentos: Array<{
    id: string;
    tenant: string;
    plano: string;
    valor: number;
    formaPagamento: string;
    status: 'PAGO' | 'PENDENTE' | 'ATRASADO';
    dataVencimento: string;
    dataPagamento?: string;
  }>;
}

export function Financial() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await SaaSAPIService.getFinancialStats();
      setData(res);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados financeiros do SaaS.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAGO': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'PENDENTE': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'ATRASADO': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  // Exportar dados como CSV
  const handleExportCSV = () => {
    if (!data || data.faturamentos.length === 0) return;
    const headers = ['Fatura ID', 'Cliente (Tenant)', 'Plano', 'Valor', 'Metodo Pagamento', 'Vencimento', 'Status'];
    const rows = data.faturamentos.map(f => [
      f.id,
      f.tenant,
      f.plano,
      f.valor,
      f.formaPagamento,
      new Date(f.dataVencimento).toLocaleDateString('pt-BR'),
      f.status
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financeiro_faturas_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Relatório CSV de faturas baixado!');
  };

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-xs text-slate-400">Carregando métricas financeiras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Financeiro SaaS</h2>
          <p className="text-xs text-slate-400">Acompanhe métricas de faturamento recorrente, ticket médio, LTV e recebíveis de boletos/Pix/cartões.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-800 transition w-full sm:w-auto"
        >
          <Download size={14} />
          <span>Exportar Relatório</span>
        </button>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">MRR (Mensal Recorrente)</span>
            <DollarSign size={15} className="text-indigo-400" />
          </div>
          <div className="space-y-0.5 mt-3">
            <h3 className="text-lg font-black text-white">{formatCurrency(data.receitaMensal)}</h3>
            <span className="text-[9px] text-indigo-400 font-extrabold flex items-center gap-1">
              <ArrowUpRight size={10} />
              +12.4% vs mês anterior
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">ARR (Projeção Anual)</span>
            <TrendingUp size={15} className="text-emerald-400" />
          </div>
          <div className="space-y-0.5 mt-3">
            <h3 className="text-lg font-black text-white">{formatCurrency(data.receitaAnual)}</h3>
            <span className="text-[9px] text-slate-500 font-bold block">12x do MRR consolidado</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">LTV (LifeTime Value)</span>
            <Users size={15} className="text-purple-400" />
          </div>
          <div className="space-y-0.5 mt-3">
            <h3 className="text-lg font-black text-white">{formatCurrency(data.ltv)}</h3>
            <span className="text-[9px] text-slate-500 font-bold block">Retenção média estimada de 18m</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">CAC (Custo Aquisição)</span>
            <Percent size={15} className="text-amber-400" />
          </div>
          <div className="space-y-0.5 mt-3">
            <h3 className="text-lg font-black text-white">{formatCurrency(data.cac)}</h3>
            <span className="text-[9px] text-emerald-400 font-extrabold block">LTV / CAC Ratio: {(data.ltv / data.cac).toFixed(1)}x (Excelente)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Demonstrativo de Fluxo de Caixa</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Visão consolidada de receitas e custos de infraestrutura</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Receita Bruta</span>
                <span className="text-sm font-extrabold text-emerald-400">{formatCurrency(data.fluxoCaixa.receitas)}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <ArrowUpRight size={16} />
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-950/60 p-3.5 rounded-xl border border-slate-850">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase block">Custo de Operação (25%)</span>
                <span className="text-sm font-extrabold text-rose-400">{formatCurrency(data.fluxoCaixa.despesas)}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400">
                <ArrowDownRight size={16} />
              </div>
            </div>

            <div className="flex justify-between items-center bg-slate-950/80 p-4 rounded-xl border border-indigo-500/30">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase block">Saldo Líquido</span>
                <span className="text-base font-black text-indigo-400">{formatCurrency(data.fluxoCaixa.saldo)}</span>
              </div>
              <span className="text-[9px] font-extrabold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">
                Margem: 75%
              </span>
            </div>
          </div>
        </div>

        {/* Billing Log Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Histórico de Faturamento Recente</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Acompanhamento dos vencimentos de assinaturas de clientes</p>
          </div>

          <div className="w-full">
            <table className="w-full text-left border-collapse table-fixed break-words">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 hidden md:table-cell w-2/12">Código</th>
                  <th className="pb-3 w-5/12 sm:w-4/12 md:w-4/12">Cliente / Plano</th>
                  <th className="pb-3 hidden sm:table-cell w-2/12 md:w-1/12">Forma</th>
                  <th className="pb-3 text-right w-4/12 sm:w-3/12 md:w-2/12">Valor</th>
                  <th className="pb-3 text-center hidden lg:table-cell w-2/12">Vencimento</th>
                  <th className="pb-3 text-center w-3/12 sm:w-3/12 md:w-1/12">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {data.faturamentos.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/10">
                    <td className="py-3 font-mono font-bold text-slate-400 hidden md:table-cell truncate">{f.id}</td>
                    <td className="py-3 truncate">
                      <div className="font-bold text-slate-200 truncate">{f.tenant}</div>
                      <div className="text-[9px] text-indigo-400 font-extrabold truncate">{f.plano}</div>
                      <div className="lg:hidden text-[9px] text-slate-500 font-semibold flex items-center gap-1 mt-1 truncate">
                        <Calendar size={10} className="shrink-0" />
                        <span className="truncate">{new Date(f.dataVencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-400 font-semibold hidden sm:table-cell truncate">{f.formaPagamento}</td>
                    <td className="py-3 text-right font-mono font-bold text-white truncate">
                      {formatCurrency(f.valor)}
                    </td>
                    <td className="py-3 text-center text-slate-400 hidden lg:table-cell truncate">
                      <div className="flex items-center justify-center gap-1 text-[11px] truncate">
                        <Calendar size={12} className="text-slate-500 shrink-0" />
                        <span className="truncate">{new Date(f.dataVencimento).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="py-3 text-center truncate">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${getStatusBadge(f.status)} truncate block w-fit mx-auto`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
