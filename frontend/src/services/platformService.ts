import { api } from './api';

export const platformService = {
  async list(params: { search?: string; status?: string; page?: number; limit?: number }) {
    const response = await api.get('/registry/platforms', { params });
    return response.data;
  },

  async create(data: any) {
    const response = await api.post('/registry/platforms', data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.put(`/registry/platforms/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    const response = await api.delete(`/registry/platforms/${id}`);
    return response.data;
  },

  async getHistory(id: string) {
    const response = await api.get(`/registry/platforms/${id}/history`);
    return response.data;
  }
};
