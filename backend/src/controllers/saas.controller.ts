import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';

const updateSubscriptionSchema = z.object({
  companyId: z.string(),
  planId: z.string(),
  statusAssinatura: z.string(),
  dataVencimento: z.string(),
});

const toggleLicenseSchema = z.object({
  companyId: z.string(),
  moduleId: z.string(),
});

export const SaaSController = {
  async getAdminStats(req: Request, res: Response) {
    try {
      // 1. Total Companies
      const totalCompanies = await prisma.company.count();
      const activeCompanies = await prisma.company.count({
        where: { statusAssinatura: 'Ativa' }
      });

      // 2. Total active users in the platform
      const totalActiveUsers = await prisma.user.count({
        where: { status: 'ATIVO' }
      });

      // 3. MRR & ARR Calculations
      const companiesWithPlans = await prisma.company.findMany({
        where: { statusAssinatura: 'Ativa' },
        include: { plan: true }
      });

      const mrr = companiesWithPlans.reduce((sum, c) => sum + (c.plan?.preco || 0), 0);
      const arr = mrr * 12;

      // 4. Churn rate (companies deactivated/canceled in last 30 days)
      const canceledLast30Days = await prisma.company.count({
        where: {
          statusAssinatura: 'Cancelada',
          updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      });
      const churnRate = totalCompanies > 0 ? (canceledLast30Days / totalCompanies) * 100 : 0;

      // 5. Plan distribution
      const plans = await prisma.plan.findMany({
        include: {
          _count: {
            select: { companies: true }
          }
        }
      });

      const planDistribution = plans.map(p => ({
        planId: p.id,
        planName: p.nome,
        companyCount: p._count.companies,
        mrrContribution: p._count.companies * p.preco
      }));

      // 6. Active Modules count
      const activeLicenses = await prisma.moduleLicense.count({
        where: { ativa: true }
      });

      return res.json({
        totalCompanies,
        activeCompanies,
        totalActiveUsers,
        mrr,
        arr,
        churnRate,
        planDistribution,
        activeLicenses
      });
    } catch (error) {
      console.error('Error fetching SaaS admin stats:', error);
      return res.status(500).json({ error: 'Erro ao carregar estatísticas do SaaS' });
    }
  },

  async listCompanies(req: Request, res: Response) {
    try {
      const companies = await prisma.company.findMany({
        include: {
          plan: true,
          moduleLicenses: {
            include: { module: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const enrichedCompanies = await Promise.all(companies.map(async (c) => {
        const [totalUsers, activeUsers, osCount] = await Promise.all([
          prisma.user.count({ where: { companyId: c.id } }),
          prisma.user.count({ where: { companyId: c.id, status: 'ATIVO' } }),
          prisma.quote.count({
            where: {
              companyId: c.id,
              createdAt: { gte: startOfMonth }
            }
          })
        ]);

        return {
          id: c.id,
          razaoSocial: c.razaoSocial,
          nomeFantasia: c.nomeFantasia,
          cnpj: c.cnpj,
          statusAssinatura: c.statusAssinatura,
          dataContratacao: c.dataContratacao,
          dataVencimento: c.dataVencimento,
          plan: c.plan ? {
            id: c.plan.id,
            nome: c.plan.nome,
            limiteUsuarios: c.plan.limiteUsuarios,
            limiteOsMes: c.plan.limiteOsMes,
            preco: c.plan.preco
          } : null,
          moduleLicenses: c.moduleLicenses.map(ml => ({
            id: ml.id,
            moduleId: ml.moduleId,
            moduleName: ml.module.nome,
            moduleKey: ml.module.chave,
            ativa: ml.ativa
          })),
          usersCount: totalUsers,
          activeUsersCount: activeUsers,
          osCountThisMonth: osCount
        };
      }));

      return res.json(enrichedCompanies);
    } catch (error) {
      console.error('Error listing companies for admin:', error);
      return res.status(500).json({ error: 'Erro ao listar empresas' });
    }
  },

  async updateSubscription(req: Request, res: Response) {
    try {
      const { companyId, planId, statusAssinatura, dataVencimento } = updateSubscriptionSchema.parse(req.body);

      // Verify company and plan exist
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        include: { plan: true }
      });

      if (!company) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const plan = await prisma.plan.findUnique({
        where: { id: planId }
      });

      if (!plan) {
        return res.status(404).json({ error: 'Plano não encontrado' });
      }

      const parsedVencimento = new Date(dataVencimento);

      // Create or update Subscription model for subscription record keeping
      let subscription = await prisma.subscription.findUnique({
        where: { companyId }
      });

      const previousPlanName = company.plan?.nome || 'Nenhum';
      const previousStatus = company.statusAssinatura || 'Nenhum';

      if (subscription) {
        subscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            planId,
            status: statusAssinatura,
            dataVencimento: parsedVencimento
          }
        });
      } else {
        subscription = await prisma.subscription.create({
          data: {
            companyId,
            planId,
            status: statusAssinatura,
            dataVencimento: parsedVencimento
          }
        });
      }

      // Update Company core plan details
      await prisma.company.update({
        where: { id: companyId },
        data: {
          planoId: planId,
          statusAssinatura,
          dataVencimento: parsedVencimento
        }
      });

      // Write to Subscription History
      await prisma.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          planoAnterior: previousPlanName,
          planoNovo: plan.nome,
          statusAnterior: previousStatus,
          statusNovo: statusAssinatura,
          motivo: 'Alteração manual pelo administrador do sistema'
        }
      });

      return res.json({ success: true, message: 'Assinatura atualizada com sucesso' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error updating subscription:', error);
      return res.status(500).json({ error: 'Erro ao atualizar assinatura' });
    }
  },

  async toggleModuleLicense(req: Request, res: Response) {
    try {
      const { companyId, moduleId } = toggleLicenseSchema.parse(req.body);

      const existing = await prisma.moduleLicense.findFirst({
        where: { companyId, moduleId }
      });

      if (existing) {
        const updated = await prisma.moduleLicense.update({
          where: { id: existing.id },
          data: { ativa: !existing.ativa }
        });
        return res.json({
          success: true,
          ativa: updated.ativa,
          message: `Licença do módulo ${updated.ativa ? 'ativada' : 'desativada'} com sucesso.`
        });
      } else {
        const created = await prisma.moduleLicense.create({
          data: {
            companyId,
            moduleId,
            ativa: true
          },
          include: { module: true }
        });
        return res.json({
          success: true,
          ativa: true,
          message: `Licença do módulo ${created.module.nome} criada com sucesso.`
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.issues });
      }
      console.error('Error toggling module license:', error);
      return res.status(500).json({ error: 'Erro ao alterar licença do módulo' });
    }
  },

  async listPlans(req: Request, res: Response) {
    try {
      const plans = await prisma.plan.findMany({
        orderBy: { preco: 'asc' }
      });
      return res.json(plans);
    } catch (error) {
      console.error('Error listing plans:', error);
      return res.status(500).json({ error: 'Erro ao listar planos' });
    }
  },

  async listModules(req: Request, res: Response) {
    try {
      const modules = await prisma.module.findMany({
        orderBy: { nome: 'asc' }
      });
      return res.json(modules);
    } catch (error) {
      console.error('Error listing modules:', error);
      return res.status(500).json({ error: 'Erro ao listar módulos' });
    }
  }
};
