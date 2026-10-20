import { api } from './api';

export const PortalContabilidadeService = {
  // Impostos
  getImpostos: async (params: any) => {
    const { data } = await api.get('/portal-contabilidade/impostos', { params });
    return data;
  },

  getImpostoById: async (id: string) => {
    const { data } = await api.get(`/portal-contabilidade/impostos/${id}`);
    return data;
  },

  createImposto: async (payload: any) => {
    const { data } = await api.post('/portal-contabilidade/impostos', payload);
    return data;
  },

  updateStatus: async (id: string, status: string) => {
    const { data } = await api.patch(`/portal-contabilidade/impostos/${id}/status`, { status });
    return data;
  },

  updateImposto: async (id: string, payload: { competencia: string; tipoImposto: string; vencimento: string; valor: number }) => {
    const { data } = await api.patch(`/portal-contabilidade/impostos/${id}`, payload);
    return data;
  },

  deleteImposto: async (id: string) => {
    const { data } = await api.delete(`/portal-contabilidade/impostos/${id}`);
    return data;
  },

  getResumoMensal: async (params: { companyId?: string; startDate?: string; endDate?: string }) => {
    const { data } = await api.get('/portal-contabilidade/impostos/resumo-mensal', { params });
    return data as {
      tipos: string[];
      linhas: Array<{ competencia: string; total: number; quantidade: number; porTipo: Record<string, number> }>;
      totalPorTipo: Record<string, number>;
      total: number;
      quantidade: number;
    };
  },

  lancarContasPagar: async (id: string) => {
    const { data } = await api.post(`/portal-contabilidade/impostos/${id}/contas-pagar`);
    return data as { payableId: string; numeroLancamento: number };
  },

  downloadImposto: async (id: string, inline = false) => {
    return api.get(`/portal-contabilidade/impostos/${id}/arquivo`, {
      params: inline ? { disposition: 'inline' } : undefined,
      responseType: 'blob',
    });
  },

  downloadLote: async (ids: string[]) => {
    return api.post('/portal-contabilidade/impostos/download-lote', { ids }, { responseType: 'blob' });
  },

  // Upload em Lote (Bulk Upload)
  bulkUpload: async (competencia: string, tipoImposto: string, vencimento: string, valor: string, files: File[]) => {
    const formData = new FormData();
    formData.append('competencia', competencia);
    formData.append('tipoImposto', tipoImposto);
    formData.append('vencimento', vencimento);
    formData.append('valor', valor);

    files.forEach((file) => {
      formData.append('files', file);
    });

    const { data } = await api.post('/portal-contabilidade/impostos/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return data;
  },
};
