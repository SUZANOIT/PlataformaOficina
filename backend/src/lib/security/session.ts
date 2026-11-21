import jwt from 'jsonwebtoken';
import { getJwtSecret } from './jwtSecret';

/**
 * Tokens de sessão carregam a versão de sessão do usuário (`tv`). Ao trocar a senha
 * ou bloquear o usuário, a versão é incrementada e todos os tokens anteriores deixam
 * de valer (ver authMiddleware). Tokens antigos sem `tv` equivalem à versão 0.
 */
export function signUserToken(
  user: { id: string; tokenVersion?: number | null },
  extra: Record<string, unknown> = {},
  expiresIn: string | number = '1d',
): string {
  return jwt.sign({ ...extra, id: user.id, tv: user.tokenVersion || 0 }, getJwtSecret(), { expiresIn } as jwt.SignOptions);
}

/** Dado de update do Prisma que encerra todas as sessões abertas do usuário. */
export const REVOKE_SESSIONS = { tokenVersion: { increment: 1 } } as const;
