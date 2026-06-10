import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosError } from 'axios';

export const SAAS_AUTH_EXPIRED_EVENT = 'saas-auth:expired';

export const saasApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Attach SaaS specific token
saasApi.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('saas_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Session expiration detection
saasApi.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    if (status === 401) {
      window.dispatchEvent(new CustomEvent(SAAS_AUTH_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export const SaaSAPIService = {
  // Autenticação
  async login(payload: any) {
    const response = await saasApi.post('/api/saas/auth/login', payload);
    return response.data;
  },

  async me() {
    const response = await saasApi.get('/api/saas/auth/me');
    return response.data;
  },

  // Dashboard Executivo
  async getDashboard() {
    const response = await saasApi.get('/api/saas/admin/dashboard');
    return response.data;
  },

  // Empresas (Tenants)
  async listTenants(params?: { search?: string; status?: string; planId?: string }) {
    const response = await saasApi.get('/api/saas/admin/tenants', { params });
    return response.data;
  },

  async getTenant(id: string) {
    const response = await saasApi.get(`/api/saas/admin/tenants/${id}`);
    return response.data;
  },

  async createTenant(payload: any) {
    const response = await saasApi.post('/api/saas/admin/tenants', payload);
    return response.data;
  },

  async updateTenant(id: string, payload: any) {
    const response = await saasApi.put(`/api/saas/admin/tenants/${id}`, payload);
    return response.data;
  },

  async blockTenant(id: string) {
    const response = await saasApi.post('/api/saas/admin/tenants/block', { id });
    return response.data;
  },

  async suspendTenant(id: string) {
    const response = await saasApi.post('/api/saas/admin/tenants/suspend', { id });
    return response.data;
  },

  async reactivateTenant(id: string) {
    const response = await saasApi.post('/api/saas/admin/tenants/reactivate', { id });
    return response.data;
  },

  async resetTenantAdminPassword(tenantId: string, newPassword: string) {
    const response = await saasApi.post('/api/saas/admin/tenants/reset-password', { tenantId, newPassword });
    return response.data;
  },

  async getTenantHistory(id: string) {
    const response = await saasApi.get(`/api/saas/admin/tenants/${id}/history`);
    return response.data;
  },

  async acessarTenant(id: string) {
    const response = await saasApi.post('/api/saas/admin/tenants/acessar', { id });
    return response.data;
  },

  async consultarCnpj(cnpj: string) {
    const response = await saasApi.get(`/api/saas/admin/cnpj/${cnpj}`);
    return response.data;
  },

  // Planos
  async listPlans() {
    const response = await saasApi.get('/api/saas/admin/plans');
    return response.data;
  },

  async createPlan(payload: any) {
    const response = await saasApi.post('/api/saas/admin/plans', payload);
    return response.data;
  },

  async updatePlan(id: string, payload: any) {
    const response = await saasApi.put(`/api/saas/admin/plans/${id}`, payload);
    return response.data;
  },

  async duplicatePlan(id: string) {
    const response = await saasApi.post('/api/saas/admin/plans/duplicate', { id });
    return response.data;
  },

  // Assinaturas
  async listSubscriptions() {
    const response = await saasApi.get('/api/saas/admin/subscriptions');
    return response.data;
  },

  async renovateSubscription(id: string) {
    const response = await saasApi.post('/api/saas/admin/subscriptions/renovate', { id });
    return response.data;
  },

  async cancelSubscription(id: string) {
    const response = await saasApi.post('/api/saas/admin/subscriptions/cancel', { id });
    return response.data;
  },

  async getGatewayLogs() {
    const response = await saasApi.get('/api/saas/admin/gateway-logs');
    return response.data;
  },

  // Módulos
  async listModules() {
    const response = await saasApi.get('/api/saas/admin/modules');
    return response.data;
  },

  async toggleTenantModule(payload: { tenantId: string; moduleId: string; active: boolean; valorAdicionalCobrado?: number; configuracao?: string }) {
    const response = await saasApi.post('/api/saas/admin/modules/toggle', payload);
    return response.data;
  },

  // Usuários Globais & Perfis
  async listUsers() {
    const response = await saasApi.get('/api/saas/admin/users');
    return response.data;
  },

  async createUser(payload: any) {
    const response = await saasApi.post('/api/saas/admin/users', payload);
    return response.data;
  },

  async updateUser(id: string, payload: any) {
    const response = await saasApi.put(`/api/saas/admin/users/${id}`, payload);
    return response.data;
  },

  async resetUserPassword(userId: string, newPassword: string) {
    const response = await saasApi.post('/api/saas/admin/users/reset-password', { userId, newPassword });
    return response.data;
  },

  async listRoles() {
    const response = await saasApi.get('/api/saas/admin/roles');
    return response.data;
  },

  // Financeiro
  async getFinancialStats() {
    const response = await saasApi.get('/api/saas/admin/financial-stats');
    return response.data;
  },

  // Auditoria (paginação server-side)
  async listAuditLogs(params?: { user?: string; acao?: string; search?: string; page?: number; size?: number; sort?: string }) {
    const response = await saasApi.get('/api/saas/admin/audit-logs', { params });
    return response.data as {
      content: any[];
      totalElements: number;
      totalPages: number;
      page: number;
      size: number;
    };
  },

  // Monitoramento
  async getTelemetry() {
    const response = await saasApi.get('/api/saas/admin/telemetry');
    return response.data;
  },

  // Configurações
  async getSettings() {
    const response = await saasApi.get('/api/saas/admin/settings');
    return response.data;
  },

  async saveSetting(key: string, value: any) {
    const response = await saasApi.post('/api/saas/admin/settings', { key, value });
    return response.data;
  },

  // Notificações
  async listNotifications() {
    const response = await saasApi.get('/api/saas/admin/notifications');
    return response.data;
  },

  async createNotification(payload: { titulo: string; mensagem: string; tipo: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR'; prioridade?: 'ALTA' | 'MEDIA' | 'BAIXA'; expiraEm?: string | null }) {
    const response = await saasApi.post('/api/saas/admin/notifications', payload);
    return response.data;
  },

  async markNotificationAsRead(id: string) {
    const response = await saasApi.post(`/api/saas/admin/notifications/${id}/read`);
    return response.data;
  }
};
