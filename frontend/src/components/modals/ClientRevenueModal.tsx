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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border w-full max-w-5xl rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8 relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 mr-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <DollarSign size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Receita do Cliente</h3>
              <p className="text-sm text-muted-foreground font-medium">{client?.nome} {client?.empresa ? `- ${client.empresa}` : ''}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted/50 transition"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-background/50">
          {loading ? (
            <div className="space-y-8 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 h-24"></div>
                ))}
              </div>
              <div className="bg-card border border-border rounded-xl h-72"></div>
              <div className="bg-card border border-border rounded-xl h-48"></div>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                <BarChart3 size={32} className="text-muted-foreground/50" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-foreground">Nenhum dado financeiro</h4>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  Este cliente não possui orçamentos aprovados ou faturados no ano atual para gerar os indicadores de receita.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Indicators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-emerald-500/30 transition duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Receita Total ({new Date().getFullYear()})</p>
                  <h3 className="text-2xl font-black text-emerald-500">{formatCurrency(data.totalRevenue)}</h3>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-blue-500/30 transition duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">OS Concluídas</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-foreground">{data.approvedCount}</h3>
                    <FileCheck size={16} className="text-blue-500" />
                  </div>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-amber-500/30 transition duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Ticket Médio</p>
                  <h3 className="text-2xl font-black text-foreground">{formatCurrency(data.averageTicket)}</h3>
                </div>

                <div className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-purple-500/30 transition duration-300 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-wider mb-1">Maior Receita/Mês</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-foreground">{formatCurrency(data.maxMonthlyRevenue)}</h3>
                    <TrendingUp size={16} className="text-purple-500" />
                  </div>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
                <h4 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
                  <BarChart3 size={18} className="text-primary" />
                  Evolução da Receita Anual
                </h4>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data.monthlyData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="mes" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dx={-10}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value as number), 'Receita']}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold', marginBottom: 4 }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          borderColor: 'hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                        }}
                        itemStyle={{ color: '#10b981', fontWeight: 600 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="receita" 
                        stroke="#10b981" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorReceita)" 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                <div className="p-5 border-b border-border bg-muted/20">
                  <h4 className="text-sm font-bold text-foreground">Detalhamento Mensal</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border text-muted-foreground text-xs font-bold uppercase tracking-wider">
                        <th className="p-4 w-1/3">Mês</th>
                        <th className="p-4 w-1/3 text-center">Qtd. OS Aprovadas</th>
                        <th className="p-4 w-1/3 text-right">Receita Gerada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyData.map((row, idx) => (
                        <tr key={idx} className="border-b border-border hover:bg-muted/30 transition-colors last:border-0">
                          <td className="p-4 font-medium text-foreground">{row.mes}</td>
                          <td className="p-4 text-center">
                            {row.quantidade > 0 ? (
                              <span className="inline-flex items-center justify-center bg-blue-500/10 text-blue-600 font-bold px-2.5 py-0.5 rounded-full text-xs">
                                {row.quantidade}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className={`p-4 text-right font-bold ${row.receita > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
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
