import { api } from './api';

/** Cliente HTTP do Portal do Gestor de Frota (todas as rotas são filtradas pela empresa no backend). */
const get = async <T = any>(path: string, params?: Record<string, any>) => (await api.get<T>(`/portal-gestor${path}`, { params })).data;

export const portalGestorApi = {
  dashboard: () => get('/dashboard'),
  /** Gastos mensais por veículo (periodo: 6m | 12m | ano). */
  gastosVeiculos: (periodo: string, opts: { veiculoId?: string; de?: string; ate?: string } = {}) => get('/dashboard/gastos-veiculos', { periodo, ...opts }),
  empresa: () => get('/empresa'),
  updateEmpresa: async (data: any) => (await api.put('/portal-gestor/empresa', data)).data,

  veiculos: (params?: { status?: string; search?: string }) => get<any[]>('/veiculos', params),
  veiculo: (id: string) => get(`/veiculos/${id}`),

  orcamento: (id: string) => get(`/orcamentos/${id}`),
  aprovar: async (id: string) => (await api.post(`/portal-gestor/orcamentos/${id}/aprovar`)).data,
  recusar: async (id: string, motivo: string) => (await api.post(`/portal-gestor/orcamentos/${id}/recusar`, { motivo })).data,

  /** Orçamentos e OS da empresa, com filtros (servico: todos|pecas|mao-de-obra, status) e paginação. */
  ordensServico: (params: { servico?: string; status?: string; veiculoId?: string; page?: number; pageSize?: number }) =>
    get<{ items: any[]; total: number; page: number; pageSize: number; totalPages: number; statusOptions: string[] }>('/ordens-servico', params),
  manutencoes: (params?: { veiculoId?: string }) => get('/manutencoes', params),

  documentos: () => get<any[]>('/documentos'),
  download: (downloadPath: string) => api.get(downloadPath).then(r => r.data as { url: string; nome: string }),

  financeiro: (ano: number) => get('/financeiro', { ano }),

  motoristas: () => get<any[]>('/motoristas'),
  criarMotorista: async (data: any) => (await api.post('/portal-gestor/motoristas', data)).data,
  atualizarMotorista: async (id: string, data: any) => (await api.put(`/portal-gestor/motoristas/${id}`, data)).data,
  excluirMotorista: async (id: string) => api.delete(`/portal-gestor/motoristas/${id}`),

  // Manutenção: solicitação de orçamento -> orçamento -> OS
  solicitacoes: () => get<any[]>('/solicitacoes'),
  solicitacao: (id: string) => get(`/solicitacoes/${id}`),
  criarSolicitacao: async (data: { vehicleId: string; descricao: string }) => (await api.post('/portal-gestor/solicitacoes', data)).data,
  gerarOrdemServico: async (id: string, km: number) => (await api.post(`/portal-gestor/solicitacoes/${id}/ordem-servico`, { km })).data,

  meuAcesso: () => get('/meu-acesso'),
  trocarSenha: async (senhaAtual: string, novaSenha: string) => (await api.post('/portal-gestor/meu-acesso/senha', { senhaAtual, novaSenha })).data,
};

export const apiErrorMessage = (e: any, fallback = 'Não foi possível concluir a operação.') =>
  e?.response?.data?.error || e?.response?.data?.message || fallback;
