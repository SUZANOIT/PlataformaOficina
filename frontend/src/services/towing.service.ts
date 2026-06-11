import { api } from './api';

export const towingService = {
  // QUOTES
  listQuotes: async () => {
    const response = await api.get('/towing/quotes');
    return response.data;
  },
  getQuote: async (id: string) => {
    const response = await api.get(`/towing/quotes/${id}`);
    return response.data;
  },
  createQuote: async (data: any) => {
    const response = await api.post('/towing/quotes', data);
    return response.data;
  },
  updateQuote: async (id: string, data: any) => {
    const response = await api.put(`/towing/quotes/${id}`, data);
    return response.data;
  },
  deleteQuote: async (id: string) => {
    const response = await api.delete(`/towing/quotes/${id}`);
    return response.data;
  },
  getDashboardStats: async () => {
    const response = await api.get('/towing/dashboard');
    return response.data;
  },

  // FLEET
  listDrivers: async () => {
    const response = await api.get('/towing/drivers');
    return response.data;
  },
  createDriver: async (data: any) => {
    const response = await api.post('/towing/drivers', data);
    return response.data;
  },

  listVehicles: async () => {
    const response = await api.get('/towing/vehicles');
    return response.data;
  },
  createVehicle: async (data: any) => {
    const response = await api.post('/towing/vehicles', data);
    return response.data;
  },

  // RATES
  listRates: async () => {
    const response = await api.get('/towing/rates');
    return response.data;
  },
  saveRate: async (data: any) => {
    const response = await api.post('/towing/rates', data);
    return response.data;
  }
};
