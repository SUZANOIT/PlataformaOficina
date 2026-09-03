import React, { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
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
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  PieChart as PieChartIcon
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
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { ClientDashboardResponse } from '../types/clientDashboard';
import { HeatMap } from '../components/charts/HeatMap';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export function ClientDashboard() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const client = location.state?.client || { id };
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ClientDashboardResponse | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

  const toggleMonth = (monthKey: string) => {
    setExpandedMonths(prev => ({ ...prev, [monthKey]: !prev[monthKey] }));
  };

  const groupedOrders = useMemo(() => {
    if (!data) return [];
    
    const groups: Record<string, { label: string; dateVal: number; total: number; count: number; items: any[] }> = {};
    
    data.tableData.forEach((row: any) => {
      // row.data is an ISO date string
      const date = new Date(row.data);
      const monthStr = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = {
          label: monthStr.charAt(0).toUpperCase() + monthStr.slice(1),
          dateVal: date.getTime(),
          total: 0,
          count: 0,
          items: []
        };
      }
      
      groups[monthKey].total += row.valor;
      groups[monthKey].count += 1;
      groups[monthKey].items.push(row);
    });
    
    // Sort groups descending by date
    return Object.entries(groups)
      .sort((a, b) => b[1].dateVal - a[1].dateVal)
      .map(([key, group]) => ({ key, ...group }));
  }, [data]);
  const [period, setPeriod] = useState('year'); // year, 30d, 90d

  useEffect(() => {
    if (client && client.id) {
      fetchDashboard();
    }
  }, [client, period]);

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
    <div className="w-full h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-background relative animate-in fade-in duration-300">
      <div className="bg-card w-full h-full flex flex-col shadow-lg border border-border/50 rounded-tl-2xl">
        
        {/* Executive Header */}
        <div className="px-6 py-4 flex flex-col md:flex-row justify-between md:items-start bg-card shrink-0 gap-4">
          <div>
            <h3 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
              Dashboard Executivo
              {data && data.ranking.position > 0 && data.ranking.position <= 10 && (
                <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-500/20">
                  <Trophy size={10} /> TOP {data.ranking.position}
                </span>
              )}
            </h3>
            <div className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              <span className="text-foreground">{client?.nome} {client?.empresa ? `• ${client.empresa}` : ''}</span>
              {client?.cnpj && <span>• CNPJ: {client.cnpj}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="h-8 w-8 rounded-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Exportar"><Download size={14} /></button>
            <button className="h-8 w-8 rounded-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Compartilhar"><Share2 size={14} /></button>
            <button onClick={fetchDashboard} className="h-8 w-8 rounded-md border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="Atualizar"><RefreshCw size={14} /></button>
            <div className="w-px h-5 bg-border mx-1"></div>
            <button onClick={() => navigate(-1)} className="h-8 px-3 rounded-md bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors gap-1.5 font-medium text-xs">
              <ArrowLeft size={14} /> Fechar
            </button>
          </div>
        </div>

        {/* Toolbar (Filters) */}
        <div className="px-6 py-3 border-b border-border/50 bg-muted/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Período:</span>
            <div className="bg-background rounded-md p-0.5 flex items-center border border-border/50 shadow-xs">
              <button onClick={() => setPeriod('30d')} className={`px-3 py-1 text-xs font-medium rounded transition-all ${period === '30d' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>30 dias</button>
              <button onClick={() => setPeriod('90d')} className={`px-3 py-1 text-xs font-medium rounded transition-all ${period === '90d' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>90 dias</button>
              <button onClick={() => setPeriod('year')} className={`px-3 py-1 text-xs font-medium rounded transition-all ${period === 'year' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>Este ano</button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar bg-muted/10">
          {loading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-card rounded-2xl h-36 border border-border/50 p-6 flex flex-col justify-between">
                    <div className="w-24 h-4 bg-muted rounded animate-pulse"></div>
                    <div className="w-32 h-8 bg-muted rounded animate-pulse"></div>
                    <div className="w-20 h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-card rounded-2xl h-[400px] border border-border/50 p-6 flex flex-col gap-4">
                  <div className="w-40 h-6 bg-muted rounded animate-pulse"></div>
                  <div className="flex-1 bg-muted/50 rounded animate-pulse"></div>
                </div>
                <div className="lg:col-span-4 bg-card rounded-2xl h-[400px] border border-border/50 p-6 flex flex-col gap-4">
                  <div className="w-40 h-6 bg-muted rounded animate-pulse"></div>
                  <div className="flex-1 bg-muted/50 rounded-full w-[250px] mx-auto animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-5">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                <BarChart3 size={32} className="text-muted-foreground/60" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-foreground">Nenhum dado para exibir</h4>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-2">
                  Selecione outro período para visualizar os resultados financeiros deste cliente.
                </p>
              </div>
            </div>
          ) : data ? (
            <div className="space-y-4 md:space-y-6 max-w-[1400px] mx-auto pb-10">
              
              {/* Row 1: KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Receita Total</p>
                      <div className="text-muted-foreground/50"><DollarSign size={16} /></div>
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-4">{formatCurrency(data.kpis.totalRevenue)}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderTrend(data.kpis.revenueGrowth)}
                    <span className="text-xs text-muted-foreground">vs. período anterior</span>
                  </div>
                </div>

                <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ordens Pagas</p>
                      <div className="text-muted-foreground/50"><FileCheck size={16} /></div>
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-4">
                      {data.kpis.approvedCount} <span className="text-lg text-muted-foreground font-medium">{data.kpis.approvedCount === 1 ? 'ordem paga' : 'ordens pagas'}</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderTrend(data.kpis.countGrowth)}
                    <span className="text-xs text-muted-foreground">vs. período anterior</span>
                  </div>
                </div>

                <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ticket Médio</p>
                      <div className="text-muted-foreground/50"><Activity size={16} /></div>
                    </div>
                    <h3 className="text-3xl font-bold text-foreground mb-4">{formatCurrency(data.kpis.averageTicket)}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground/70 font-mono bg-muted px-2 py-0.5 rounded">Receita Total / Ordens Pagas</span>
                  </div>
                </div>

                <div className="bg-card border border-border/40 p-6 rounded-2xl shadow-xs relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maior Receita</p>
                      <div className="text-muted-foreground/50"><Trophy size={16} /></div>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-4">
                      {data.kpis.maxRevenueOS ? formatCurrency(data.kpis.maxRevenueOS.valor) : '-'}
                    </h3>
                  </div>
                  {data.kpis.maxRevenueOS ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <span>{data.kpis.maxRevenueOS.numero}</span>
                      <span>•</span>
                      <span>{formatDate(data.kpis.maxRevenueOS.data)}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">-</div>
                  )}
                </div>
              </div>

              {/* Row 2: Main Area Chart & Receita por Serviço */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-stretch">
                <div className="lg:col-span-8 bg-card border border-border/40 p-6 rounded-2xl shadow-xs flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                      Evolução Financeira
                    </h4>
                  </div>
                  <div className="h-[350px] w-full flex-1">
                    {data.monthlyData && data.monthlyData.length > 0 ? (
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
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <TrendingUp size={32} className="text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">Não há dados financeiros suficientes para este período.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-4 bg-card border border-border/40 p-6 rounded-2xl shadow-xs flex flex-col">
                  <h4 className="text-base font-bold text-foreground mb-6">Receita por Serviço</h4>
                  <div className="h-[350px] w-full flex-1">
                    {data.revenueByService && data.revenueByService.length > 0 ? (
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
                            {data.revenueByService.map((_: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any) => formatCurrency(value as number)} />
                          <Legend layout="vertical" verticalAlign="middle" align="center" iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <PieChartIcon size={32} className="text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground text-sm font-medium">Não há receitas por serviço no período selecionado.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Heatmap */}
              <div className="bg-card border border-border/40 p-6 md:p-8 rounded-2xl shadow-xs w-full">
                <h4 className="text-base font-bold text-foreground mb-6 flex items-center gap-2">
                  <Calendar size={18} className="text-muted-foreground"/> 
                  Intensidade Financeira Mensal
                </h4>
                <div className="w-full overflow-x-auto flex justify-center pb-2 pt-20">
                  <div className="max-w-4xl w-full min-w-[600px]">
                    {data.monthlyData && data.monthlyData.length > 0 ? (
                      <HeatMap data={data.monthlyData} />
                    ) : (
                      <div className="text-center py-10">
                        <p className="text-muted-foreground text-sm">Não há dados suficientes para exibir a intensidade financeira.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 4: Financial Table */}
              <div className="bg-card border border-border/40 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-6 border-b border-border/40">
                  <h4 className="text-base font-bold text-foreground">Detalhamento de Ordens</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left table-fixed">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/20">
                      <tr>
                        <th className="px-6 py-4 font-semibold w-[20%]">Número / Mês</th>
                        <th className="px-6 py-4 font-semibold w-[15%]">Tipo</th>
                        <th className="px-6 py-4 font-semibold w-[15%]">Data</th>
                        <th className="px-6 py-4 font-semibold text-right w-[20%]">Valor</th>
                        <th className="px-6 py-4 font-semibold w-[15%]">Status</th>
                        <th className="px-6 py-4 font-semibold text-center w-[15%]">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {groupedOrders.map((group) => (
                        <React.Fragment key={group.key}>
                          {/* Group Header Row */}
                          <tr 
                            className="bg-muted/5 hover:bg-muted/10 transition-colors cursor-pointer group"
                            onClick={() => toggleMonth(group.key)}
                          >
                            <td className="px-6 py-4 font-bold text-foreground flex items-center gap-2">
                              {expandedMonths[group.key] ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronRight size={18} className="text-muted-foreground" />}
                              <span className="capitalize">{group.label}</span>
                            </td>
                            <td className="px-6 py-4 text-muted-foreground font-medium">
                              {group.count} {group.count === 1 ? 'ordem' : 'ordens'}
                            </td>
                            <td className="px-6 py-4"></td>
                            <td className="px-6 py-4 font-bold text-emerald-600 text-right">{formatCurrency(group.total)}</td>
                            <td className="px-6 py-4"></td>
                            <td className="px-6 py-4"></td>
                          </tr>
                          
                          {/* Expanded Items */}
                          {expandedMonths[group.key] && group.items.map((row) => (
                            <tr key={row.id} className="hover:bg-muted/30 transition-colors bg-background">
                              <td className="px-6 py-3 pl-14 font-medium text-foreground border-l-2 border-emerald-500/30">{row.numero}</td>
                              <td className="px-6 py-3">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${row.tipo === 'Oficina' ? 'bg-blue-500/10 text-blue-600' : 'bg-orange-500/10 text-orange-600'}`}>
                                  {row.tipo}
                                </span>
                              </td>
                              <td className="px-6 py-3 text-muted-foreground text-sm">{formatDate(row.data)}</td>
                              <td className="px-6 py-3 text-right">
                                <div className="font-semibold text-foreground">{formatCurrency(row.valor)}</div>
                                {(row.valorEntrada || row.parcelas > 1) && (
                                  <div className="text-xs text-muted-foreground mt-1 flex flex-col items-end gap-0.5">
                                    {row.valorEntrada ? <span>Entrada: {formatCurrency(row.valorEntrada)}</span> : null}
                                    {row.parcelas > 1 ? <span>{row.parcelas}x de {formatCurrency(row.valorParcela || 0)}</span> : null}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-3">
                                <span className="bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-md text-xs font-semibold">Pago</span>
                              </td>
                              <td className="px-6 py-3 text-center">
                                <button className="inline-flex items-center justify-center p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Visualizar Detalhes">
                                  <ArrowUpRight size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                      {groupedOrders.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <FileCheck size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                            <p className="text-muted-foreground text-sm font-medium">Nenhuma ordem encontrada para o período selecionado.</p>
                          </td>
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
