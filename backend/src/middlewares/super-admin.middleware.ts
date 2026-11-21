import { Request, Response, NextFunction } from 'express';
import { basePrisma as prisma } from '../lib/prisma';
import { isPlatformAdmin } from '../lib/security/platform';

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

    // Avalia o cadastro do usuário, não a empresa escolhida via ?tenantId
    if (isPlatformAdmin(user)) {
      (req as any).userEmail = user?.email;
      return next();
    }

    return res.status(403).json({ error: '403 - Acesso Negado' });
  } catch (error) {
    console.error('Error in superAdminMiddleware:', error);
    return res.status(500).json({ error: 'Erro interno ao validar privilégios de super administrador' });
  }
};
