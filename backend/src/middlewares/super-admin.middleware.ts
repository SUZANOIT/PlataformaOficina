import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';

export const superAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const companyId = (req as any).companyId;
  const userId = (req as any).userId;

  if (!userId || !companyId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (
      user?.role === 'SUPER_ADMIN' || 
      (user?.roleAdmin && companyId === 'mca-padrao-company-uuid-000000000001')
    ) {
      (req as any).userEmail = user?.email;
      return next();
    }

    return res.status(403).json({ error: '403 - Acesso Negado' });
  } catch (error) {
    console.error('Error in superAdminMiddleware:', error);
    return res.status(500).json({ error: 'Erro interno ao validar privilégios de super administrador' });
  }
};
