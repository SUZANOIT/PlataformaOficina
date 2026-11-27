import { useState, useEffect } from 'react';
import { Truck, AlertTriangle, CheckCircle, Wrench, ShieldAlert, DollarSign, Calendar, TrendingUp, ArrowRight, Users, X } from 'lucide-react';
import { api } from '../../services/api';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { VehiclesWithoutMaintenance } from './VehiclesWithoutMaintenance';
import { MonthlyCostsByVehicle } from './MonthlyCostsByVehicle';

export default function FleetDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // Filtro de cliente único: vale para os cards, os veículos sem manutenção e os custos
  const [clienteId, setClienteId] = useState('');
  const [clientes, setClientes] = useState<{ clienteId: string; cliente: string }[]>([]);

  const fetchStats = async () => {
    try {
      const { data } = await api.get('/fleet/dashboard/stats', { params: { clienteId: clienteId || undefined } });
      setStats(data);
    } catch (err) {
      console.error('Failed to load fleet dashboard stats', err);
      toast.error('Erro ao carregar estatísticas da frota.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [clienteId]);

  // Clientes com veículos (opções do filtro)
  useEffect(() => {
    api.get('/fleet/dashboard/custos-mensais', { params: { meses: 3 } })
      .then(r => setClientes(r.data.clientes || []))
      .catch(() => setClientes([]));
  }, []);
  const clienteNome = clientes.find(c => c.clienteId === clienteId)?.cliente;

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
        <div className="flex w-full items-center gap-2 md:w-auto">
          <Users size={18} className="shrink-0 text-gray-500" aria-hidden="true" />
          <select
            aria-label="Filtrar dashboard por cliente"
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm md:w-72"
          >
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.clienteId} value={c.clienteId}>{c.cliente}</option>)}
          </select>
          {clienteId && (
            <button type="button" onClick={() => setClienteId('')} aria-label="Limpar filtro de cliente" className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {clienteNome && (
        <p className="-mt-2 text-sm text-gray-600">Mostrando somente os dados do cliente <b className="text-gray-800">{clienteNome}</b>.</p>
      )}

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

      {/* Veículos sem manutenção no período */}
      <VehiclesWithoutMaintenance clienteId={clienteId} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Costs Chart Mocked via Beautiful List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2 space-y-4">
          <MonthlyCostsByVehicle clienteId={clienteId} />
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
