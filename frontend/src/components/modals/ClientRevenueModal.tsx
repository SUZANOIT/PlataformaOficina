import { useEffect, useState } from 'react';
import { 
  X, 
  DollarSign, 
  TrendingUp, 
  FileCheck, 
  BarChart3
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';
import { handleApiError } from '../../utils/toast.helper';

interface ClientRevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

interface RevenueData {
  totalRevenue: number;
  approvedCount: number;
  averageTicket: number;
  maxMonthlyRevenue: number;
  monthlyData: {
    mes: string;
    receita: number;
    quantidade: number;
  }[];
}

export function ClientRevenueModal({ isOpen, onClose, client }: ClientRevenueModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RevenueData | null>(null);

  useEffect(() => {
    if (isOpen && client) {
      fetchRevenue();
    }
  }, [isOpen, client]);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/registry/clients/${client.id}/revenue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        handleApiError(response, 'Erro ao carregar dados de receita.');
        onClose();
      }
    } catch (error) {
      console.error('Failed to fetch revenue', error);
      toast.error('Erro de conexão ao buscar receita.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const hasData = data && data.totalRevenue > 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-card/95 backdrop-blur-xl border border-border/50 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative flex flex-col max-h-[90vh] ring-1 ring-white/10">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-border/50 flex justify-between items-center bg-gradient-to-r from-muted/50 to-transparent shrink-0">
          <div className="flex items-center gap-4 mr-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 shrink-0 transform transition-transform hover:scale-105">
              <DollarSign size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                Receita do Cliente
              </h3>
              <p className="text-sm text-muted-foreground font-medium mt-0.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {client?.nome} {client?.empresa ? `• ${client.empresa}` : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-2.5 rounded-xl transition-all duration-200 hover:rotate-90"
            aria-label="Fechar"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="space-y-8 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-muted/30 rounded-2xl p-6 h-32"></div>
                ))}
              </div>
              <div className="bg-muted/30 rounded-2xl h-80"></div>
              <div className="bg-muted/30 rounded-2xl h-56"></div>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-5 animate-in slide-in-from-bottom-4 duration-500">
              <div className="w-20 h-20 bg-muted/50 rounded-3xl flex items-center justify-center shadow-inner">
                <BarChart3 size={40} className="text-muted-foreground/40" />
              </div>
              <div>
                <h4 className="text-xl font-bold text-foreground">Nenhum dado financeiro</h4>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-2 leading-relaxed">
                  Este cliente ainda não possui orçamentos pagos no ano atual para gerar os indicadores de receita.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              
              {/* Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all duration-500"></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Receita Total ({new Date().getFullYear()})</p>
                  <h3 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-emerald-400 relative z-10 drop-shadow-sm">
                    {formatCurrency(data.totalRevenue)}
                  </h3>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500"></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">OS Pagas</p>
                  <div className="flex items-center gap-3 relative z-10">
                    <h3 className="text-3xl font-black text-foreground">{data.approvedCount}</h3>
                    <div className="p-1.5 bg-blue-500/10 rounded-lg">
                      <FileCheck size={20} className="text-blue-500" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-amber-500/30 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500"></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Ticket Médio</p>
                  <h3 className="text-3xl font-black text-foreground relative z-10">{formatCurrency(data.averageTicket)}</h3>
                </div>

                <div className="bg-card border border-border/50 p-6 rounded-3xl shadow-sm hover:shadow-md hover:border-purple-500/30 transition-all duration-300 relative overflow-hidden group">
                  <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500"></div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 relative z-10">Maior Receita/Mês</p>
                  <div className="flex items-center justify-between relative z-10">
                    <h3 className="text-2xl font-black text-foreground">{formatCurrency(data.maxMonthlyRevenue)}</h3>
                    <div className="p-1.5 bg-purple-500/10 rounded-lg">
                      <TrendingUp size={18} className="text-purple-500" strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-card/80 border border-border/50 p-8 rounded-3xl shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700 pointer-events-none"></div>
                <h4 className="text-sm font-bold text-foreground mb-8 flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                    <BarChart3 size={20} />
                  </div>
                  Evolução da Receita Anual
                </h4>
                <div className="h-72 w-full relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.monthlyData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="mes" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                        dy={15}
                      />
                      <YAxis 
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                        dx={-15}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value as number), 'Receita']}
                        labelStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12, marginBottom: 8 }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '16px',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
                          padding: '12px 16px'
                        }}
                        itemStyle={{ color: '#10b981', fontWeight: 800, fontSize: 16 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="receita" 
                        stroke="#10b981" 
                        strokeWidth={4}
                        fillOpacity={1} 
                        fill="url(#colorReceita)" 
                        activeDot={{ r: 6, strokeWidth: 4, stroke: 'hsl(var(--card))', fill: '#10b981' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-card/80 border border-border/50 rounded-3xl shadow-sm overflow-hidden backdrop-blur-xl">
                <div className="p-6 border-b border-border/50 bg-muted/10">
                  <h4 className="text-sm font-bold text-foreground tracking-wide">Detalhamento Mensal</h4>
                </div>
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/50 text-muted-foreground text-xs font-black uppercase tracking-widest">
                        <th className="p-5 w-1/3 pl-8">Mês</th>
                        <th className="p-5 w-1/3 text-center">Qtd. OS Pagas</th>
                        <th className="p-5 w-1/3 text-right pr-8">Receita Gerada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyData.map((row, idx) => (
                        <tr key={idx} className="border-b border-border/30 hover:bg-muted/40 transition-all duration-200 last:border-0 group">
                          <td className="p-5 pl-8 font-semibold text-foreground group-hover:text-primary transition-colors">{row.mes}</td>
                          <td className="p-5 text-center">
                            {row.quantidade > 0 ? (
                              <span className="inline-flex items-center justify-center bg-blue-500/10 text-blue-600 font-bold px-3 py-1 rounded-xl text-xs ring-1 ring-blue-500/20">
                                {row.quantidade} {row.quantidade === 1 ? 'OS' : 'OSs'}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </td>
                          <td className={`p-5 pr-8 text-right font-black ${row.receita > 0 ? 'text-emerald-500' : 'text-muted-foreground/50'}`}>
                            {row.receita > 0 ? formatCurrency(row.receita) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
