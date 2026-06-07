import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export const saasAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    if (!decoded.isSaaSUser) {
      return res.status(403).json({ error: 'Acesso negado. Este token não possui privilégios de administração do SaaS.' });
    }

    const saasUser = await prisma.saaSUser.findUnique({
      where: { id: decoded.id }
    });

    if (!saasUser) {
      return res.status(401).json({ error: 'Usuário administrativo não cadastrado.' });
    }

    if (saasUser.status !== 'ATIVO') {
      return res.status(403).json({ error: 'Conta de administração inativa.' });
    }

    // Configurar o payload administrativo na requisição
    (req as any).saasUserId = decoded.id;
    (req as any).saasUserEmail = decoded.email;
    (req as any).saasUserRole = decoded.role;
    (req as any).saasUserPermissions = decoded.permissions || [];

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Sua sessão administrativa expirou.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Token de autenticação inválido.' });
  }
};

// Guard de Permissão Granular (RBAC) no Backend
export const saasPermissionGuard = (requiredPermission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const permissions = (req as any).saasUserPermissions as string[];
    const role = (req as any).saasUserRole;

    if (!permissions) {
      return res.status(403).json({ error: 'Nenhuma permissão administrativa concedida.' });
    }

    // SUPER_ADMIN ou o perfil que tiver a permissão 'total' tem acesso livre
    if (role === 'SUPER_ADMIN' || permissions.includes('total')) {
      return next();
    }

    // Verificar se o usuário possui a permissão específica exigida para o recurso
    if (permissions.includes(requiredPermission)) {
      return next();
    }

    return res.status(403).json({
      error: `Acesso negado. Permissão necessária: '${requiredPermission}'`
    });
  };
};
