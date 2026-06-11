import { useState, useEffect } from 'react';
import { LayoutDashboard, Truck, FileText, DollarSign, Users, Scale, AlertTriangle, CheckCircle2 } from 'lucide-react';
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

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await towingService.getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas do dashboard de guincho:', error);
    } finally {
      setLoading(false);
    }
  };

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
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalRevenue)}
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
        <Scale className="text-primary" />
        <h2 className="text-xl font-bold">Validação Legal ANTT</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-slate-500/10 text-slate-500 rounded-full">
            <Scale size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground text-center">Piso Médio ANTT</span>
          <span className="text-2xl font-bold text-foreground">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.anttStats.avgAnttFloor)}
          </span>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col items-center justify-center space-y-2">
          <div className={`p-3 rounded-full ${stats.anttStats.avgAnttDiff >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            <DollarSign size={24} />
          </div>
          <span className="text-sm font-semibold text-muted-foreground text-center">Diferença Média (Orç vs Piso)</span>
          <span className={`text-2xl font-bold ${stats.anttStats.avgAnttDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.anttStats.avgAnttDiff)}
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
        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          [Gráfico de Orçamentos por Dia]
        </div>
        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
          [Gráfico de Faturamento Estimado]
        </div>
      </div>
    </div>
  );
}
