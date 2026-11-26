import { Request, Response, NextFunction } from 'express';

/**
 * Limite de tentativas de autenticação (proteção contra força bruta), em memória.
 *
 * - Por IP: no máximo `ipMax` tentativas na janela, independente do resultado.
 * - Por conta (e-mail/CNPJ): após `accountMaxFailures` falhas na janela, a conta
 *   fica bloqueada até a janela expirar. Um login bem-sucedido zera as falhas.
 *
 * A resposta de bloqueio é sempre a mesma (429), sem revelar se a conta existe.
 */
export interface RateLimitOptions {
  windowMs: number;
  ipMax: number;
  accountMaxFailures: number;
}

interface Bucket { count: number; resetAt: number }

const DEFAULTS: RateLimitOptions = {
  windowMs: 15 * 60 * 1000,
  // Alto o bastante para várias pessoas na mesma rede; a proteção principal é por conta
  ipMax: Number(process.env.AUTH_RATE_LIMIT_IP_MAX) || 200,
  accountMaxFailures: Number(process.env.AUTH_RATE_LIMIT_ACCOUNT_MAX) || 5,
};

export class LoginRateLimiter {
  private ipHits = new Map<string, Bucket>();
  private accountFailures = new Map<string, Bucket>();
  constructor(private opts: RateLimitOptions = DEFAULTS) {}

  private bump(map: Map<string, Bucket>, key: string, now: number): Bucket {
    const cur = map.get(key);
    if (!cur || cur.resetAt <= now) {
      const fresh = { count: 1, resetAt: now + this.opts.windowMs };
      map.set(key, fresh);
      return fresh;
    }
    cur.count += 1;
    return cur;
  }

  private active(map: Map<string, Bucket>, key: string, now: number): Bucket | null {
    const cur = map.get(key);
    if (!cur) return null;
    if (cur.resetAt <= now) { map.delete(key); return null; }
    return cur;
  }

  /** Registra a tentativa e informa se ela pode prosseguir. */
  attempt(ip: string, account: string | null, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
    this.prune(now);
    const ipBucket = this.bump(this.ipHits, ip, now);
    if (ipBucket.count > this.opts.ipMax) {
      return { allowed: false, retryAfterSec: Math.ceil((ipBucket.resetAt - now) / 1000) };
    }
    if (account) {
      const acc = this.active(this.accountFailures, account, now);
      if (acc && acc.count >= this.opts.accountMaxFailures) {
        return { allowed: false, retryAfterSec: Math.ceil((acc.resetAt - now) / 1000) };
      }
    }
    return { allowed: true, retryAfterSec: 0 };
  }

  fail(account: string | null, now = Date.now()) {
    if (account) this.bump(this.accountFailures, account, now);
  }

  succeed(account: string | null) {
    if (account) this.accountFailures.delete(account);
  }

  reset() { this.ipHits.clear(); this.accountFailures.clear(); }

  private lastPrune = 0;
  private prune(now: number) {
    if (now - this.lastPrune < 60_000) return;
    this.lastPrune = now;
    for (const map of [this.ipHits, this.accountFailures]) {
      for (const [k, b] of map) if (b.resetAt <= now) map.delete(k);
    }
  }
}

export const authRateLimiter = new LoginRateLimiter();

/**
 * Libera o bloqueio de uma conta (e-mail ou CNPJ) — usado quando a oficina redefine
 * o acesso ou a senha: o usuário pode entrar na hora, sem esperar o fim da janela.
 */
export function clearLoginBlock(identifier: string | null | undefined, limiter: LoginRateLimiter = authRateLimiter) {
  const account = normalizeAccount(identifier);
  if (account) limiter.succeed(account);
}

export const normalizeAccount = (v: unknown) => {
  if (typeof v !== 'string' || !v.trim()) return null;
  const s = v.trim().toLowerCase();
  const digits = s.replace(/\D/g, '');
  return digits.length === 14 && !s.includes('@') ? `cnpj:${digits}` : `id:${s}`;
};

/**
 * Middleware para as rotas de login/recuperação. `accountField` indica o campo do corpo
 * que identifica a conta. O resultado (sucesso/falha) é observado pelo status da resposta:
 * 2xx e o 403 de troca obrigatória de senha (senha correta) contam como sucesso;
 * 400/401 contam como falha da conta.
 */
export function authRateLimit(accountField: string | null, limiter: LoginRateLimiter = authRateLimiter) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const account = accountField ? normalizeAccount(req.body?.[accountField]) : null;
    const { allowed, retryAfterSec } = limiter.attempt(ip, account);
    if (!allowed) {
      res.setHeader('Retry-After', String(retryAfterSec));
      const minutos = Math.max(1, Math.ceil(retryAfterSec / 60));
      console.warn(`[Auth] Tentativas bloqueadas por ${minutos} min (${account ? 'conta' : 'IP'}) em ${req.path}`);
      return res.status(429).json({
        error: `Muitas tentativas de acesso. Aguarde ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} e tente novamente. Se esqueceu a senha, peça para a oficina redefinir o seu acesso.`,
        code: 'TOO_MANY_ATTEMPTS',
        retryAfterSec,
      });
    }
    res.on('finish', () => {
      if (res.statusCode < 300 || res.statusCode === 403 || res.statusCode === 409) limiter.succeed(account);
      else if (res.statusCode === 400 || res.statusCode === 401) limiter.fail(account);
    });
    return next();
  };
}
