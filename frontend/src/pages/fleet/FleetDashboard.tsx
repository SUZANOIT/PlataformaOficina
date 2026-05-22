import { useState, useEffect } from 'react';
import { Truck, AlertTriangle, CheckCircle, Wrench, ShieldAlert, DollarSign, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function FleetDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/fleet/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        toast.error('Erro ao carregar estatísticas da frota.');
      }
    } catch (err) {
      console.error('Failed to load fleet dashboard stats', err);
      toast.error('Erro ao carregar estatísticas da frota.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const s = stats || {
    totalClients: 0,
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    trocasVencidas: 0,
    trocasProximas: 0,
    custosManutencao: 0,
    mediaCustoKm: 0,
    monthlyCosts: []
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Gestão de Frotas</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral do controle de clientes, veículos e manutenção preventiva.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/fleet/vehicles"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            <Truck size={18} />
            Gerenciar Veículos
          </Link>
        </div>
      </div>

      {/* Grid of Indicator Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Vehicles */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition hover:-translate-y-1">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total de Veículos</span>
            <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white">{s.totalVehicles}</h3>
            <div className="flex items-center gap-1.5 text-xs text-green-500">
              <CheckCircle size={14} />
              <span>{s.activeVehicles} ativos</span>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-4 rounded-xl">
            <Truck size={28} />
          </div>
        </div>

        {/* Maintenance Vehicles */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition hover:-translate-y-1">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Em Manutenção</span>
            <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white">{s.maintenanceVehicles}</h3>
            <div className={`flex items-center gap-1.5 text-xs ${s.maintenanceVehicles > 0 ? 'text-amber-500' : 'text-gray-400'}`}>
              <Wrench size={14} />
              <span>Revisões & reparos</span>
            </div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 p-4 rounded-xl">
            <Wrench size={28} />
          </div>
        </div>

        {/* Overdue preventive changes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition hover:-translate-y-1">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Troca de Óleo Vencida</span>
            <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white">{s.trocasVencidas}</h3>
            <div className={`flex items-center gap-1.5 text-xs ${s.trocasVencidas > 0 ? 'text-rose-500 font-bold' : 'text-green-500'}`}>
              <AlertTriangle size={14} />
              <span>{s.trocasProximas} próximas do vencimento</span>
            </div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-xl">
            <ShieldAlert size={28} />
          </div>
        </div>

        {/* Maintenance Costs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between transition hover:-translate-y-1">
          <div className="space-y-2">
            <span className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Custo de Manutenção</span>
            <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white">{formatCurrency(s.custosManutencao)}</h3>
            <div className="flex items-center gap-1.5 text-xs text-indigo-500">
              <TrendingUp size={14} />
              <span>Investimento total</span>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-4 rounded-xl">
            <DollarSign size={28} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Costs Chart Mocked via Beautiful List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Evolução de Custos Mensais</h3>
          <p className="text-sm text-gray-400">Total acumulado de manutenções, peças e trocas preventivas.</p>
          
          <div className="space-y-3 pt-2">
            {s.monthlyCosts.length === 0 ? (
              <div className="text-center py-8 text-gray-400">Sem registros financeiros nos últimos meses.</div>
            ) : (
              s.monthlyCosts.map((m: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-16 font-semibold text-sm text-gray-600 dark:text-gray-400">{m.month}</div>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 h-6 rounded-full overflow-hidden relative">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (m.cost / Math.max(...s.monthlyCosts.map((c: any) => c.cost || 1))) * 100)}%` }}
                    />
                  </div>
                  <div className="w-24 text-right font-bold text-sm text-gray-800 dark:text-white">{formatCurrency(m.cost)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Menu / Shortcuts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">Ações Rápidas</h3>
          <div className="flex flex-col gap-3">
            <Link
              to="/fleet/preventive"
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-800 dark:text-white block">Controle Preventivo</span>
                  <span className="text-xs text-gray-400">Lançar e checar troca de óleo</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>

            <Link
              to="/fleet/workshops"
              className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
                  <Wrench size={18} />
                </div>
                <div>
                  <span className="font-semibold text-sm text-gray-800 dark:text-white block">Oficinas Externas</span>
                  <span className="text-xs text-gray-400">Gerenciar oficinas parceiras</span>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-400" />
            </Link>

            <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl space-y-2">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">Resumo Técnico</span>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Total de Clientes</span>
                <span className="font-bold text-gray-800 dark:text-white">{s.totalClients}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                <span>Custo Médio / KM</span>
                <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(s.mediaCustoKm)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
