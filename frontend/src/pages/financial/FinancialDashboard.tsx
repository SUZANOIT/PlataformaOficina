import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  Calendar, 
  Filter, 
  Briefcase, 
  RefreshCw 
} from 'lucide-react';
import { toast } from 'sonner';

interface DashboardData {
  kpis: {
    totalContasPagar: number;
    totalContasReceber: number;
    despesasPagas: number;
    despesasPendentes: number;
    recebimentosRealizados: number;
    recebimentosPendentes: number;
    saldoLiquido: number;
    totalMovimentado: number;
    contasVencidas: number;
    totalLancamentos: number;
  };
  graficos: {
    despesasPorCategoria: Record<string, number>;
    receitasPorCategoria: Record<string, number>;
    contasPorStatus: Record<string, number>;
    contasPorEmpresa: Record<string, { pagar: number; receber: number }>;
    contasPorCentroCusto: Record<string, number>;
    fluxoMensal: Record<string, { receitas: number; despesas: number; saldo: number }>;
    receitaPorPlataforma: Record<string, number>;
  };
}

export function FinancialDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch Companies
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/companies', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const companiesData = await res.json();
          setCompanies(companiesData);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCompanies();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (selectedCompanyId) params.append('companyId', selectedCompanyId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/financial/dashboard?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const resData = await res.json();
        setData(resData);
      } else {
        toast.error('Erro ao carregar dados do dashboard financeiro.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Houve uma falha ao contatar o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedCompanyId, startDate, endDate]);

  if (loading && !data) {
    return (
      <div className="space-y-6 pb-12 animate-pulse">
        <div className="h-10 bg-muted/20 w-1/4 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-muted/20 border border-border rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-muted/20 border border-border rounded-xl"></div>
          <div className="h-80 bg-muted/20 border border-border rounded-xl"></div>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalContasPagar: 0,
    totalContasReceber: 0,
    despesasPagas: 0,
    despesasPendentes: 0,
    recebimentosRealizados: 0,
    recebimentosPendentes: 0,
    saldoLiquido: 0,
    totalMovimentado: 0,
    contasVencidas: 0,
    totalLancamentos: 0
  };

  const graficos = data?.graficos || {
    despesasPorCategoria: {},
    receitasPorCategoria: {},
    contasPorStatus: {},
    contasPorEmpresa: {},
    contasPorCentroCusto: {},
    fluxoMensal: {},
    receitaPorPlataforma: {}
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  // Helper para renderizar gráfico Donut SVG
  const renderDonutChart = (categoryData: Record<string, number>, colors: string[]) => {
    const entries = Object.entries(categoryData);
    const total = entries.reduce((sum, [_, v]) => sum + v, 0);

    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
          <span>Sem movimentações cadastradas</span>
        </div>
      );
    }

    const radius = 50;
    const circumference = 2 * Math.PI * radius; // ~314.16
    let accumulatedPercent = 0;

    return (
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-2">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            {entries.map(([cat, val], idx) => {
              const percent = (val / total) * 100;
              const strokeLength = (percent / 100) * circumference;
              const strokeOffset = circumference - ((accumulatedPercent / 100) * circumference);
              accumulatedPercent += percent;
              const strokeColor = colors[idx % colors.length];

              return (
                <circle
                  key={cat}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth="12"
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-500 hover:stroke-[14px] cursor-pointer"
                >
                  <title>{`${cat}: ${formatCurrency(val)} (${percent.toFixed(1)}%)`}</title>
                </circle>
              );
            })}
            <circle cx="60" cy="60" r="38" className="fill-card" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total</span>
            <span className="text-sm font-extrabold text-foreground">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Legendas */}
        <div className="flex-1 space-y-1.5 w-full">
          {entries.map(([cat, val], idx) => {
            const percent = (val / total) * 100;
            const color = colors[idx % colors.length];
            return (
              <div key={cat} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                  <span className="text-muted-foreground font-medium truncate max-w-[120px]">{cat}</span>
                </div>
                <div className="font-semibold text-foreground">
                  {formatCurrency(val)} <span className="text-[10px] text-muted-foreground/60">({percent.toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Previsões de fluxo futuro simples
  const previsaoGastos = kpis.despesasPendentes;
  const previsaoRecebimento = kpis.recebimentosPendentes;
  const saldoProjetado = kpis.saldoLiquido + previsaoRecebimento - previsaoGastos;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            📊 Gestão Financeira Empresarial
          </h1>
          <p className="text-muted-foreground text-sm">Dashboard consolidado e análise de liquidez em tempo real.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 bg-card border border-border p-2 rounded-xl shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Filter size={14} /> Filtros:
          </div>
          
          <select 
            value={selectedCompanyId} 
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="bg-background border border-border rounded-lg text-xs px-2.5 py-1.5 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          >
            <option value="">Todas as Empresas</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.nomeFantasia || c.razaoSocial}</option>
            ))}
          </select>

          <input 
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-background border border-border rounded-lg text-xs px-2.5 py-1 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />

          <input 
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-background border border-border rounded-lg text-xs px-2.5 py-1 text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
          />

          <button 
            onClick={() => {
              setSelectedCompanyId('');
              setStartDate('');
              setEndDate('');
              fetchDashboardData();
            }}
            className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:bg-muted transition-colors"
            title="Limpar filtros"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Alertas */}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Consolidado */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Líquido Realizado</p>
              <h3 className="text-2xl font-black text-foreground mt-1.5">{formatCurrency(kpis.saldoLiquido)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-border/40">
            <span className="text-muted-foreground">Total Movimentado:</span>
            <span className="font-bold text-foreground">{formatCurrency(kpis.totalMovimentado)}</span>
          </div>
        </div>

        {/* Card 2: Contas a Receber */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total a Receber</p>
              <h3 className="text-2xl font-black text-emerald-500 mt-1.5">{formatCurrency(kpis.totalContasReceber)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <TrendingUp size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-border/40">
            <span className="text-muted-foreground">Recebido: <span className="font-bold text-foreground">{formatCurrency(kpis.recebimentosRealizados)}</span></span>
            <span className="text-muted-foreground">Pendente: <span className="font-bold text-emerald-500">{formatCurrency(kpis.recebimentosPendentes)}</span></span>
          </div>
        </div>

        {/* Card 3: Contas a Pagar */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total a Pagar</p>
              <h3 className="text-2xl font-black text-red-500 mt-1.5">{formatCurrency(kpis.totalContasPagar)}</h3>
            </div>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <TrendingDown size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-border/40">
            <span className="text-muted-foreground">Pago: <span className="font-bold text-foreground">{formatCurrency(kpis.despesasPagas)}</span></span>
            <span className="text-muted-foreground">Pendente: <span className="font-bold text-red-500">{formatCurrency(kpis.despesasPendentes)}</span></span>
          </div>
        </div>

        {/* Card 4: Saldo Projetado */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Saldo Líquido Projetado</p>
              <h3 className={`text-2xl font-black mt-1.5 ${saldoProjetado >= 0 ? 'text-primary' : 'text-red-500'}`}>
                {formatCurrency(saldoProjetado)}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calendar size={20} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-border/40">
            <span className="text-muted-foreground">Previsão Gastos: <span className="font-bold text-red-500">{formatCurrency(previsaoGastos)}</span></span>
            <span className="text-muted-foreground">Previsão Receb.: <span className="font-bold text-emerald-500">{formatCurrency(previsaoRecebimento)}</span></span>
          </div>
        </div>
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico 1: Despesas por Categoria */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-red-500 inline-block"></span>
              Despesas por Categoria
            </h4>
            <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Detalhamento</span>
          </div>
          {renderDonutChart(graficos.despesasPorCategoria, [
            '#ef4444', // Red
            '#f59e0b', // Amber
            '#ec4899', // Pink
            '#a855f7', // Purple
            '#3b82f6', // Blue
            '#6b7280', // Gray
          ])}
        </div>

        {/* Gráfico 2: Receitas por Categoria */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-emerald-500 inline-block"></span>
              Receitas por Categoria
            </h4>
            <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Detalhamento</span>
          </div>
          {renderDonutChart(graficos.receitasPorCategoria, [
            '#10b981', // Emerald
            '#06b6d4', // Cyan
            '#3b82f6', // Blue
            '#a855f7', // Purple
            '#f59e0b', // Amber
            '#6b7280', // Gray
          ])}
        </div>

        {/* Gráfico 3: Fluxo de Caixa Mensal */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-primary inline-block"></span>
              Fluxo de Caixa Mensal (Receitas vs Despesas)
            </h4>
            <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Histórico & Projeções</span>
          </div>

          {Object.keys(graficos.fluxoMensal).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
              <span>Sem registros de fluxo para o período selecionado</span>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="relative h-64 w-full flex items-end justify-around border-b border-border/80 pb-3 pt-6 px-2">
                {/* Grid Lines */}
                <div className="absolute inset-x-0 top-6 bottom-12 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-border/20 w-full"></div>
                  <div className="border-b border-border/20 w-full"></div>
                  <div className="border-b border-border/20 w-full"></div>
                </div>

                {/* Obter valor máximo para escala */}
                {(() => {
                  const values = Object.values(graficos.fluxoMensal);
                  const maxVal = Math.max(...values.map(v => Math.max(v.receitas, v.despesas, 100)));

                  return Object.entries(graficos.fluxoMensal).map(([mesAno, val]) => {
                    const recPercent = (val.receitas / maxVal) * 100;
                    const desPercent = (val.despesas / maxVal) * 100;

                    return (
                      <div key={mesAno} className="flex flex-col items-center gap-2 w-20 group relative z-10">
                        <div className="flex items-end gap-2 h-40 w-full justify-center">
                          {/* Barra de Receitas */}
                          <div 
                            style={{ height: `${Math.max(recPercent, 4)}%` }} 
                            className="w-5 sm:w-6 bg-gradient-to-t from-emerald-500/80 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 rounded-t-md shadow-xs transition-all duration-300 relative group cursor-pointer"
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-popover border border-border px-2.5 py-1.5 rounded-lg text-[10px] text-foreground font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1 z-20 pointer-events-none">
                              <span className="text-emerald-500">Receitas</span>: {formatCurrency(val.receitas)}
                            </div>
                          </div>
                          
                          {/* Barra de Despesas */}
                          <div 
                            style={{ height: `${Math.max(desPercent, 4)}%` }} 
                            className="w-5 sm:w-6 bg-gradient-to-t from-red-500/80 to-red-400 hover:from-red-500 hover:to-red-300 rounded-t-md shadow-xs transition-all duration-300 relative group cursor-pointer"
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-popover border border-border px-2.5 py-1.5 rounded-lg text-[10px] text-foreground font-bold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1 z-20 pointer-events-none">
                              <span className="text-red-500">Despesas</span>: {formatCurrency(val.despesas)}
                            </div>
                          </div>
                        </div>

                        {/* Label de Mes */}
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider mt-1">{mesAno}</span>

                        {/* Saldo Indicator */}
                        <div className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-2xs ${val.saldo >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                          {val.saldo >= 0 ? '+' : ''}{formatCurrency(val.saldo)}
                        </div>
                      </div>
                    );
                  });
                })()}

              </div>
              
              {/* Legenda do Fluxo */}
              <div className="flex items-center justify-center gap-6 text-xs pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-emerald-500/80"></span>
                  <span className="text-muted-foreground font-medium">Receitas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-sm bg-red-500/80"></span>
                  <span className="text-muted-foreground font-medium">Despesas</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Gráfico 4: Divisão por Centro de Custo */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-amber-500 inline-block"></span>
              Alocação por Centro de Custo
            </h4>
            <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Centro de Custo</span>
          </div>

          <div className="space-y-4">
            {Object.keys(graficos.contasPorCentroCusto).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                <span>Nenhum centro de custo cadastrado</span>
              </div>
            ) : (
              (() => {
                const entries = Object.entries(graficos.contasPorCentroCusto);
                const maxVal = Math.max(...entries.map(([_, v]) => v), 1);

                return entries.map(([center, val], idx) => {
                  const percent = (val / maxVal) * 100;
                  const bgColors = ['bg-primary', 'bg-amber-500', 'bg-blue-500', 'bg-purple-500', 'bg-emerald-500'];
                  const colorClass = bgColors[idx % bgColors.length];

                  return (
                    <div key={center} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{center}</span>
                        <span className="font-bold text-foreground">{formatCurrency(val)}</span>
                      </div>
                      <div className="w-full bg-input rounded-full h-2">
                        <div className={`h-full rounded-full ${colorClass} transition-all duration-500`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </div>
        </div>

        {/* Gráfico 5: Divisão por Empresa */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
          <div className="flex justify-between items-center mb-6">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-purple-500 inline-block"></span>
              Movimentação por Empresa
            </h4>
            <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Volume Financeiro</span>
          </div>

          <div className="space-y-4">
            {Object.keys(graficos.contasPorEmpresa).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-sm">
                <span>Nenhuma movimentação por empresa</span>
              </div>
            ) : (
              Object.entries(graficos.contasPorEmpresa).map(([companyName, val]) => {
                const totalComp = val.pagar + val.receber;

                return (
                  <div key={companyName} className="border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Briefcase size={13} className="text-primary/70" />
                        {companyName}
                      </span>
                      <span className="font-bold text-muted-foreground text-[10px] uppercase tracking-wider">
                        Vol: {formatCurrency(totalComp)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 flex gap-0.5 rounded-full overflow-hidden bg-input h-3">
                        <div 
                          style={{ width: `${(val.receber / (totalComp || 1)) * 100}%` }} 
                          className="bg-emerald-500/80 h-full"
                          title={`Receber: ${formatCurrency(val.receber)}`}
                        ></div>
                        <div 
                          style={{ width: `${(val.pagar / (totalComp || 1)) * 100}%` }} 
                          className="bg-red-500/80 h-full"
                          title={`Pagar: ${formatCurrency(val.pagar)}`}
                        ></div>
                      </div>
                      
                      <div className="flex gap-2.5 text-[10px] font-bold shrink-0">
                        <span className="text-emerald-500">Rec: {formatCurrency(val.receber)}</span>
                        <span className="text-red-500">Pag: {formatCurrency(val.pagar)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Gráfico 6: Receita por Plataforma de Gestão */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-4 rounded bg-primary inline-block"></span>
              Receita por Plataforma de Gestão
            </h4>
            <span className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider">Detalhamento</span>
          </div>
          {renderDonutChart(graficos.receitaPorPlataforma, [
            '#6366f1', // Indigo
            '#a855f7', // Purple
            '#ec4899', // Pink
            '#14b8a6', // Teal
            '#f59e0b', // Amber
            '#3b82f6', // Blue
            '#6b7280', // Gray
          ])}
        </div>

      </div>

    </div>
  );
}
