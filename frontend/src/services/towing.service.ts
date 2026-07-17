import { api } from './api';

export const towingService = {
  // QUOTES
  listQuotes: async () => {
    const response = await api.get('/api/towing/quotes');
    return response.data;
  },
  getQuote: async (id: string) => {
    const response = await api.get(`/api/towing/quotes/${id}`);
    return response.data;
  },
  createQuote: async (data: any) => {
    const response = await api.post('/api/towing/quotes', data);
    return response.data;
  },
  updateQuote: async (id: string, data: any) => {
    const response = await api.put(`/api/towing/quotes/${id}`, data);
    return response.data;
  },
  deleteQuote: async (id: string) => {
    const response = await api.delete(`/api/towing/quotes/${id}`);
    return response.data;
  },
  getDashboardStats: async () => {
    const response = await api.get('/api/towing/dashboard');
    return response.data;
  },

  // FLEET
  listDrivers: async () => {
    const response = await api.get('/api/towing/drivers');
    return response.data;
  },
  createDriver: async (data: any) => {
    const response = await api.post('/api/towing/drivers', data);
    return response.data;
  },
  updateDriver: async (id: string, data: any) => {
    const response = await api.put(`/api/towing/drivers/${id}`, data);
    return response.data;
  },
  deleteDriver: async (id: string) => {
    const response = await api.delete(`/api/towing/drivers/${id}`);
    return response.data;
  },

  listVehicles: async () => {
    const response = await api.get('/api/towing/vehicles');
    return response.data;
  },
  createVehicle: async (data: any) => {
    const response = await api.post('/api/towing/vehicles', data);
    return response.data;
  },
  updateVehicle: async (id: string, data: any) => {
    const response = await api.put(`/api/towing/vehicles/${id}`, data);
    return response.data;
  },
  deleteVehicle: async (id: string) => {
    const response = await api.delete(`/api/towing/vehicles/${id}`);
    return response.data;
  },
  listTowingTypes: async () => {
    const response = await api.get('/api/towing/types');
    return response.data;
  },

  // RATES
  listRates: async () => {
    const response = await api.get('/api/towing/rates');
    return response.data;
  },
  saveRate: async (data: any) => {
    const response = await api.post('/api/towing/rates', data);
    return response.data;
  },
  getRateHistory: async (id: string) => {
    const response = await api.get(`/api/towing/rates/${id}/history`);
    return response.data;
  },

  // GUIAS
  getGuiaByQuoteId: async (quoteId: string) => {
    const response = await api.get(`/api/towing/quotes/${quoteId}/guia`);
    return response.data;
  },
  logGuiaAuditAction: async (guiaId: string, action: string, details?: any) => {
    const response = await api.post(`/api/towing/guias/${guiaId}/audit`, { action, details });
    return response.data;
  },
  sendGuiaEmail: async (guiaId: string, to: string) => {
    const response = await api.post(`/api/towing/guias/${guiaId}/email`, { to });
    return response.data;
  }
};
