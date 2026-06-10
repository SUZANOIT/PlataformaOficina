import { useState, useEffect, useCallback } from 'react';
import { SaaSAPIService } from '../../services/saas';
import { 
  Search, 
  RefreshCw, 
  User, 
  Calendar, 
  Network,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { toast } from 'sonner';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function Auditoria() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter fields
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Pagination state (server-side)
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadLogs = useCallback(async (targetPage: number, targetSize: number, filters?: { user?: string; acao?: string; search?: string }) => {
    try {
      setIsLoading(true);
      const data = await SaaSAPIService.listAuditLogs({
        user: filters?.user ?? (userFilter || undefined),
        acao: filters?.acao ?? (actionFilter || undefined),
        search: filters?.search ?? (searchFilter || undefined),
        page: targetPage,
        size: targetSize,
        sort: 'dataHora,desc'
      });
      setLogs(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      setPage(data.page);
      setSize(data.size);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar logs de auditoria.');
    } finally {
      setIsLoading(false);
    }
  }, [userFilter, actionFilter, searchFilter]);

  useEffect(() => {
    loadLogs(0, 20);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(0, size);
  };

  const handleClearFilters = () => {
    setUserFilter('');
    setActionFilter('');
    setSearchFilter('');
    loadLogs(0, size, { user: undefined, acao: undefined, search: undefined });
  };

  const handleChangeSize = (newSize: number) => {
    loadLogs(0, newSize);
  };

  const goToPage = (target: number) => {
    if (target < 0 || (totalPages > 0 && target > totalPages - 1) || target === page) return;
    loadLogs(target, size);
  };

  const firstItem = totalElements === 0 ? 0 : page * size + 1;
  const lastItem = Math.min((page + 1) * size, totalElements);
  const isFirstPage = page <= 0;
  const isLastPage = totalPages === 0 || page >= totalPages - 1;

  const paginationBtnClass = (disabled: boolean) =>
    `p-1.5 rounded-lg border border-slate-800 transition ${
      disabled
        ? 'text-slate-700 cursor-not-allowed'
        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-white uppercase tracking-wider">Histórico de Auditoria</h2>
          <p className="text-xs text-slate-400">Rastreamento de ações administrativas de segurança, alteração de status de empresas, configurações e senhas.</p>
        </div>

        <button
          onClick={() => loadLogs(page, size)}
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
              <option value="Criação Tenant">Criação Empresa</option>
              <option value="Edição Tenant">Edição Empresa</option>
              <option value="Bloqueio Tenant">Bloqueio Empresa</option>
              <option value="Suspensão Tenant">Suspensão Empresa</option>
              <option value="Reativação Tenant">Reativação Empresa</option>
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
            Nenhum registro encontrado.
          </div>
        ) : (
          <div className="w-full">
            <table className="w-full text-left border-collapse table-fixed break-words">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider bg-slate-950/20">
                  <th className="p-4 w-4/12 sm:w-2/12">Data e Hora</th>
                  <th className="p-4 w-4/12 sm:w-3/12 lg:w-3/12">Usuário SaaS</th>
                  <th className="p-4 w-4/12 sm:w-3/12 lg:w-2/12">Ação Realizada</th>
                  <th className="p-4 hidden sm:table-cell sm:w-4/12 lg:w-4/12">Detalhes da Ação</th>
                  <th className="p-4 hidden lg:table-cell lg:w-1/12">IP / Origem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/10">
                    <td className="p-4 text-slate-400 truncate">
                      <div className="flex items-center gap-1.5 text-[11px] truncate">
                        <Calendar size={12} className="text-slate-500 shrink-0" />
                        <span className="truncate">{new Date(log.createdAt).toLocaleString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 font-bold truncate">
                      <div className="flex items-center gap-2 truncate">
                        <User size={13} className="text-indigo-400 shrink-0" />
                        <span className="truncate">{log.usuario}</span>
                      </div>
                    </td>
                    <td className="p-4 truncate">
                      <span className="inline-block bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800 text-[10px] font-extrabold text-indigo-400 truncate block w-fit">
                        {log.acao}
                      </span>
                      <div className="sm:hidden mt-1 text-slate-300 font-sans font-medium text-[10px] truncate leading-relaxed">
                        {log.detalhes}
                      </div>
                    </td>
                    <td className="p-4 text-slate-300 font-sans font-medium text-[11px] leading-relaxed hidden sm:table-cell truncate">
                      <div className="truncate" title={log.detalhes}>{log.detalhes}</div>
                    </td>
                    <td className="p-4 text-slate-500 font-bold hidden lg:table-cell truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <Network size={12} className="text-slate-600 shrink-0" />
                        <span className="truncate">{log.ip}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!isLoading && totalElements > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-950/20">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-400 font-semibold">
                Mostrando {firstItem} a {lastItem} de {totalElements} registros
              </span>
              <select
                value={size}
                onChange={(e) => handleChangeSize(Number(e.target.value))}
                className="bg-slate-950 border border-slate-800 rounded-lg py-1 px-2 text-[11px] text-slate-300 focus:border-indigo-500 focus:outline-none"
                title="Registros por página"
              >
                {PAGE_SIZE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt} por página</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => goToPage(0)}
                disabled={isFirstPage}
                className={paginationBtnClass(isFirstPage)}
                title="Primeira página"
              >
                <ChevronsLeft size={15} />
              </button>
              <button
                onClick={() => goToPage(page - 1)}
                disabled={isFirstPage}
                className={paginationBtnClass(isFirstPage)}
                title="Página anterior"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] text-slate-300 font-bold px-2">
                Página {page + 1} de {Math.max(totalPages, 1)}
              </span>
              <button
                onClick={() => goToPage(page + 1)}
                disabled={isLastPage}
                className={paginationBtnClass(isLastPage)}
                title="Próxima página"
              >
                <ChevronRight size={15} />
              </button>
              <button
                onClick={() => goToPage(totalPages - 1)}
                disabled={isLastPage}
                className={paginationBtnClass(isLastPage)}
                title="Última página"
              >
                <ChevronsRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
