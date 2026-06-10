import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Cpu, 
  HardDrive, 
  Database, 
  RefreshCw, 
  Server,
  PlugZap
} from 'lucide-react';
import { toast } from 'sonner';

interface TelemetryData {
  cpuUsage: string | null;
  memoryUsage: string | null;
  postgresSize: string | null;
  diskUsage: string | null;
  apis: Array<{
    name: string;
    status: 'ONLINE' | 'OFFLINE';
    ping: string;
  }>;
}

export function Monitoramento() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTelemetry = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const data = await SaaSAPIService.getTelemetry();
      setTelemetry(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar telemetria operacional.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTelemetry();

    // Auto refresh every 10 seconds
    const interval = setInterval(() => {
      loadTelemetry(true);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const getCPUProgress = (usage: string | null) => {
    if (!usage) return 0;
    return parseFloat(usage.replace('%', '')) || 0;
  };

  const getMemoryUsagePercent = (usage: string | null) => {
    if (!usage) return 0;
    const parts = usage.split(' / ');
    if (parts.length === 2) {
      const used = parseFloat(parts[0]);
      const total = parseFloat(parts[1]);
      if (total > 0) return (used / total) * 100;
    }
    return 0;
  };

  const getDiskUsagePercent = (usage: string | null) => {
    if (!usage) return 0;
    const match = usage.match(/\((\d+)%\)/);
    return match ? parseInt(match[1], 10) : 0;
  };

  if (isLoading || !telemetry) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        <p className="text-xs text-slate-400">Estabelecendo conexão com o canal de telemetria...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Telemetria & Recursos</h2>
          <p className="text-xs text-slate-400">Acompanhe a carga do processador, consumo de memória ram, armazenamento em disco, tamanho do banco de dados e latência das APIs externas.</p>
        </div>

        <button
          onClick={() => loadTelemetry()}
          disabled={isRefreshing}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-800 transition w-full sm:w-auto disabled:opacity-50"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Atualizar Agora</span>
        </button>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* CPU Usage Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Processamento (VCPU)</span>
            <Cpu size={18} className="text-indigo-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-xl font-black text-white">{telemetry.cpuUsage || '—'}</h3>
              <span className="text-[10px] text-slate-500 font-bold">Node Process</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div 
                style={{ width: `${getCPUProgress(telemetry.cpuUsage)}%` }} 
                className="h-full rounded-full bg-indigo-500 transition-all duration-500" 
              />
            </div>
          </div>
        </div>

        {/* RAM Memory Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Memória Heap</span>
            <Server size={18} className="text-emerald-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-base font-black text-white truncate max-w-[140px]" title={telemetry.memoryUsage || ''}>
                {telemetry.memoryUsage ? telemetry.memoryUsage.split(' / ')[0] : '—'}
              </h3>
              {telemetry.memoryUsage && (
                <span className="text-[9px] text-slate-500 font-bold">Total: {telemetry.memoryUsage.split(' / ')[1]}</span>
              )}
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div 
                style={{ width: `${getMemoryUsagePercent(telemetry.memoryUsage)}%` }} 
                className="h-full rounded-full bg-emerald-500 transition-all duration-500" 
              />
            </div>
          </div>
        </div>

        {/* Database size Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Volume do Banco</span>
            <Database size={18} className="text-purple-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-xl font-black text-white">{telemetry.postgresSize || '—'}</h3>
              <span className="text-[10px] text-slate-500 font-bold">PostgreSQL</span>
            </div>
            {!telemetry.postgresSize && (
              <p className="text-[10px] text-slate-500 font-semibold">Sem leitura disponível no momento.</p>
            )}
          </div>
        </div>

        {/* Disk space Card */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[9px] font-bold uppercase tracking-wider">Disco Rígido (SSD)</span>
            <HardDrive size={18} className="text-amber-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-baseline">
              <h3 className="text-sm font-black text-white">{telemetry.diskUsage ? telemetry.diskUsage.split(' (')[0] : '—'}</h3>
              {telemetry.diskUsage && (
                <span className="text-[9px] text-slate-500 font-bold">Uso: {telemetry.diskUsage.split(' (')[1]?.replace(')', '')}</span>
              )}
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
              <div 
                style={{ width: `${getDiskUsagePercent(telemetry.diskUsage)}%` }} 
                className="h-full rounded-full bg-amber-500 transition-all duration-500" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Third-Party APIs Health */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div>
          <h3 className="text-xs font-black uppercase text-white tracking-wider">Status das APIs e Gateways Parceiros</h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Tempo de resposta médio das integrações configuradas</p>
        </div>

        {telemetry.apis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center">
              <PlugZap size={22} className="text-slate-500" />
            </div>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Nenhum dado de telemetria disponível.<br />
              Configure uma integração para visualizar informações.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {telemetry.apis.map((api) => (
              <div 
                key={api.name} 
                className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex items-center justify-between transition hover:border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${api.status === 'ONLINE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-200">{api.name}</h4>
                    <span className="text-[9px] text-slate-500 font-bold block mt-0.5">Gateway / API</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    api.status === 'ONLINE'
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                  }`}>
                    {api.status === 'ONLINE' ? 'Online' : 'Offline'}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold block mt-1">Ping: {api.ping}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
