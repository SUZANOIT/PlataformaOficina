import { Request, Response, NextFunction } from 'express';
import { basePrisma as prisma } from '../lib/prisma';
import { isPlatformAdmin } from '../lib/security/platform';

export const saasAdminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const companyId = (req as any).companyId;
  const userId = (req as any).userId;

  if (!userId || !companyId) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Apenas administradores da MCA Gestão de Oficina (MCA CARD) podem acessar
    // Avalia o cadastro do usuário, não a empresa escolhida via ?tenantId
    if (isPlatformAdmin(user)) {
      return next();
    }

    return res.status(403).json({ error: 'Acesso negado. Apenas administradores da plataforma podem acessar este recurso.' });
  } catch (error) {
    console.error('Error in saasAdminMiddleware:', error);
    return res.status(500).json({ error: 'Erro interno ao validar privilégios de administração' });
  }
};
