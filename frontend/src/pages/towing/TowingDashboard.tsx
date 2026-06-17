import { useState, useEffect } from 'react';
import { LayoutDashboard, Truck, FileText, DollarSign, Users, Scale, ShieldCheck, AlertTriangle, CheckCircle2, BarChart3, TrendingUp } from 'lucide-react';
import { towingService } from '../../services/towing.service';

export function TowingDashboard() {
  const [stats, setStats] = useState({
    totalQuotes: 0,
    totalRevenue: 0,
    totalDrivers: 0,
    totalVehicles: 0,
    anttStats: {
      avgAnttFloor: 0,
      avgAnttDiff: 0,
      belowAntt: 0,
      aboveAntt: 0
    }
  });
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await towingService.getDashboardStats();
      setStats(data);
      const quotesData = await towingService.listQuotes();
      setQuotes(quotesData);
    } catch (error) {
      console.error('Erro ao carregar estatísticas do dashboard de guincho:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // --- Chart 1: Faturamento Estimado por Status ---
  const statusTotals: Record<string, { value: number; count: number }> = {
    'Orçamento': { value: 0, count: 0 },
    'Em Andamento': { value: 0, count: 0 },
    'Aprovado': { value: 0, count: 0 },
    'Aguardando Pagamento': { value: 0, count: 0 },
    'Cobertura': { value: 0, count: 0 },
    'Pago': { value: 0, count: 0 }
  };

  let totalGeralForChart = 0;
  quotes.forEach((q: any) => {
    const status = q.status || 'Orçamento';
    const val = Number(q.valorTotal) || 0;
    if (statusTotals.hasOwnProperty(status)) {
      statusTotals[status].value += val;
      statusTotals[status].count += 1;
      totalGeralForChart += val;
    }
  });

  const maxStatusVal = Math.max(...Object.values(statusTotals).map(s => s.value), 1);

  const statusConfig: Record<string, { colorClass: string; textClass: string }> = {
    'Orçamento': { colorClass: 'bg-purple-500', textClass: 'text-purple-600' },
    'Em Andamento': { colorClass: 'bg-blue-500', textClass: 'text-blue-600' },
    'Aprovado': { colorClass: 'bg-emerald-500', textClass: 'text-emerald-600' },
    'Aguardando Pagamento': { colorClass: 'bg-amber-500', textClass: 'text-amber-600' },
    'Cobertura': { colorClass: 'bg-indigo-500', textClass: 'text-indigo-600' },
    'Pago': { colorClass: 'bg-sky-500', textClass: 'text-sky-600' },
  };

  // --- Chart 2: Orçamentos nos Últimos 7 Dias ---
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const dailyCounts = last7Days.map(date => {
    const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const count = quotes.filter((q: any) => {
      const qDate = new Date(q.createdAt);
      return qDate.getDate() === date.getDate() &&
             qDate.getMonth() === date.getMonth() &&
             qDate.getFullYear() === date.getFullYear();
    }).length;
    return { label: dateStr, count };
  });

  const maxDailyCount = Math.max(...dailyCounts.map(d => d.count), 1);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Carregando painel...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <LayoutDashboard className="text-primary" />
          Painel de Guincho
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-full">
            <FileText size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">Total de Orçamentos</span>
          <span className="text-3xl font-bold text-foreground">{stats.totalQuotes}</span>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-full">
            <DollarSign size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">Volume Financeiro (Mês)</span>
          <span className="text-3xl font-bold text-foreground">
            {formatCurrency(stats.totalRevenue)}
          </span>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-orange-500/10 text-orange-500 rounded-full">
            <Truck size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">Frota Ativa</span>
          <span className="text-3xl font-bold text-foreground">{stats.totalVehicles}</span>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-full">
            <Users size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">Motoristas</span>
          <span className="text-3xl font-bold text-foreground">{stats.totalDrivers}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-8 mb-4">
        <ShieldCheck className="text-primary" />
        <h2 className="text-xl font-bold">Validação Legal ANTT</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-slate-500/10 text-slate-500 rounded-full">
            <Scale size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground text-center">Piso Médio ANTT</span>
          <span className="text-2xl font-bold text-foreground">
            {formatCurrency(stats.anttStats.avgAnttFloor)}
          </span>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className={`p-3 rounded-full ${stats.anttStats.avgAnttDiff >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            <DollarSign size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground text-center">Diferença Média (Orç vs Piso)</span>
          <span className={`text-2xl font-bold ${stats.anttStats.avgAnttDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.anttStats.avgAnttDiff)}
          </span>
        </div>

        <div className="bg-card border border-red-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-full">
            <AlertTriangle size={24} />
          </div>
          <span className="text-sm font-semibold text-red-600 text-center">Orçamentos Abaixo do Piso</span>
          <span className="text-3xl font-bold text-red-600">{stats.anttStats.belowAntt}</span>
        </div>

        <div className="bg-card border border-green-200 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-green-500/10 text-green-500 rounded-full">
            <CheckCircle2 size={24} />
          </div>
          <span className="text-sm font-semibold text-green-600 text-center">Orçamentos Acima do Piso</span>
          <span className="text-3xl font-bold text-green-600">{stats.anttStats.aboveAntt}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Gráfico 1: Orçamentos por Dia */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 overflow-hidden">
          <div className="flex items-center gap-2 border-b pb-3">
            <BarChart3 className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">Orçamentos Gerados (Últimos 7 Dias)</h2>
          </div>
          <div className="h-64 flex items-end justify-between gap-3 pt-8 px-2">
            {dailyCounts.map((day) => {
              const pct = (day.count / maxDailyCount) * 100;
              return (
                <div key={day.label} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-1.5 rounded-lg shadow-md text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    <span>{day.label}: <strong>{day.count} orçamento{day.count !== 1 ? 's' : ''}</strong></span>
                  </div>
                  {/* Bar */}
                  <div className="w-full flex justify-center items-end h-full">
                    <div 
                      style={{ height: `${Math.max(pct, 4)}%` }} 
                      className={`w-3/5 rounded-t-lg transition-all duration-500 flex flex-col justify-end overflow-hidden ${
                        day.count > 0 ? 'bg-gradient-to-t from-primary to-primary/80' : 'bg-slate-200 dark:bg-slate-800/50'
                      } shadow-lg shadow-black/5 group-hover:scale-y-105 origin-bottom`}
                    />
                  </div>
                  {/* X Label */}
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-2 font-semibold">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Gráfico 2: Faturamento Estimado */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 overflow-hidden">
          <div className="flex items-center gap-2 border-b pb-3">
            <TrendingUp className="text-primary" size={20} />
            <h2 className="text-lg font-semibold">Volume Financeiro Estimado por Status</h2>
          </div>
          <div className="h-64 flex items-end justify-between gap-3 pt-8 px-2">
            {Object.entries(statusTotals).map(([status, stats]) => {
              const pct = (stats.value / maxStatusVal) * 100;
              const totalPct = totalGeralForChart > 0 ? (stats.value / totalGeralForChart) * 100 : 0;
              const config = statusConfig[status] || { colorClass: 'bg-slate-500', textClass: 'text-slate-600' };
              return (
                <div key={status} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 bg-popover border border-border px-3 py-2 rounded-lg shadow-md text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10 flex flex-col items-center gap-0.5">
                    <span className="text-muted-foreground">{status}</span>
                    <span className={`text-[13px] ${config.textClass}`}>{formatCurrency(stats.value)}</span>
                    <span className="text-foreground">{totalPct.toFixed(1)}%</span>
                  </div>
                  {/* Bar */}
                  <div className="w-full flex justify-center items-end h-full">
                    <div 
                      style={{ height: `${Math.max(pct, 4)}%` }} 
                      className={`w-4/5 sm:w-1/2 rounded-t-lg transition-all duration-500 flex flex-col justify-end overflow-hidden ${config.colorClass} shadow-lg shadow-black/10 group-hover:scale-y-105 origin-bottom`}
                    />
                  </div>
                  {/* X Label */}
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center mt-2 font-medium" title={status}>
                    {status.split(' ')[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
