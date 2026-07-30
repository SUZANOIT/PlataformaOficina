import axios from 'axios';

// Usando o endpoint base da aplicação (ajuste caso tenha um baseURL configurado)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

// Interceptor para adicionar o token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

  // Upload em Lote (Bulk Upload)
  bulkUpload: async (competencia: string, tipoImposto: string, vencimento: string, files: File[]) => {
    const formData = new FormData();
    formData.append('competencia', competencia);
    formData.append('tipoImposto', tipoImposto);
    formData.append('vencimento', vencimento);

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
