import { useEffect, useState } from 'react';
import { 
  X, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  FileCheck, 
  BarChart3,
  Calendar,
  Download,
  Share2,
  RefreshCw,
  Trophy,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import type { ClientDashboardResponse } from '../../types/clientDashboard';
import { HeatMap } from '../charts/HeatMap';

interface ClientRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export function ClientRevenueModal({ isOpen, onClose, client }: ClientRevenueModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClientDashboardResponse | null>(null);
  const [period, setPeriod] = useState('year'); // year, 30d, 90d

  useEffect(() => {
    if (isOpen && client) {
      fetchDashboard();
    }
  }, [isOpen, client, period]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const currentYear = new Date().getFullYear();
      let start = new Date(`${currentYear}-01-01T00:00:00.000Z`);
      let end = new Date(`${currentYear}-12-31T23:59:59.999Z`);
      let prevStart = new Date(`${currentYear - 1}-01-01T00:00:00.000Z`);
      let prevEnd = new Date(`${currentYear - 1}-12-31T23:59:59.999Z`);

      if (period === '30d') {
        end = new Date();
        start = new Date();
        start.setDate(end.getDate() - 30);
        prevEnd = new Date(start);
        prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 30);
      } else if (period === '90d') {
        end = new Date();
        start = new Date();
        start.setDate(end.getDate() - 90);
        prevEnd = new Date(start);
        prevStart = new Date(prevEnd);
        prevStart.setDate(prevEnd.getDate() - 90);
      }

      const params = new URLSearchParams({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        prevStartDate: prevStart.toISOString(),
        prevEndDate: prevEnd.toISOString(),
      });

      const response = await api.get(`/registry/clients/${client.id}/revenue?${params.toString()}`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard', error);
      toast.error('Erro ao carregar os dados do dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasData = data && data.kpis.totalRevenue > 0;

  const renderTrend = (value: number) => {
    if (value > 0) {
      return <span className="text-emerald-500 flex items-center text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full"><TrendingUp size={12} className="mr-1"/> +{value.toFixed(1)}%</span>;
    }
    if (value < 0) {
      return <span className="text-red-500 flex items-center text-xs font-bold bg-red-500/10 px-2 py-0.5 rounded-full"><TrendingDown size={12} className="mr-1"/> {value.toFixed(1)}%</span>;
    }
    return <span className="text-slate-500 flex items-center text-xs font-bold bg-slate-500/10 px-2 py-0.5 rounded-full">- 0%</span>;
  };

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-card/95 border border-border/50 w-full max-w-[95vw] h-full max-h-[98vh] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative flex flex-col ring-1 ring-white/10">
        
        {/* Header SaaS Style */}
        <div className="px-8 py-5 border-b border-border/50 flex flex-col md:flex-row justify-between md:items-center bg-card shrink-0 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <Activity size={28} strokeWidth={2} />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
                Dashboard Executivo
                {data && data.ranking.position > 0 && data.ranking.position <= 10 && (
                  <span className="text-xs font-bold bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-500/30">
                    <Trophy size={12} /> TOP {data.ranking.position}
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {client?.nome} {client?.empresa ? `• ${client.empresa}` : ''} {client?.cnpj ? `• ${client.cnpj}` : ''}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-muted/50 rounded-xl p-1 flex items-center border border-border/50 mr-2">
              <button onClick={() => setPeriod('30d')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${period === '30d' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>30 Dias</button>
              <button onClick={() => setPeriod('90d')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${period === '90d' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>90 Dias</button>
              <button onClick={() => setPeriod('year')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${period === 'year' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Este Ano</button>
            </div>
            
            <button className="h-9 w-9 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Download size={16} /></button>
            <button className="h-9 w-9 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Share2 size={16} /></button>
            <button onClick={fetchDashboard} className="h-9 w-9 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><RefreshCw size={16} /></button>
            
            <div className="w-px h-6 bg-border mx-1"></div>
            <button onClick={onClose} className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"><X size={18} /></button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-muted/10">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => <div key={i} className="bg-card rounded-2xl h-36 border border-border/50"></div>)}
              </div>
              <div className="bg-card rounded-2xl h-96 border border-border/50"></div>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-5">
              <div className="w-24 h-24 bg-muted/50 rounded-full flex items-center justify-center shadow-inner">
                <BarChart3 size={48} className="text-muted-foreground/40" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-foreground">Nenhum dado financeiro</h4>
                <p className="text-muted-foreground max-w-md mx-auto mt-2">Este cliente não possui ordens de serviço pagas no período selecionado.</p>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-6 md:space-y-8 max-w-[1400px] mx-auto pb-10">
              
              {/* Row 1: KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Receita Total</p>
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><DollarSign size={16} /></div>
                  </div>
                  <h3 className="text-3xl font-black text-foreground mb-2">{formatCurrency(data.kpis.totalRevenue)}</h3>
                  <div className="flex items-center gap-2">
                    {renderTrend(data.kpis.revenueGrowth)}
                    <span className="text-xs text-muted-foreground">vs. período anterior</span>
                  </div>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ordens Pagas</p>
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><FileCheck size={16} /></div>
                  </div>
                  <h3 className="text-3xl font-black text-foreground mb-2">{data.kpis.approvedCount} <span className="text-lg text-muted-foreground font-medium">OSs</span></h3>
                  <div className="flex items-center gap-2">
                    {renderTrend(data.kpis.countGrowth)}
                    <span className="text-xs text-muted-foreground">vs. período anterior</span>
                  </div>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:border-amber-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Ticket Médio</p>
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><Activity size={16} /></div>
                  </div>
                  <h3 className="text-3xl font-black text-foreground mb-2">{formatCurrency(data.kpis.averageTicket)}</h3>
                  <div className="flex items-center gap-2">
                    {renderTrend(data.kpis.ticketGrowth)}
                    <span className="text-xs text-muted-foreground">vs. período anterior</span>
                  </div>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm relative overflow-hidden group hover:border-purple-500/50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Maior Receita</p>
                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><ArrowUpRight size={16} /></div>
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-2">{data.kpis.maxRevenueOS ? formatCurrency(data.kpis.maxRevenueOS.valor) : '-'}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">{data.kpis.maxRevenueOS?.numero}</span>
                    <span className="text-xs text-muted-foreground">{data.kpis.maxRevenueOS?.data ? formatDate(data.kpis.maxRevenueOS.data) : ''}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Main Area Chart & Receita por Serviço */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                <div className="lg:col-span-2 bg-card border border-border/50 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      Evolução Financeira
                    </h4>
                  </div>
                  <div className="h-[350px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '1rem', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: any) => [formatCurrency(value as number), 'Receita']}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: '8px' }}
                        />
                        <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-1 bg-card border border-border/50 p-6 md:p-8 rounded-3xl shadow-sm flex flex-col">
                  <h4 className="text-base font-bold text-foreground mb-6">Receita por Serviço</h4>
                  <div className="h-[350px] w-full flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.revenueByService}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.revenueByService.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                        <Legend layout="vertical" verticalAlign="middle" align="center" iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Row 3: Heatmap */}
              <div className="bg-card border border-border/50 p-6 md:p-8 rounded-3xl shadow-sm overflow-hidden w-full">
                <h4 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                  <Calendar size={18} className="text-muted-foreground"/> 
                  Intensidade Financeira Mensal
                </h4>
                <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                  <HeatMap data={data.monthlyData} />
                </div>
              </div>

              {/* Row 4: Financial Table */}
              <div className="bg-card border border-border/50 rounded-3xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border/50">
                  <h4 className="text-base font-bold text-foreground">Detalhamento de Ordens</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Número</th>
                        <th className="px-6 py-4 font-semibold">Tipo</th>
                        <th className="px-6 py-4 font-semibold">Data</th>
                        <th className="px-6 py-4 font-semibold">Valor</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {data.tableData.map((row) => (
                        <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">{row.numero}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${row.tipo === 'Oficina' ? 'bg-blue-500/10 text-blue-600' : 'bg-orange-500/10 text-orange-600'}`}>
                              {row.tipo}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{formatDate(row.data)}</td>
                          <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(row.valor)}</td>
                          <td className="px-6 py-4">
                            <span className="bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full text-xs font-semibold">Pago</span>
                          </td>
                        </tr>
                      ))}
                      {data.tableData.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">Nenhuma ordem encontrada para o período.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
