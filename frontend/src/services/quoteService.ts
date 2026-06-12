import { api } from './api';

export const quoteService = {
  async getQuote(id: string) {
    const response = await api.get(`/quotes/${id}`);
    return response.data;
  },

  async saveQuote(data: any) {
    const response = await api.post('/quotes', data);
    return response.data;
  },

  async updateQuote(id: string, data: any) {
    const response = await api.put(`/quotes/${id}`, data);
    return response.data;
  },
  
  async sendEmail(quoteId: string) {
    const response = await api.post(`/quotes/${quoteId}/send-email`);
    return response.data;
  }
};
