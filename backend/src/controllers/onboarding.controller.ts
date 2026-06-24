import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class OnboardingController {
  
  // 1. Busca Planos
  async getPlans(req: Request, res: Response) {
    try {
      const plans = await prisma.saaSPlan.findMany({
        where: { ativo: true },
        orderBy: { valorMensal: 'asc' }
      });
      res.json(plans);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao buscar planos.' });
    }
  }

  // 2. Valida CNPJ
  async validateCnpj(req: Request, res: Response) {
    const { cnpj } = req.body;
    if (!cnpj) {
      return res.status(400).json({ error: 'CNPJ obrigatório.' });
    }

    try {
      // Verifica se o CNPJ já é de um Tenant existente
      const existingCompany = await prisma.company.findUnique({
        where: { cnpjSemMascara: cnpj.replace(/\D/g, '') }
      });

      if (existingCompany) {
        return res.status(400).json({ error: 'Este CNPJ já possui uma conta ativa no sistema.' });
      }

      // Se for apenas mock de validação, retornamos sucesso.
      res.json({ message: 'CNPJ válido e disponível.' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao validar CNPJ.' });
    }
  }

  // 3. Checkout e Criação de PreTenant
  async checkout(req: Request, res: Response) {
    const { cnpj, razaoSocial, nomeFantasia, email, telefone, planId } = req.body;
    
    if (!cnpj || !email || !planId) {
      return res.status(400).json({ error: 'Dados obrigatórios faltando.' });
    }

    try {
      // Evita duplicação se o usuário tentar checkout várias vezes
      let preTenant = await prisma.preTenant.findUnique({
        where: { cnpj: cnpj.replace(/\D/g, '') }
      });

      if (preTenant) {
        if (preTenant.status === 'PROVISIONED') {
          return res.status(400).json({ error: 'Esta conta já foi ativada.' });
        }
        // Atualiza os dados
        preTenant = await prisma.preTenant.update({
          where: { id: preTenant.id },
          data: { razaoSocial, nomeFantasia, email, telefone, planId, status: 'PENDING_PAYMENT' }
        });
      } else {
        // Cria novo
        preTenant = await prisma.preTenant.create({
          data: {
            cnpj: cnpj.replace(/\D/g, ''),
            razaoSocial,
            nomeFantasia,
            email,
            telefone,
            planId,
            status: 'PENDING_PAYMENT'
          }
        });
      }

      // Como o pagamento é "Mockado", vamos gerar um intent fake
      const fakeClientSecret = `pi_mock_${preTenant.id}`;
      
      await prisma.preTenant.update({
        where: { id: preTenant.id },
        data: { paymentIntentId: fakeClientSecret }
      });

      res.json({ clientSecret: fakeClientSecret, preTenantId: preTenant.id });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Erro ao gerar checkout.' });
    }
  }
}
