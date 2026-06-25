import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ModuleController {
  static async requestActivation(req: Request, res: Response) {
    try {
      const { moduleKey } = req.body;
      const user = (req as any).user;

      if (!user || !user.companyId) {
        return res.status(401).json({ error: 'Usuário não autenticado ou sem empresa vinculada' });
      }

      if (!moduleKey) {
        return res.status(400).json({ error: 'A chave do módulo (moduleKey) é obrigatória' });
      }

      // No futuro, isso pode gerar um registro na tabela IntegrationLog ou criar um ticket/email
      // Por enquanto, vamos simular sucesso
      
      return res.json({ success: true, message: 'Solicitação de ativação recebida com sucesso' });
    } catch (error: any) {
      console.error('[ModuleController] Erro ao solicitar ativação de módulo:', error);
      return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
    }
  }
}
