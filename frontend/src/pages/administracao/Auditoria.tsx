import { useState, useEffect } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Search, 
  RefreshCw, 
  User, 
  Calendar, 
  Network
} from 'lucide-react';
import { toast } from 'sonner';

export function Auditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter fields
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const data = await SaaSAPIService.listAuditLogs({
        user: userFilter || undefined,
        acao: actionFilter || undefined,
        search: searchFilter || undefined
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar logs de auditoria.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  const handleClearFilters = () => {
    setUserFilter('');
    setActionFilter('');
    setSearchFilter('');
    // Wait for state updates to trigger loading or call directly with empty parameters
    setTimeout(() => {
      loadLogs();
    }, 50);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Histórico de Auditoria</h2>
          <p className="text-xs text-slate-400">Rastreamento de ações administrativas de segurança, alteração de status de tenants, configurações e senhas.</p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs border border-slate-800 transition w-full sm:w-auto"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Atualizar Logs</span>
        </button>
      </div>

      {/* Filter Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtrar por Usuário</label>
            <input
              type="text"
              placeholder="Ex: admin@suzanoit.com"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filtrar por Ação</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 rounded-xl py-2 px-3.5 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
            >
              <option value="">Todas as ações</option>
              <option value="Acesso Dashboard">Acesso Dashboard</option>
              <option value="Criação Tenant">Criação Tenant</option>
              <option value="Edição Tenant">Edição Tenant</option>
              <option value="Bloqueio Tenant">Bloqueio Tenant</option>
              <option value="Suspensão Tenant">Suspensão Tenant</option>
              <option value="Reativação Tenant">Reativação Tenant</option>
              <option value="Reset Senha Tenant Admin">Reset Senha Local</option>
              <option value="Criação Plano">Criação Plano</option>
              <option value="Edição Plano">Edição Plano</option>
              <option value="Duplicação Plano">Duplicação Plano</option>
              <option value="Habilitar Módulo">Habilitar Módulo</option>
              <option value="Desabilitar Módulo">Desabilitar Módulo</option>
              <option value="Criação Usuário SaaS">Criação Usuário SaaS</option>
              <option value="Edição Usuário SaaS">Edição Usuário SaaS</option>
              <option value="Reset Senha Usuário SaaS">Reset Senha Interno</option>
              <option value="Disparo Notificação">Disparo Notificação</option>
              <option value="Alteração Configurações">Alteração Configurações</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pesquisa Geral</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Detalhes ou IP..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-855 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex-1 py-2.5 border border-slate-800 hover:text-white text-slate-400 rounded-xl text-xs font-bold transition"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-slate-950 font-black rounded-xl text-xs transition"
            >
              Filtrar
            </button>
          </div>
        </form>
      </div>

      {/* Logs Table / List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
            Nenhum registro de auditoria localizado com estes filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                  <th className="p-4">Data e Hora</th>
                  <th className="p-4">Usuário SaaS</th>
                  <th className="p-4">Ação Realizada</th>
                  <th className="p-4">Detalhes da Ação</th>
                  <th className="p-4">IP / Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/10">
                    <td className="p-4 text-slate-400">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Calendar size={12} className="text-slate-500 shrink-0" />
                        <span>{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 font-bold">
                      <div className="flex items-center gap-2">
                        <User size={13} className="text-indigo-400 shrink-0" />
                        <span>{log.usuario}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="inline-block bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 text-[10px] font-extrabold text-indigo-400">
                        {log.acao}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300 font-sans font-medium text-[11px] leading-relaxed max-w-sm break-words">
                      {log.detalhes}
                    </td>
                    <td className="p-4 text-slate-500 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Network size={12} className="text-slate-600 shrink-0" />
                        <span>{log.ip}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
