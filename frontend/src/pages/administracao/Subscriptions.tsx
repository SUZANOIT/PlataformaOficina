import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  CreditCard, 
  Check, 
  X, 
  Calendar, 
  Terminal, 
  Building
} from 'lucide-react';
import { toast } from 'sonner';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [gatewayLogs, setGatewayLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subs' | 'logs'>('subs');
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subsData, logsData] = await Promise.all([
        SaaSAPIService.listSubscriptions(),
        SaaSAPIService.getGatewayLogs()
      ]);
      setSubscriptions(subsData);
      setGatewayLogs(logsData);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados de assinaturas.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRenovate = async (id: string) => {
    setIsActionLoading(id);
    try {
      await SaaSAPIService.renovateSubscription(id);
      toast.success('Assinatura renovada com sucesso por mais 30 dias!');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao renovar assinatura.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta assinatura? O acesso do cliente será alterado para suspenso.')) {
      return;
    }
    setIsActionLoading(id);
    try {
      await SaaSAPIService.cancelSubscription(id);
      toast.warning('Assinatura cancelada com sucesso.');
      loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Erro ao cancelar assinatura.');
    } finally {
      setIsActionLoading(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Ativa': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'Pendente': return 'bg-sky-500/10 text-sky-400 border border-sky-500/20';
      case 'Atrasada': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Cancelada': return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
      default: return 'bg-slate-500/10 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Controle de Assinaturas</h2>
          <p className="text-xs text-slate-400">Monitore pagamentos, cancele ou force renovações manuais e inspecione logs dos gateways de pagamento.</p>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('subs')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition flex-1 sm:flex-initial ${
              activeTab === 'subs' ? 'bg-indigo-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard size={14} />
            <span>Assinaturas</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition flex-1 sm:flex-initial ${
              activeTab === 'logs' ? 'bg-indigo-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Terminal size={14} />
            <span>Gateway Logs</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
        </div>
      ) : activeTab === 'subs' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          {subscriptions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              Nenhuma assinatura cadastrada no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                    <th className="p-4">Empresa (Tenant)</th>
                    <th className="p-4">Plano</th>
                    <th className="p-4">Valor Mensal</th>
                    <th className="p-4">Forma de Pgto</th>
                    <th className="p-4">Renovação / Vencimento</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/10">
                      <td className="p-4 font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                          <Building size={14} className="text-slate-500" />
                          <div>
                            <div>{sub.tenant?.razaoSocial}</div>
                            <div className="text-[9px] font-mono text-slate-500 mt-0.5">{sub.tenant?.cnpj}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-block bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 text-[10px] font-extrabold text-indigo-400">
                          {sub.plan?.nome || 'Personalizado'}
                        </span>
                      </td>
                      <td className="p-4 font-mono font-bold text-white">
                        {formatCurrency(sub.valor)}
                      </td>
                      <td className="p-4 text-slate-400 font-semibold">
                        {sub.formaPagamento || 'Não informada'}
                      </td>
                      <td className="p-4 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-500" />
                          <span>{new Date(sub.dataRenovacao).toLocaleDateString('pt-BR')}</span>
                        </div>
                        {sub.ultimoPagamento && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Último pagamento: {new Date(sub.ultimoPagamento).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusBadge(sub.status)}`}>
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {sub.status !== 'Ativa' && (
                            <button
                              onClick={() => handleRenovate(sub.id)}
                              disabled={isActionLoading === sub.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-lg text-[10px] uppercase transition disabled:opacity-50"
                              title="Confirmar Pagamento / Forçar Renovação"
                            >
                              <Check size={11} />
                              <span>Renovar</span>
                            </button>
                          )}
                          {sub.status !== 'Cancelada' && (
                            <button
                              onClick={() => handleCancel(sub.id)}
                              disabled={isActionLoading === sub.id}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-extrabold rounded-lg text-[10px] uppercase border border-rose-500/20 transition disabled:opacity-50"
                              title="Cancelar Assinatura"
                            >
                              <X size={11} />
                              <span>Cancelar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Gateway Logs Tab */
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-2">
            <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              <Terminal size={14} className="text-indigo-400 animate-pulse" />
              Logs de Webhooks e Transações de Gateway (Mocked)
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold">
              Rastreamento em tempo real de eventos recebidos do Stripe, Asaas, Mercado Pago e PagSeguro.
            </p>
          </div>

          <div className="space-y-3">
            {gatewayLogs.map((log) => (
              <div key={log.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-850 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-950 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-black">
                      {log.gateway}
                    </span>
                    <span className="text-slate-300 font-bold">{log.event}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      log.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {log.status}
                    </span>
                    <span className="text-[10px] text-slate-500">{new Date(log.date).toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-850 text-slate-300 overflow-x-auto select-all scrollbar-thin">
                  <pre className="text-[11px] leading-relaxed">{JSON.stringify(JSON.parse(log.payload), null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
