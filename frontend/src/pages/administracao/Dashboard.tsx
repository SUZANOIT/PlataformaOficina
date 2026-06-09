import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Building2, 
  Wrench, 
  TrendingUp, 
  AlertOctagon, 
  Activity, 
  PlusCircle, 
  ArrowUpRight,
  Zap,
  BellRing
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

interface DashboardStats {
  kpis: {
    totalTenants: number;
    activeTenants: number;
    trialTenants: number;
    suspendedTenants: number;
    blockedTenants: number;
    totalWorkshops: number;
    activeUsers: number;
    activeSubscriptionsCount: number;
    cancelledSubscriptionsCount: number;
    pendingSubscriptionsCount: number;
    mrr: number;
    arr: number;
    inadimplentesCount: number;
  };
  planDistribution: Array<{
    planoNome: string;
    quantidade: number;
    mrrContribuicao: number;
  }>;
  moduleStats: Array<{
    moduloNome: string;
    chave: string;
    quantidade: number;
  }>;
  faturamentoHistorico: Array<{
    mes: string;
    receita: number;
    churn: number;
    novos: number;
    crescimento: number;
  }>;
  topTenants: Array<{
    id: string;
    razaoSocial: string;
    nomeFantasia: string | null;
    plano: string;
    valor: number;
  }>;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await SaaSAPIService.getDashboard();
      setStats(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados analíticos do SaaS.');
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

  if (isLoading || !stats) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-xs text-slate-400">Calculando métricas em tempo real...</p>
      </div>
    );
  }

  const { kpis, planDistribution, moduleStats, faturamentoHistorico, topTenants } = stats;

  // Renderizar Gráfico SVG de Receitas
  const renderRevenueChart = () => {
    const maxVal = Math.max(...faturamentoHistorico.map(d => d.receita), 1000);
    const height = 150;
    const width = 500;
    const padding = 20;

    const points = faturamentoHistorico.map((d, i) => {
      const x = padding + (i * (width - 2 * padding)) / (faturamentoHistorico.length - 1);
      const y = height - padding - (d.receita / maxVal) * (height - 2 * padding);
      return { x, y, ...d };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

    return (
      <div className="space-y-2">
        <svg className="w-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,4" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeWidth={0.5} strokeDasharray="2,4" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeWidth={1} />

          {/* Area filled */}
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Line path */}
          <path d={linePath} fill="none" stroke="#6366f1" strokeWidth={2.5} className="transition-all duration-300" />

          {/* Points circles */}
          {points.map((p, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle cx={p.x} cy={p.y} r={4} fill="#6366f1" stroke="#0f172a" strokeWidth={1.5} className="hover:scale-150 transition-all" />
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#f8fafc" className="text-[8px] font-bold opacity-0 group-hover/dot:opacity-100 transition-opacity bg-slate-900 px-1 py-0.5 rounded">
                {formatCurrency(p.receita)}
              </text>
            </g>
          ))}

          {/* Axis Labels */}
          {points.map((p, idx) => (
            <text key={`label-${idx}`} x={p.x} y={height - 5} textAnchor="middle" fill="#64748b" className="text-[9px] font-bold">
              {p.mes}
            </text>
          ))}
        </svg>
      </div>
    );
  };

  // Renderizar Gráfico de novos clientes por mês (Linhas Verticais)
  const renderNewClientsChart = () => {
    const maxVal = Math.max(...faturamentoHistorico.map(d => Math.max(d.novos, d.churn)), 5);

    return (
      <div className="flex justify-between items-end h-[120px] pt-4 px-2 border-b border-slate-800">
        {faturamentoHistorico.map((d, i) => {
          const newHeight = (d.novos / maxVal) * 80;
          const churnHeight = (d.churn / maxVal) * 80;

          return (
            <div key={i} className="flex flex-col items-center gap-1.5 w-12 group cursor-pointer relative">
              <div className="flex items-end gap-1 h-20 justify-center">
                {/* Novos Clientes (Green) */}
                <div 
                  style={{ height: `${Math.max(newHeight, 3)}px` }} 
                  className="w-3 bg-emerald-500 rounded-t-sm transition-all duration-300 group-hover:bg-emerald-400"
                  title={`Novos Clientes: ${d.novos}`}
                ></div>
                {/* Churn (Red) */}
                <div 
                  style={{ height: `${Math.max(churnHeight, 3)}px` }} 
                  className="w-3 bg-rose-500 rounded-t-sm transition-all duration-300 group-hover:bg-rose-400"
                  title={`Churn: ${d.churn}`}
                ></div>
              </div>
              <span className="text-[9px] text-slate-500 font-bold">{d.mes}</span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Headline */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none"></div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            Olá, {stats ? 'Administrador' : ''} 👋
          </h2>
          <p className="text-xs text-slate-400 font-medium">Consolidado operacional e faturamento recorrente da Suzano IT.</p>
        </div>

        {/* Quick actions row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link 
            to="/administracao/empresas?action=new" 
            className="flex items-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-400 active:scale-98 text-slate-950 font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-500/10"
          >
            <PlusCircle size={14} />
            <span>Adicionar Empresa</span>
          </Link>
          <Link 
            to="/administracao/notificacoes" 
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition"
          >
            <BellRing size={14} className="text-indigo-400" />
            <span>Emitir Alerta</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-12 w-12 bg-indigo-500/5 rounded-bl-3xl"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Total Tenants</span>
            <Building2 size={15} className="text-indigo-400" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-white">{kpis.totalTenants}</h3>
            <span className="text-[9px] text-indigo-400 font-bold block">{kpis.activeTenants} ativas | {kpis.trialTenants} trial</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-12 w-12 bg-indigo-500/5 rounded-bl-3xl"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">MRR</span>
            <TrendingUp size={15} className="text-indigo-400" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-white">{formatCurrency(kpis.mrr)}</h3>
            <span className="text-[9px] text-slate-500 font-bold block">Mensal Recorrente</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-12 w-12 bg-indigo-500/5 rounded-bl-3xl"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">ARR</span>
            <Zap size={15} className="text-purple-400" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-white">{formatCurrency(kpis.arr)}</h3>
            <span className="text-[9px] text-slate-500 font-bold block">Projeção Anual</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg space-y-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-12 w-12 bg-indigo-500/5 rounded-bl-3xl"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Ativos da Oficina</span>
            <Wrench size={15} className="text-emerald-400" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-white">{kpis.totalWorkshops}</h3>
            <span className="text-[9px] text-emerald-400 font-bold block">{kpis.activeUsers} usuários operacionais</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 p-5 rounded-2xl shadow-lg space-y-3 relative overflow-hidden col-span-2 md:col-span-1">
          <div className="absolute top-0 right-0 h-12 w-12 bg-indigo-500/5 rounded-bl-3xl"></div>
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Inadimplência</span>
            <AlertOctagon size={15} className="text-rose-400" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl font-black text-rose-400">{kpis.inadimplentesCount} faturas</h3>
            <span className="text-[9px] text-slate-500 font-bold block">{kpis.blockedTenants} empresas bloqueadas</span>
          </div>
        </div>
      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receita mensal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Evolução do Faturamento</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">MRR apurado nos últimos 6 meses</p>
          </div>
          <div className="pt-2">
            {renderRevenueChart()}
          </div>
        </div>

        {/* Churn e Crescimento */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Novos Clientes vs Churn</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Taxa de conversão e cancelamentos</p>
          </div>
          <div>
            {renderNewClientsChart()}
          </div>
          <div className="flex justify-center gap-6 text-[10px] font-bold pt-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
              <span className="text-slate-400">Novos Clientes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
              <span className="text-slate-400">Churn / Cancelados</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por plano */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Faturamento por Plano</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Participação dos planos ativos no MRR</p>
          </div>
          <div className="space-y-4">
            {planDistribution.map((pd, idx) => {
              const percentage = kpis.mrr > 0 ? (pd.mrrContribuicao / kpis.mrr) * 100 : 0;
              const barColors = ['bg-indigo-500', 'bg-purple-500', 'bg-sky-500'];
              const colorClass = barColors[idx % barColors.length];

              return (
                <div key={pd.planoNome} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-300">{pd.planoNome}</span>
                    <span className="font-mono text-slate-400">{pd.quantidade} {pd.quantidade === 1 ? 'cliente' : 'clientes'} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div style={{ width: `${percentage}%` }} className={`h-full rounded-full ${colorClass}`} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 w-16 text-right">{formatCurrency(pd.mrrContribuicao)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modulos mais utilizados */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">Módulos do Marketplace</h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Quantidade de ativações adicionais</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {moduleStats.slice(0, 6).map((ms) => {
              const activePercentage = kpis.activeTenants > 0 ? (ms.quantidade / kpis.activeTenants) * 100 : 0;
              return (
                <div key={ms.chave} className="p-3 bg-slate-950 border border-slate-850 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-300 truncate block">{ms.moduloNome}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-base font-black text-white">{ms.quantidade}</span>
                    <span className="text-[9px] text-slate-500 font-bold">({activePercentage.toFixed(0)}% adota)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top tenants and quick log updates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top tenants list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider">Top Empresas por Faturamento</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Tenants com maior volume de faturamento</p>
            </div>
            <Link to="/administracao/empresas" className="text-[10px] font-black text-indigo-400 uppercase tracking-wider flex items-center gap-1 hover:underline">
              <span>Ver todas</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-1/2" />
                <col className="w-1/4" />
                <col className="w-1/4" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="pb-3 font-bold">Razão Social / Fantasia</th>
                  <th className="pb-3 font-bold">Plano Contratado</th>
                  <th className="pb-3 font-bold text-right">Valor Mensal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-xs">
                {topTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/10">
                    <td className="py-3 font-bold text-slate-200 truncate">
                      <div className="truncate" title={t.razaoSocial}>{t.razaoSocial}</div>
                      {t.nomeFantasia && <div className="text-[10px] text-slate-500 font-semibold truncate" title={t.nomeFantasia}>{t.nomeFantasia}</div>}
                    </td>
                    <td className="py-3 text-slate-400 font-semibold truncate">
                      <span className="inline-block bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 text-[10px] font-extrabold text-indigo-400 truncate max-w-full">
                        {t.plano}
                      </span>
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-white">
                      {formatCurrency(t.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System telemetry overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-xs font-black uppercase text-white tracking-wider">Status das APIs e Gateways</h3>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Monitoramento operacional global</p>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">PostgreSQL Database</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block animate-ping"></span>
                  Online
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">ReceitaWS API</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block"></span>
                  Online (99.8%)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">NF-e Sefaz</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block"></span>
                  Online (98.9%)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Stripe / Gateways</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 block animate-ping"></span>
                  Online (100%)
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/administracao/monitoramento"
            className="flex items-center justify-center gap-2 w-full mt-4 py-2.5 bg-slate-950/45 hover:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-300 rounded-xl border border-slate-800 transition"
          >
            <Activity size={14} className="text-indigo-400 animate-pulse" />
            <span>Ver Telemetria Completa</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
