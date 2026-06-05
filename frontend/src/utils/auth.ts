export interface PlanInfo {
  id: string;
  nome: string;
  limiteUsuarios: number;
  limiteOsMes: number;
  preco: number;
}

export interface UserProfile {
  id: string;
  nome: string;
  email: string;
  role?: string;
  companyId?: string;
  statusAssinatura?: string;
  plano?: PlanInfo | null;
  activeModules?: string[];
  roleAdmin?: boolean;
  roleContabilidade?: boolean;
}

export const TOKEN_KEY = 'token';
export const USER_KEY = 'user';

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  getUser(): UserProfile | null {
    const user = localStorage.getItem(USER_KEY);
    if (!user) return null;
    try {
      return JSON.parse(user);
    } catch {
      return null;
    }
  },

  setUser(user: UserProfile): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  clearSession(): void {
    this.removeToken();
    this.removeUser();
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired(token);
  },

  isTokenExpired(token: string): boolean {
    if (!token) return true;
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return true;
      
      // Decodes base64 payload safely
      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payloadJson = JSON.parse(atob(payloadBase64));
      
      if (!payloadJson.exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return payloadJson.exp < now;
    } catch {
      return true;
    }
  }
};
