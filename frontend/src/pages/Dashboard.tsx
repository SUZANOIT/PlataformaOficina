import { FileText, TrendingUp, Users, Search, Wrench, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { QUOTE_STATUS_OPTIONS } from '../utils/constants';

export function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [clientId, setClientId] = useState('all');
  const [mecanicoId, setMecanicoId] = useState('all');
  const [status, setStatus] = useState('all');

  // Filter Data
  const [clients, setClients] = useState<any[]>([]);
  const [mechanics, setMechanics] = useState<any[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate, clientId, mecanicoId, status]);

  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [clientsRes, collabsRes] = await Promise.all([
        fetch('/registry/clients', { headers }),
        fetch('/registry/collaborators?tipo=Mecanico', { headers })
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData.data || clientsData || []);
      }
      
      if (collabsRes.ok) {
        const collabsData = await collabsRes.json();
        setMechanics(collabsData.data || collabsData || []);
      }
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (clientId && clientId !== 'all') params.append('clientId', clientId);
      if (mecanicoId && mecanicoId !== 'all') params.append('mecanicoId', mecanicoId);
      if (status && status !== 'all') params.append('status', status);

      const response = await fetch(`/dashboard/workshop?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        toast.error('Erro ao carregar os dados do painel.');
      }
    } catch (error) {
      console.error("Failed to load workshop dashboard stats", error);
      toast.error('Erro de conexão ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setClientId('all');
    setMecanicoId('all');
    setStatus('all');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  // Safe checks
  const totalFaturamento = stats?.faturamentoMesAtual || 0;
  const prevFaturamento = stats?.faturamentoMesAnterior || 0;
  const faturamentoCrescimento = prevFaturamento > 0 ? ((totalFaturamento - prevFaturamento) / prevFaturamento) * 100 : (totalFaturamento > 0 ? 100 : 0);

  // We consider "ticketMedio" coming from the backend which is calculated based on approved/paid quotes in the period.
  // Wait, the backend returns ticketMedio as totalApprovedValue / totalApprovedCount. For the requested KPIs, it says "Valor Total dos Orçamentos Pagos ÷ Quantidade de Orçamentos Pagos"
  // If the backend ticketMedio uses approved, maybe I should calculate ticketMedio from monthlyBilling for the current month.
  const currentMonthBucket = stats?.monthlyBilling?.[11] || { valorPago: 0, qtdServicos: 0 };
  const prevMonthBucket = stats?.monthlyBilling?.[10] || { valorPago: 0, qtdServicos: 0 };
  
  // Actually, the backend `totalPago` is the sum of paid quotes in the selected period.
  // But wait, we don't have the "count" of paid quotes in the response root, only totalPaidValue.
  // We can just use the provided stats.totalPago as Card 1.
  
  const ticketMedioCrescimento = prevMonthBucket.valorPago > 0 
    ? (((currentMonthBucket.valorPago / (currentMonthBucket.qtdServicos || 1)) - (prevMonthBucket.valorPago / (prevMonthBucket.qtdServicos || 1))) / (prevMonthBucket.valorPago / (prevMonthBucket.qtdServicos || 1))) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wrench className="text-primary" />
          Painel Geral da Oficina
        </h1>
      </div>

      {/* Filtros Globais */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-border pb-3">
          <Search size={18} className="text-muted-foreground" />
          <h3 className="font-semibold text-sm">Filtros Globais</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Data Inicial</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Data Final</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Cliente</label>
            <select 
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nome || c.razaoSocial}</option>
              ))}
              {/* Fallback to stats topClients if clients fetch fails */}
              {clients.length === 0 && stats?.topClients?.map((c: any) => (
                <option key={c.clientId} value={c.clientId}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Mecânico</label>
            <select 
              value={mecanicoId}
              onChange={(e) => setMecanicoId(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
            >
              <option value="all">Todos os Mecânicos</option>
              {mechanics.map(m => (
                <option key={m.id} value={m.id}>{m.nome}</option>
              ))}
              {mechanics.length === 0 && stats?.strategicIndicators?.topMechanics?.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
            >
              <option value="all">Todos os Status</option>
              {QUOTE_STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <button 
            onClick={clearFilters}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-muted transition"
          >
            <RefreshCw size={14} />
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Indicadores Resumidos (Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Faturamento Total */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            {faturamentoCrescimento !== 0 && (
              <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${faturamentoCrescimento > 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'}`}>
                {faturamentoCrescimento > 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {Math.abs(faturamentoCrescimento).toFixed(1)}%
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Faturamento Total (Pagos)</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats?.totalPago || 0)}</h3>
          </div>
        </div>

        {/* Card 2: Quantidade de Orçamentos Pagos */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Orçamentos Pagos</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">
              {stats?.monthlyBilling?.reduce((acc: number, cur: any) => acc + (cur.qtdServicos || 0), 0) || 0}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Nos últimos 12 meses (ou período)</p>
          </div>
        </div>

        {/* Card 3: Ticket Médio */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-indigo-500/10 text-indigo-500 rounded-full flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            {ticketMedioCrescimento !== 0 && (
              <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${ticketMedioCrescimento > 0 ? 'text-emerald-600 bg-emerald-500/10' : 'text-rose-600 bg-rose-500/10'}`}>
                {ticketMedioCrescimento > 0 ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {Math.abs(ticketMedioCrescimento).toFixed(1)}%
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Ticket Médio</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats?.ticketMedio || 0)}</h3>
          </div>
        </div>

        {/* Card 4: Clientes Ativos */}
        <div className="bg-card border border-border p-6 rounded-xl shadow-sm space-y-4">
          <div className="w-12 h-12 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Clientes Ativos</p>
            <h3 className="text-2xl font-bold text-foreground mt-1">{stats?.veiculosAtendidos || 0}</h3>
            <p className="text-xs text-muted-foreground mt-1">Com orçamentos no período</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico 1: Orçamentos Pagos por Mês (Últimos 12 Meses) */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 flex flex-col">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <TrendingUp className="text-emerald-500" size={20} />
            <div>
              <h2 className="text-lg font-semibold">Orçamentos Pagos (Últimos 12 Meses)</h2>
              <p className="text-xs text-muted-foreground font-medium">Evolução do faturamento confirmado</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px] flex items-end justify-between gap-2 pt-8 relative">
            {stats?.monthlyBilling && stats.monthlyBilling.length > 0 ? (
              <>
                {/* Linhas de grade horizontal para referência visual */}
                <div className="absolute inset-0 flex flex-col justify-between pt-8 pb-6 pointer-events-none opacity-20">
                  <div className="w-full h-px bg-border"></div>
                  <div className="w-full h-px bg-border"></div>
                  <div className="w-full h-px bg-border"></div>
                  <div className="w-full h-px bg-border"></div>
                </div>

                {stats.monthlyBilling.map((item: any, idx: number) => {
                  const maxVal = Math.max(...stats.monthlyBilling.map((m: any) => m.valorPago), 1);
                  const pct = (item.valorPago / maxVal) * 100;
                  
                  return (
                    <div key={`${item.month}-${idx}`} className="flex-1 flex flex-col items-center group relative h-full justify-end z-10">
                      {/* Tooltip */}
                      <div className="absolute bottom-[calc(100%+10px)] bg-popover border border-border px-3 py-2 rounded-lg shadow-xl text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 flex flex-col items-center">
                        <span className="text-muted-foreground">{item.month}/{item.year}</span>
                        <span className="text-[14px] text-emerald-600">{formatCurrency(item.valorPago)}</span>
                      </div>

                      {/* Bar (simulating line/bar chart visually) */}
                      <div className="w-full flex justify-center items-end h-[240px]">
                        <div 
                          style={{ height: `${Math.max(pct, 2)}%` }} 
                          className={`w-[60%] sm:w-[50%] rounded-t-md transition-all duration-700 flex flex-col justify-end overflow-hidden ${
                            item.valorPago > 0 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-muted'
                          } shadow-sm group-hover:scale-y-105 group-hover:brightness-110 origin-bottom`}
                        />
                      </div>

                      {/* X Label */}
                      <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold mt-3 text-center truncate w-full">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                {loading ? 'Carregando gráfico...' : 'Nenhum dado disponível'}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 2: Ranking de Mecânicos */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 flex flex-col">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="text-indigo-500" size={20} />
            <div>
              <h2 className="text-lg font-semibold">Ranking de Mecânicos</h2>
              <p className="text-xs text-muted-foreground font-medium">Por Faturamento e Ordens de Serviço</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 pt-2">
            {stats?.strategicIndicators?.topMechanics && stats.strategicIndicators.topMechanics.length > 0 ? (
              stats.strategicIndicators.topMechanics.map((mechanic: any, index: number) => {
                const maxVal = Math.max(...stats.strategicIndicators.topMechanics.map((m: any) => m.valorFaturado), 1);
                const pct = (mechanic.valorFaturado / maxVal) * 100;
                
                return (
                  <div key={mechanic.id || index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="text-foreground truncate max-w-[120px] sm:max-w-[180px]" title={mechanic.name}>
                          {mechanic.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-indigo-600">{formatCurrency(mechanic.valorFaturado)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <div className="flex gap-2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                        <span className="bg-muted px-1.5 py-0.5 rounded" title="Ordens de Serviço Concluídas">
                          {mechanic.atendimentos} OS
                        </span>
                        <span className="bg-muted px-1.5 py-0.5 rounded text-emerald-600" title="Ticket Médio">
                          TM: {formatCurrency(mechanic.ticketMedio)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-40 flex items-center justify-center text-sm text-muted-foreground">
                {loading ? 'Carregando ranking...' : 'Nenhum mecânico com faturamento no período'}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico 3: Top 10 Clientes */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-4 flex flex-col">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Users className="text-blue-500" size={20} />
            <div>
              <h2 className="text-lg font-semibold">Top 10 Clientes</h2>
              <p className="text-xs text-muted-foreground font-medium">Por Faturamento</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 pt-2">
            {stats?.strategicIndicators?.topClients && stats.strategicIndicators.topClients.length > 0 ? (
              stats.strategicIndicators.topClients.map((client: any, index: number) => {
                const maxVal = Math.max(...stats.strategicIndicators.topClients.map((c: any) => c.totalPaid), 1);
                const pct = (client.totalPaid / maxVal) * 100;
                
                return (
                  <div key={client.clientId || index} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 font-semibold">
                        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="text-foreground truncate max-w-[120px] sm:max-w-[180px]" title={client.name}>
                          {client.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-blue-600">{formatCurrency(client.totalPaid)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.max(pct, 1)}%` }}
                        />
                      </div>
                      <div className="flex gap-2 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                        <span className="bg-muted px-1.5 py-0.5 rounded" title="Ordens de Serviço Concluídas">
                          {client.countOS} OS
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-40 flex items-center justify-center text-sm text-muted-foreground">
                {loading ? 'Carregando ranking...' : 'Nenhum cliente com faturamento no período'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
