import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  companyId: string;
  userId?: string;
}

export const tenantContext = new AsyncLocalStorage<TenantStore>();
