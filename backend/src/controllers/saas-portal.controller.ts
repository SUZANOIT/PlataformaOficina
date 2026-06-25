import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import os from 'os';
import { execSync } from 'child_process';


// Helper de Auditoria do SaaS
async function logSaaSAuditoria(usuario: string, acao: string, detalhes?: string, tenant?: string, ip?: string) {
  try {
    await prisma.saaSAuditLog.create({
      data: {
        usuario,
        acao,
        detalhes: detalhes || '',
        tenant: tenant || null,
        ip: ip || '127.0.0.1'
      }
    });
  } catch (err) {
    console.error('Falha ao registrar log de auditoria no SaaS:', err);
  }
}

export const SaaSPortalController = {
  // ==================================================================
  // 1. DASHBOARD EXECUTIVO
  // ==================================================================
  async getDashboard(req: Request, res: Response) {
    try {
      const email = (req as any).saasUserEmail || 'admin@suzanoit.com';
      await logSaaSAuditoria(email, 'Acesso Dashboard', 'Visualizou o painel executivo do SaaS');

      // KPIs
      const totalTenants = await prisma.saaSTenant.count();
      const activeTenants = await prisma.saaSTenant.count({ where: { status: 'Ativa' } });
      const trialTenants = await prisma.saaSTenant.count({ where: { status: 'Trial' } });
      const suspendedTenants = await prisma.saaSTenant.count({ where: { status: 'Suspensa' } });
      const blockedTenants = await prisma.saaSTenant.count({ where: { status: 'Bloqueada' } });
      
      const totalWorkshops = await prisma.oficina.count();
      const activeUsers = await prisma.user.count({ where: { status: 'ATIVO' } });

      const activeSubscriptionsCount = await prisma.saaSSubscription.count({ where: { status: 'Ativa' } });
      const cancelledSubscriptionsCount = await prisma.saaSSubscription.count({ where: { status: 'Cancelada' } });
      const pendingSubscriptionsCount = await prisma.saaSSubscription.count({ where: { status: 'Pendente' } });

      // Calcular MRR (Monthly Recurring Revenue) de assinaturas ativas
      const activeSubs = await prisma.saaSSubscription.findMany({
        where: { status: 'Ativa' }
      });
      const mrr = activeSubs.reduce((sum, sub) => sum + sub.valor, 0);
      const arr = mrr * 12;

      // Churn e inadimplência
      const inadimplentesCount = await prisma.saaSSubscription.count({
        where: { status: 'Atrasada' }
      });

      // Distribuição por plano
      const plans = await prisma.saaSPlan.findMany();
      const planDistribution = await Promise.all(
        plans.map(async (p) => {
          const count = await prisma.saaSTenant.count({ where: { planoId: p.id, status: 'Ativa' } });
          return {
            planoNome: p.nome,
            quantidade: count,
            mrrContribuicao: count * p.valorMensal
          };
        })
      );

      // Módulos mais utilizados no Marketplace
      const modules = await prisma.saaSModule.findMany();
      const moduleStats = await Promise.all(
        modules.map(async (m) => {
          const count = await prisma.saaSTenantModule.count({ where: { moduleId: m.id, ativo: true } });
          return {
            moduloNome: m.nome,
            chave: m.chave,
            quantidade: count
          };
        })
      );

      // Faturamento recente e histórico simulado das receitas
      const faturamentoHistorico = [
        { mes: 'Jan', receita: mrr * 0.75, churn: 1, novos: 3, crescimento: 12 },
        { mes: 'Fev', receita: mrr * 0.80, churn: 0, novos: 2, crescimento: 14 },
        { mes: 'Mar', receita: mrr * 0.88, churn: 2, novos: 5, crescimento: 17 },
        { mes: 'Abr', receita: mrr * 0.92, churn: 1, novos: 4, crescimento: 20 },
        { mes: 'Mai', receita: mrr * 0.96, churn: 1, novos: 3, crescimento: 22 },
        { mes: 'Jun', receita: mrr, churn: inadimplentesCount, novos: activeTenants - 22 > 0 ? activeTenants - 22 : 2, crescimento: activeTenants }
      ];

      // Top Tenants por Faturamento (Empresas que mais pagam)
      const tenants = await prisma.saaSTenant.findMany({
        take: 5,
        include: { plan: true },
        orderBy: { createdAt: 'desc' }
      });
      const topTenants = tenants.map(t => ({
        id: t.id,
        razaoSocial: t.razaoSocial,
        nomeFantasia: t.nomeFantasia,
        plano: t.plan?.nome || 'Nenhum',
        valor: t.plan?.valorMensal || 0
      })).sort((a, b) => b.valor - a.valor);

      return res.json({
        kpis: {
          totalTenants,
          activeTenants,
          trialTenants,
          suspendedTenants,
          blockedTenants,
          totalWorkshops,
          activeUsers,
          activeSubscriptionsCount,
          cancelledSubscriptionsCount,
          pendingSubscriptionsCount,
          mrr,
          arr,
          inadimplentesCount
        },
        planDistribution,
        moduleStats,
        faturamentoHistorico,
        topTenants
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar dashboard executivo.' });
    }
  },

  // ==================================================================
  // 2. GESTÃO DE TENANTS (EMPRESAS)
  // ==================================================================
  async listTenants(req: Request, res: Response) {
    try {
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;
      const planId = req.query.planId as string | undefined;

      const whereClause: any = {};
      if (status && status !== 'all') {
        whereClause.status = status;
      }
      if (planId && planId !== 'all') {
        whereClause.planoId = planId as string;
      }
      if (search) {
        whereClause.OR = [
          { razaoSocial: { contains: search as string, mode: 'insensitive' } },
          { nomeFantasia: { contains: search as string, mode: 'insensitive' } },
          { cnpj: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } }
        ];
      }

      const tenants = await prisma.saaSTenant.findMany({
        where: whereClause,
        include: {
          plan: true,
          subscriptions: true,
          tenantModules: {
            include: {
              module: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch all operational users for these companies in a single query
      const companyIds = tenants.map(t => t.companyId).filter(Boolean) as string[];
      const allUsers = await prisma.user.findMany({
        where: { companyId: { in: companyIds } },
        select: { id: true, name: true, email: true, role: true, status: true, companyId: true, roleAdmin: true, roleOrcamentista: true, roleContabilidade: true }
      });

      // Bulk group counts to avoid N+1 memory issues
      const vehicleCounts = await prisma.vehicle.groupBy({
        by: ['companyId'],
        _count: { id: true },
        where: { companyId: { in: companyIds } }
      });
      const workshopCounts = await prisma.oficina.groupBy({
        by: ['companyId'],
        _count: { id: true },
        where: { companyId: { in: companyIds } }
      });
      const osCounts = await prisma.quote.groupBy({
        by: ['companyId'],
        _count: { id: true },
        where: { companyId: { in: companyIds } }
      });

      const countMap = (arr: any[]) => arr.reduce((acc, curr) => {
        if (curr.companyId) acc[curr.companyId] = curr._count.id;
        return acc;
      }, {} as Record<string, number>);

      const vehicleMap = countMap(vehicleCounts);
      const workshopMap = countMap(workshopCounts);
      const osMap = countMap(osCounts);

      // Anexar contagens operacionais reais
      const result = tenants.map((t) => {
        let usersCount = 0;
        let vehiclesCount = 0;
        let workshopsCount = 0;
        let osCount = 0;
        let users: any[] = [];

        if (t.companyId) {
          users = allUsers.filter(u => u.companyId === t.companyId).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: u.status,
            role: u.roleAdmin ? 'Administrador' : u.roleOrcamentista ? 'Orçamentista' : u.roleContabilidade ? 'Contabilidade' : u.role
          }));
          usersCount = users.length;
          vehiclesCount = vehicleMap[t.companyId] || 0;
          workshopsCount = workshopMap[t.companyId] || 0;
          osCount = osMap[t.companyId] || 0;
        }

        return {
          ...t,
          usersCount,
          vehiclesCount,
          workshopsCount,
          osCount,
          users
        };
      });

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar lista de empresas' });
    }
  },

  async getTenant(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const t = await prisma.saaSTenant.findUnique({
        where: { id },
        include: {
          plan: true,
          subscriptions: true,
          tenantModules: {
            include: {
              module: true
            }
          }
        }
      });

      if (!t) return res.status(404).json({ error: 'Empresa não encontrada.' });

      let usersCount = 0;
      let vehiclesCount = 0;
      let workshopsCount = 0;
      let osCount = 0;
      let users: any[] = [];

      if (t.companyId) {
        const rawUsers = await prisma.user.findMany({ 
          where: { companyId: t.companyId },
          select: { id: true, name: true, email: true, role: true, status: true, roleAdmin: true, roleOrcamentista: true, roleContabilidade: true }
        });
        users = rawUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            status: u.status,
            role: u.roleAdmin ? 'Administrador' : u.roleOrcamentista ? 'Orçamentista' : u.roleContabilidade ? 'Contabilidade' : u.role
        }));
        usersCount = users.length;
        vehiclesCount = await prisma.vehicle.count({ where: { companyId: t.companyId } });
        workshopsCount = await prisma.oficina.count({ where: { companyId: t.companyId } });
        osCount = await prisma.quote.count({ where: { companyId: t.companyId } });
      }

      return res.json({
        ...t,
        usersCount,
        vehiclesCount,
        workshopsCount,
        osCount,
        users
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar detalhes da empresa.' });
    }
  },

  async createTenant(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const createTenantSchema = z.object({
      razaoSocial: z.string().min(2),
      nomeFantasia: z.string().optional(),
      cnpj: z.string(),
      email: z.string().email(),
      telefone: z.string().optional(),
      responsavel: z.string(),
      planoId: z.string().optional(),
      status: z.string().default('Trial'),
      limiteUsuarios: z.number().default(5),
      limiteVeiculos: z.number().default(100),
      limiteOficinas: z.number().default(3),
      limiteOs: z.number().default(100),
      adminName: z.string(),
      adminEmail: z.string().email(),
      adminPassword: z.string().min(6)
    });

    try {
      const data = createTenantSchema.parse(req.body);

      // Validar CNPJ único
      const existing = await prisma.saaSTenant.findUnique({ where: { cnpj: data.cnpj } });
      if (existing) {
        return res.status(400).json({ error: 'CNPJ já cadastrado no SaaS' });
      }

      // Descobrir o tipo do plano
      let companyType = 'OFICINA';
      let plan = null;
      if (data.planoId) {
        plan = await prisma.saaSPlan.findUnique({ where: { id: data.planoId } });
        if (plan && plan.tipoPlano) {
          companyType = plan.tipoPlano;
        }
      }

      // 1. Criar empresa correspondente no ambiente operacional
      const cleanCnpj = data.cnpj.replace(/\D/g, '');
      const operationalCompany = await prisma.company.create({
        data: {
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia || data.razaoSocial,
          cnpj: data.cnpj,
          cnpjSemMascara: cleanCnpj,
          telefone: data.telefone,
          email: data.email,
          statusAssinatura: data.status,
          type: companyType,
          dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      // 2. Criar Tenant no SaaS
      const tenant = await prisma.saaSTenant.create({
        data: {
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia || data.razaoSocial,
          cnpj: data.cnpj,
          email: data.email,
          telefone: data.telefone,
          responsavel: data.responsavel,
          planoId: data.planoId || null,
          status: data.status,
          dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          limiteUsuarios: data.limiteUsuarios,
          limiteVeiculos: data.limiteVeiculos,
          limiteOficinas: data.limiteOficinas,
          limiteOs: data.limiteOs,
          companyId: operationalCompany.id
        }
      });

      // 3. Criar Assinatura vinculada no SaaS
      if (plan) {
        await prisma.saaSSubscription.create({
            data: {
              id: tenant.id,
              tenantId: tenant.id,
              planoId: plan.id,
              valor: plan.valorMensal,
              formaPagamento: 'Pix',
              status: data.status === 'Trial' ? 'Pendente' : 'Ativa',
              dataInicio: new Date(),
              dataRenovacao: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          });
      }

      // 4. Criar Administrador operacional da empresa
      const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
      await prisma.user.create({
        data: {
          name: data.adminName,
          email: data.adminEmail,
          password: hashedPassword,
          role: 'ADMIN',
          roleAdmin: true,
          companyId: operationalCompany.id
        }
      });

      await logSaaSAuditoria(adminEmail, 'Criação Tenant', `Criou a empresa ${tenant.razaoSocial} (CNPJ: ${tenant.cnpj})`, tenant.id);

      return res.status(201).json(tenant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar empresa no SaaS.' });
    }
  },

  async updateTenant(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const id = req.params.id as string;
    const updateTenantSchema = z.object({
      razaoSocial: z.string().min(2),
      nomeFantasia: z.string().optional(),
      cnpj: z.string(),
      email: z.string().email(),
      telefone: z.string().optional(),
      responsavel: z.string(),
      status: z.string(),
      planoId: z.string().optional().nullable(),
      limiteUsuarios: z.number(),
      limiteVeiculos: z.number(),
      limiteOficinas: z.number(),
      limiteOs: z.number(),
      dataVencimento: z.string().optional().nullable()
    });

    try {
      const data = updateTenantSchema.parse(req.body);
      const tenant = await prisma.saaSTenant.findUnique({ where: { id } });
      if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada.' });

      const cleanCnpj = data.cnpj.replace(/\D/g, '');
      const vencimento = data.dataVencimento ? new Date(data.dataVencimento) : null;

      const updated = await prisma.saaSTenant.update({
        where: { id },
        data: {
          razaoSocial: data.razaoSocial,
          nomeFantasia: data.nomeFantasia,
          cnpj: data.cnpj,
          email: data.email,
          telefone: data.telefone,
          responsavel: data.responsavel,
          status: data.status,
          planoId: data.planoId,
          limiteUsuarios: data.limiteUsuarios,
          limiteVeiculos: data.limiteVeiculos,
          limiteOficinas: data.limiteOficinas,
          limiteOs: data.limiteOs,
          dataVencimento: vencimento
        }
      });

      // Sincronizar com a empresa operacional
      if (tenant.companyId) {
        let companyType = 'OFICINA';
        if (data.planoId) {
          const plan = await prisma.saaSPlan.findUnique({ where: { id: data.planoId } });
          if (plan && plan.tipoPlano) {
            companyType = plan.tipoPlano;
          }
        }

        await prisma.company.update({
          where: { id: tenant.companyId },
          data: {
            razaoSocial: data.razaoSocial,
            nomeFantasia: data.nomeFantasia,
            cnpj: data.cnpj,
            cnpjSemMascara: cleanCnpj,
            telefone: data.telefone,
            email: data.email,
            statusAssinatura: data.status,
            dataVencimento: vencimento,
            planoId: data.planoId,
            type: companyType
          }
        });
      }

      await logSaaSAuditoria(adminEmail, 'Edição Tenant', `Atualizou os dados da empresa ${updated.razaoSocial}`, updated.id);

      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: (error as any).errors });
      }
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar dados da empresa.' });
    }
  },

  async blockTenant(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { id } = req.body;

    try {
      const tenant = await prisma.saaSTenant.findUnique({ where: { id } });
      if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });

      const updated = await prisma.saaSTenant.update({
        where: { id },
        data: { status: 'Bloqueada' }
      });

      if (tenant.companyId) {
        await prisma.company.update({
          where: { id: tenant.companyId },
          data: { statusAssinatura: 'Bloqueada' }
        });
        // Bloquear todos os usuários operacionais desta empresa
        await prisma.user.updateMany({
          where: { companyId: tenant.companyId },
          data: { status: 'INATIVO' }
        });
      }

      await logSaaSAuditoria(adminEmail, 'Bloqueio Tenant', `Bloqueou a empresa ${updated.razaoSocial}`, updated.id);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao bloquear empresa.' });
    }
  },

  async suspendTenant(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { id } = req.body;

    try {
      const tenant = await prisma.saaSTenant.findUnique({ where: { id } });
      if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });

      const updated = await prisma.saaSTenant.update({
        where: { id },
        data: { status: 'Suspensa' }
      });

      if (tenant.companyId) {
        await prisma.company.update({
          where: { id: tenant.companyId },
          data: { statusAssinatura: 'Suspensa' }
        });
      }

      await logSaaSAuditoria(adminEmail, 'Suspensão Tenant', `Suspendeu a empresa ${updated.razaoSocial}`, updated.id);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao suspender empresa.' });
    }
  },

  async reactivateTenant(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { id } = req.body;

    try {
      const tenant = await prisma.saaSTenant.findUnique({ where: { id } });
      if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });

      const updated = await prisma.saaSTenant.update({
        where: { id },
        data: { status: 'Ativa' }
      });

      if (tenant.companyId) {
        await prisma.company.update({
          where: { id: tenant.companyId },
          data: { statusAssinatura: 'Ativa' }
        });
        // Reativar administradores
        await prisma.user.updateMany({
          where: { companyId: tenant.companyId, roleAdmin: true },
          data: { status: 'ATIVO' }
        });
      }

      await logSaaSAuditoria(adminEmail, 'Reativação Tenant', `Reativou a empresa ${updated.razaoSocial}`, updated.id);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao reativar empresa.' });
    }
  },

  async resetTenantAdminPassword(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { tenantId, newPassword } = req.body;

    try {
      const tenant = await prisma.saaSTenant.findUnique({ where: { id: tenantId } });
      if (!tenant || !tenant.companyId) {
        return res.status(404).json({ error: 'Empresa operacional correspondente não encontrada.' });
      }

      const adminUser = await prisma.user.findFirst({
        where: { companyId: tenant.companyId, roleAdmin: true }
      });

      if (!adminUser) {
        return res.status(404).json({ error: 'Nenhum administrador local encontrado para esta empresa.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { password: hashedPassword }
      });

      await logSaaSAuditoria(adminEmail, 'Reset Senha Tenant Admin', `Resetou a senha do administrador local (${adminUser.email}) da empresa ${tenant.razaoSocial}`, tenant.id);
      return res.json({ success: true, message: 'Senha do administrador resetada com sucesso!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao resetar senha do administrador.' });
    }
  },

  async getTenantHistory(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const logs = await prisma.saaSAuditLog.findMany({
        where: { tenant: id },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      return res.json(logs);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao obter histórico de auditoria da empresa.' });
    }
  },

  async consultarCnpj(req: Request, res: Response) {
    let cnpj = String(req.params.cnpj).replace(/\D/g, '');

    if (cnpj.length !== 14) {
      return res.status(400).json({ error: 'CNPJ inválido' });
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Usando BrasilAPI que é gratuita, rápida e não tem bloqueio agressivo
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'CNPJ não encontrado na base de dados.' });
        }
        throw new Error(`BrasilAPI HTTP error: ${response.status}`);
      }

      const data = await response.json();
      
      const empresaData = {
        razaoSocial: data.razao_social,
        nomeFantasia: data.nome_fantasia || data.razao_social,
        cnpj: data.cnpj,
        situacaoCadastral: data.descricao_situacao_cadastral,
        dataAbertura: data.data_inicio_atividade,
        cnaePrincipal: data.cnae_fiscal_descricao,
        cep: data.cep,
        endereco: data.logradouro,
        numero: data.numero,
        complemento: data.complemento,
        bairro: data.bairro,
        cidade: data.municipio,
        estado: data.uf,
        telefone: data.ddd_telefone_1 || data.ddd_telefone_2 || '',
        email: data.email || ''
      };

      return res.json(empresaData);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return res.status(504).json({ error: 'A consulta demorou muito. Tente novamente ou preencha manualmente.' });
      }
      console.error('Erro ao consultar CNPJ na BrasilAPI:', error.message);
      return res.status(500).json({ error: 'Erro ao consultar CNPJ. O serviço pode estar indisponível no momento.' });
    }
  },

  // ==================================================================
  // 3. GESTÃO DE PLANOS
  // ==================================================================
  async listPlans(req: Request, res: Response) {
    try {
      const plans = await prisma.saaSPlan.findMany({
        orderBy: { nome: 'asc' }
      });
      return res.json(plans);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar planos.' });
    }
  },

  async createPlan(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const planSchema = z.object({
      nome: z.string(),
      descricao: z.string().optional(),
      valorMensal: z.number(),
      valorAnual: z.number(),
      limiteUsuarios: z.number(),
      limiteVeiculos: z.number(),
      limiteOficinas: z.number(),
      limiteOs: z.number(),
      beneficios: z.string().optional()
    });

    try {
      const data = planSchema.parse(req.body);
      const plan = await prisma.saaSPlan.create({
        data: { ...data, ativo: true }
      });

      await logSaaSAuditoria(adminEmail, 'Criação Plano', `Criou o plano SaaS '${plan.nome}'`);
      return res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar plano.' });
    }
  },

  async updatePlan(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const id = req.params.id as string;
    const planSchema = z.object({
      nome: z.string(),
      descricao: z.string().optional(),
      valorMensal: z.number(),
      valorAnual: z.number(),
      limiteUsuarios: z.number(),
      limiteVeiculos: z.number(),
      limiteOficinas: z.number(),
      limiteOs: z.number(),
      beneficios: z.string().optional(),
      ativo: z.boolean()
    });

    try {
      const data = planSchema.parse(req.body);
      const plan = await prisma.saaSPlan.update({
        where: { id },
        data
      });

      // Sincronizar plano na tabela operacional Plan (para integridade de integridades)
      const oldPlan = await prisma.plan.findFirst({ where: { nome: plan.nome } });
      if (oldPlan) {
        await prisma.plan.update({
          where: { id: oldPlan.id },
          data: {
            limiteUsuarios: plan.limiteUsuarios,
            limiteOsMes: plan.limiteOs,
            preco: plan.valorMensal
          }
        });
      }

      await logSaaSAuditoria(adminEmail, 'Edição Plano', `Atualizou o plano SaaS '${plan.nome}'`);
      return res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao editar plano.' });
    }
  },

  async duplicatePlan(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { id } = req.body;

    try {
      const original = await prisma.saaSPlan.findUnique({ where: { id } });
      if (!original) return res.status(404).json({ error: 'Plano original não encontrado' });

      const plan = await prisma.saaSPlan.create({
        data: {
          nome: `${original.nome} (Cópia - ${Date.now().toString().slice(-4)})`,
          descricao: original.descricao,
          valorMensal: original.valorMensal,
          valorAnual: original.valorAnual,
          limiteUsuarios: original.limiteUsuarios,
          limiteVeiculos: original.limiteVeiculos,
          limiteOficinas: original.limiteOficinas,
          limiteOs: original.limiteOs,
          beneficios: original.beneficios,
          ativo: true
        }
      });

      await logSaaSAuditoria(adminEmail, 'Duplicação Plano', `Duplicou o plano '${original.nome}' para o novo plano '${plan.nome}'`);
      return res.status(201).json(plan);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao duplicar plano.' });
    }
  },

  // ==================================================================
  // 4. GESTÃO DE ASSINATURAS
  // ==================================================================
  async listSubscriptions(req: Request, res: Response) {
    try {
      const subs = await prisma.saaSSubscription.findMany({
        include: {
          tenant: true,
          plan: true
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(subs);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar assinaturas.' });
    }
  },

  async renovateSubscription(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { id } = req.body;

    try {
      const sub = await prisma.saaSSubscription.findUnique({ where: { id } });
      if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

      const nextRenovation = new Date(sub.dataRenovacao.getTime() + 30 * 24 * 60 * 60 * 1000);
      const updatedSub = await prisma.saaSSubscription.update({
        where: { id },
        data: {
          status: 'Ativa',
          dataRenovacao: nextRenovation,
          ultimoPagamento: new Date(),
          proximoPagamento: new Date(nextRenovation.getTime() - 2 * 24 * 60 * 60 * 1000)
        }
      });

      await prisma.saaSTenant.update({
        where: { id: sub.tenantId },
        data: {
          status: 'Ativa',
          dataVencimento: nextRenovation
        }
      });

      await logSaaSAuditoria(adminEmail, 'Renovação Assinatura', `Renovou a assinatura do Tenant ID: ${sub.tenantId} até ${nextRenovation.toLocaleDateString('pt-BR')}`, sub.tenantId);
      return res.json(updatedSub);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao renovar assinatura.' });
    }
  },

  async cancelSubscription(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { id } = req.body;

    try {
      const sub = await prisma.saaSSubscription.findUnique({ where: { id } });
      if (!sub) return res.status(404).json({ error: 'Assinatura não encontrada' });

      const updatedSub = await prisma.saaSSubscription.update({
        where: { id },
        data: { status: 'Cancelada' }
      });

      await prisma.saaSTenant.update({
        where: { id: sub.tenantId },
        data: { status: 'Suspensa' } // Ou Inativa
      });

      await logSaaSAuditoria(adminEmail, 'Cancelamento Assinatura', `Cancelou a assinatura do Tenant ID: ${sub.tenantId}`, sub.tenantId);
      return res.json(updatedSub);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
    }
  },

  async getGatewayLogs(req: Request, res: Response) {
    try {
      const logs = await prisma.saaSGatewayLog.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json(logs.map(l => ({
        id: l.id,
        gateway: l.gateway,
        event: l.event,
        payload: l.payload,
        status: l.status,
        date: l.createdAt
      })));
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar logs de gateway.' });
    }
  },

  // ==================================================================
  // 5. MARKETPLACE DE MÓDULOS
  // ==================================================================
  async listModules(req: Request, res: Response) {
    try {
      const modules = await prisma.saaSModule.findMany({
        where: { chave: { notIn: ['api', 'mobile', 'fipe'] } }, // módulos descontinuados
        orderBy: { nome: 'asc' }
      });
      return res.json(modules);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar catálogo de módulos.' });
    }
  },

  async toggleTenantModule(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { tenantId, moduleId, active, valorAdicionalCobrado, configuracao } = req.body;

    try {
      const tenant = await prisma.saaSTenant.findUnique({ where: { id: tenantId } });
      const moduleObj = await prisma.saaSModule.findUnique({ where: { id: moduleId } });

      if (!tenant || !moduleObj) {
        return res.status(404).json({ error: 'Tenant ou Módulo não localizado.' });
      }

      let result;
      if (active) {
        // Habilitar
        result = await prisma.saaSTenantModule.upsert({
          where: { tenantId_moduleId: { tenantId, moduleId } },
          update: { ativo: true, valorAdicionalCobrado: Number(valorAdicionalCobrado) || 0, configuracao: configuracao || '{}' },
          create: { tenantId, moduleId, ativo: true, valorAdicionalCobrado: Number(valorAdicionalCobrado) || 0, configuracao: configuracao || '{}' }
        });

        // Sincronizar na tabela operacional ModuleLicense se a empresa operacional existir
        if (tenant.companyId) {
          // Achar o modulo operacional pela chave correspondente
          const opModule = await prisma.module.findUnique({ where: { chave: moduleObj.chave } });
          if (opModule) {
            await prisma.moduleLicense.upsert({
              where: { companyId_moduleId: { companyId: tenant.companyId, moduleId: opModule.id } },
              update: { ativa: true },
              create: { companyId: tenant.companyId, moduleId: opModule.id, ativa: true }
            });
          } else {
            // Criar módulo na tabela operacional
            const newOpModule = await prisma.module.create({
              data: { nome: moduleObj.nome, chave: moduleObj.chave, descricao: moduleObj.descricao }
            });
            await prisma.moduleLicense.create({
              data: { companyId: tenant.companyId, moduleId: newOpModule.id, ativa: true }
            });
          }
        }

        await logSaaSAuditoria(adminEmail, 'Habilitar Módulo', `Ativou módulo '${moduleObj.nome}' para a empresa ${tenant.razaoSocial}`, tenant.id);
      } else {
        // Desabilitar
        result = await prisma.saaSTenantModule.update({
          where: { tenantId_moduleId: { tenantId, moduleId } },
          data: { ativo: false }
        });

        if (tenant.companyId) {
          const opModule = await prisma.module.findUnique({ where: { chave: moduleObj.chave } });
          if (opModule) {
            await prisma.moduleLicense.update({
              where: { companyId_moduleId: { companyId: tenant.companyId, moduleId: opModule.id } },
              data: { ativa: false }
            });
          }
        }

        await logSaaSAuditoria(adminEmail, 'Desabilitar Módulo', `Desativou módulo '${moduleObj.nome}' para a empresa ${tenant.razaoSocial}`, tenant.id);
      }

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao alternar licença do módulo.' });
    }
  },

  // ==================================================================
  // 6. GESTÃO DE USUÁRIOS GLOBAIS (SaaS Admins)
  // ==================================================================
  async listUsers(req: Request, res: Response) {
    try {
      const users = await prisma.saaSUser.findMany({
        include: { role: true },
        orderBy: { createdAt: 'desc' }
      });

      // Limpar campo de senhas antes de retornar
      const mapped = users.map(u => ({
        id: u.id,
        nome: u.nome,
        email: u.email,
        status: u.status,
        role: u.role?.nome || 'Nenhum',
        roleId: u.roleId,
        ultimoLogin: u.ultimoLogin,
        createdAt: u.createdAt
      }));

      return res.json(mapped);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar usuários de administração.' });
    }
  },

  async createUser(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const schema = z.object({
      nome: z.string(),
      email: z.string().email(),
      password: z.string().min(6),
      roleId: z.string(),
      status: z.string().default('ATIVO')
    });

    try {
      const data = schema.parse(req.body);
      const existing = await prisma.saaSUser.findUnique({ where: { email: data.email } });
      if (existing) {
        return res.status(400).json({ error: 'E-mail administrativo já cadastrado.' });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await prisma.saaSUser.create({
        data: {
          nome: data.nome,
          email: data.email,
          password: hashedPassword,
          roleId: data.roleId,
          status: data.status
        },
        include: { role: true }
      });

      await logSaaSAuditoria(adminEmail, 'Criação Usuário SaaS', `Cadastrou o usuário administrativo '${user.nome}' com perfil '${user.role?.nome}'`);
      return res.status(201).json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        status: user.status,
        role: user.role?.nome || 'Nenhum',
        createdAt: user.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar usuário administrativo.' });
    }
  },

  async updateUser(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const id = req.params.id as string;
    const schema = z.object({
      nome: z.string(),
      email: z.string().email(),
      roleId: z.string(),
      status: z.string()
    });

    try {
      const data = schema.parse(req.body);
      const user = await prisma.saaSUser.update({
        where: { id },
        data,
        include: { role: true }
      });

      await logSaaSAuditoria(adminEmail, 'Edição Usuário SaaS', `Alterou dados do usuário administrativo '${user.nome}'`);
      return res.json({
        id: user.id,
        nome: user.nome,
        email: user.email,
        status: user.status,
        role: user.role?.nome || 'Nenhum',
        createdAt: user.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao editar usuário administrativo.' });
    }
  },

  async resetUserPassword(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { userId, newPassword } = req.body;

    try {
      const user = await prisma.saaSUser.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Usuário administrativo não localizado.' });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.saaSUser.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      await logSaaSAuditoria(adminEmail, 'Reset Senha Usuário SaaS', `Redefiniu a senha do usuário administrativo '${user.nome}' (${user.email})`);
      return res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao redefinir senha.' });
    }
  },

  async listRoles(req: Request, res: Response) {
    try {
      const roles = await prisma.saaSRole.findMany({
        orderBy: { nome: 'asc' }
      });
      return res.json(roles);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar perfis de acesso.' });
    }
  },

  // ==================================================================
  // 7. FINANCEIRO SAAS
  // ==================================================================
  async getFinancialStats(req: Request, res: Response) {
    try {
      const activeSubs = await prisma.saaSSubscription.findMany({ where: { status: 'Ativa' } });
      const mrr = activeSubs.reduce((sum, sub) => sum + sub.valor, 0);

      // Metricas financeiras
      const ticketMedio = mrr / (activeSubs.length || 1);
      
      const cacSetting = await prisma.saaSSetting.findUnique({ where: { chave: 'cac' } });
      const cac = cacSetting ? parseFloat(cacSetting.valor) : 150.00;
      const ltv = ticketMedio * 18; // LifeTime Value (Ticket médio * tempo de retenção médio de 18 meses)

      const [faturamentos, tenants, plans] = await Promise.all([
        prisma.saaSFaturamento.findMany({ orderBy: { createdAt: 'desc' } }),
        prisma.saaSTenant.findMany(),
        prisma.saaSPlan.findMany()
      ]);

      const tenantMap = new Map(tenants.map(t => [t.id, t.razaoSocial]));
      const planMap = new Map(plans.map(p => [p.id, p.nome]));

      const faturamentosReal = faturamentos.map(f => ({
        id: f.id,
        tenant: tenantMap.get(f.empresaId) || 'Desconhecido',
        plano: planMap.get(f.planoId) || 'Desconhecido',
        valor: f.valor,
        formaPagamento: 'Pix',
        status: f.status,
        dataVencimento: f.createdAt,
        dataPagamento: f.dataPagamento
      }));

      const inadimplentesCount = faturamentos.filter(f => f.status === 'ATRASADO').length;
      const inadimplenciaPercent = faturamentos.length > 0 ? (inadimplentesCount / faturamentos.length) * 100 : 0.0;

      const receitas = faturamentos.filter(f => f.status === 'PAGO').reduce((sum, f) => sum + f.valor, 0);
      const despesas = receitas * 0.25; // Proporção simulada de infraestrutura/suporte

      return res.json({
        receitaMensal: mrr,
        receitaAnual: mrr * 12,
        ticketMedio,
        ltv,
        cac,
        fluxoCaixa: {
          receitas,
          despesas,
          saldo: receitas - despesas
        },
        inadimplenciaPercent,
        faturamentos: faturamentosReal
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao computar financeiro SaaS.' });
    }
  },

  // ==================================================================
  // 8. AUDITORIA
  // ==================================================================
  async listAuditLogs(req: Request, res: Response) {
    try {
      const user = req.query.user as string | undefined;
      const acao = req.query.acao as string | undefined;
      const search = req.query.search as string | undefined;

      // Paginação server-side: ?page=0&size=20&sort=dataHora,desc
      const page = Math.max(0, parseInt((req.query.page as string) || '0', 10) || 0);
      const allowedSizes = [10, 20, 50, 100];
      let size = parseInt((req.query.size as string) || '20', 10) || 20;
      if (!allowedSizes.includes(size)) size = 20;

      const sortParam = ((req.query.sort as string) || 'dataHora,desc').split(',');
      const sortDirection = sortParam[1]?.toLowerCase() === 'asc' ? 'asc' : 'desc';

      const where: any = {};

      if (user) {
        where.usuario = { contains: user, mode: 'insensitive' };
      }
      if (acao) {
        where.acao = { contains: acao, mode: 'insensitive' };
      }
      if (search) {
        where.OR = [
          { detalhes: { contains: search, mode: 'insensitive' } },
          { ip: { contains: search, mode: 'insensitive' } }
        ];
      }

      const [totalElements, content] = await Promise.all([
        prisma.saaSAuditLog.count({ where }),
        prisma.saaSAuditLog.findMany({
          where,
          orderBy: { createdAt: sortDirection },
          skip: page * size,
          take: size
        })
      ]);

      return res.json({
        content,
        totalElements,
        totalPages: Math.ceil(totalElements / size),
        page,
        size
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar logs de auditoria.' });
    }
  },

  // ==================================================================
  // 9. MONITORAMENTO OPERACIONAL (CPU, Memória, Banco)
  // ==================================================================
  async getTelemetry(req: Request, res: Response) {
    try {
      const memoryUsage = process.memoryUsage();

      // CPU load calculation
      const cpus = os.cpus();
      const load = os.loadavg()[0];
      const cpuUsage = Math.min(100, Math.max(1, (load / (cpus.length || 1)) * 100)).toFixed(1) + '%';

      // Tamanho real do banco PostgreSQL (null se indisponível)
      let dbSize: string | null = null;
      try {
        const dbSizeResult: any[] = await prisma.$queryRawUnsafe(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
        if (dbSizeResult && dbSizeResult[0]?.size) {
          dbSize = dbSizeResult[0].size;
        }
      } catch (e) {
        console.error('Failed to read db size:', e);
      }

      // Uso real de disco via df -h (null se indisponível)
      let diskUsage: string | null = null;
      try {
        const stdout = execSync('df -h / | tail -1').toString();
        const parts = stdout.split(/\s+/);
        if (parts.length >= 5) {
          diskUsage = `${parts[2]} / ${parts[1]} (${parts[4]})`;
        }
      } catch (e) {
        console.error('Failed to read disk usage:', e);
      }

      // Apenas métricas reais do servidor/banco. Integrações externas (APIs,
      // gateways, filas) só são reportadas quando efetivamente configuradas.
      const telemetry = {
        cpuUsage,
        memoryUsage: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1) + ' MB / ' + (memoryUsage.heapTotal / 1024 / 1024).toFixed(1) + ' MB',
        postgresSize: dbSize,
        diskUsage,
        apis: [] as Array<{ name: string; status: string; ping: string }>
      };

      return res.json(telemetry);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar telemetria operacional.' });
    }
  },

  // ==================================================================
  // 10. CONFIGURAÇÕES GLOBAIS
  // ==================================================================
  async getSettings(req: Request, res: Response) {
    try {
      const settings = await prisma.saaSSetting.findMany();
      const result: Record<string, any> = {};
      settings.forEach(s => {
        try {
          result[s.chave] = JSON.parse(s.valor);
        } catch {
          result[s.chave] = s.valor;
        }
      });

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar configurações.' });
    }
  },

  async saveSettings(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const { key, value } = req.body;

    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      const setting = await prisma.saaSSetting.upsert({
        where: { chave: key },
        update: { valor: stringValue },
        create: { chave: key, valor: stringValue }
      });

      await logSaaSAuditoria(adminEmail, 'Alteração Configurações', `Atualizou a chave de configuração '${key}'`);
      return res.json(setting);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuração.' });
    }
  },

  // ==================================================================
  // 11. GESTÃO DE NOTIFICAÇÕES (ALERTAS SAAS)
  // ==================================================================
  async listNotifications(req: Request, res: Response) {
    try {
      const alerts = await prisma.saaSNotification.findMany({
        orderBy: { createdAt: 'desc' }
      });
      return res.json(alerts);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar alertas.' });
    }
  },

  async createNotification(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const schema = z.object({
      titulo: z.string(),
      mensagem: z.string(),
      tipo: z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR']),
      prioridade: z.enum(['ALTA', 'MEDIA', 'BAIXA']).optional().default('MEDIA'),
      expiraEm: z.string().datetime().optional().nullable(),
      targetCompanyId: z.string().optional().nullable(),
      targetRole: z.string().optional().nullable()
    });

    try {
      const parsed = schema.parse(req.body);
      const alert = await prisma.saaSNotification.create({
        data: {
          titulo: parsed.titulo,
          mensagem: parsed.mensagem,
          tipo: parsed.tipo,
          prioridade: parsed.prioridade,
          expiraEm: parsed.expiraEm ? new Date(parsed.expiraEm) : null,
          targetCompanyId: parsed.targetCompanyId || null,
          targetRole: parsed.targetRole || null
        }
      });

      await logSaaSAuditoria(adminEmail, 'Disparo Notificação', `Enviou alerta geral: '${alert.titulo}'`);
      return res.status(201).json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao disparar alerta.' });
    }
  },

  async updateNotification(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const id = req.params.id as string;
    const schema = z.object({
      titulo: z.string(),
      mensagem: z.string(),
      tipo: z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR']),
      prioridade: z.enum(['ALTA', 'MEDIA', 'BAIXA']).optional().default('MEDIA'),
      expiraEm: z.string().datetime().optional().nullable(),
      targetCompanyId: z.string().optional().nullable(),
      targetRole: z.string().optional().nullable()
    });

    try {
      const parsed = schema.parse(req.body);
      const alert = await prisma.saaSNotification.update({
        where: { id },
        data: {
          titulo: parsed.titulo,
          mensagem: parsed.mensagem,
          tipo: parsed.tipo,
          prioridade: parsed.prioridade,
          expiraEm: parsed.expiraEm ? new Date(parsed.expiraEm) : null,
          targetCompanyId: parsed.targetCompanyId || null,
          targetRole: parsed.targetRole || null
        }
      });

      await logSaaSAuditoria(adminEmail, 'Edição Notificação', `Editou alerta geral: '${alert.titulo}'`);
      return res.json(alert);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao editar alerta.' });
    }
  },

  async deleteNotification(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const id = req.params.id as string;

    try {
      const notification = await prisma.saaSNotification.findUnique({ where: { id } });
      if (!notification) {
        return res.status(404).json({ error: 'Alerta não encontrado.' });
      }

      await prisma.saaSNotification.delete({ where: { id } });

      await logSaaSAuditoria(adminEmail, 'Exclusão Notificação', `Excluiu alerta geral: '${notification.titulo}'`);
      return res.status(204).send();
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao excluir alerta.' });
    }
  },

  async markAsRead(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const id = req.params.id as string;

    try {
      const notification = await prisma.saaSNotification.update({
        where: { id },
        data: { lida: true }
      });

      await logSaaSAuditoria(adminEmail, 'Confirmação Leitura Alerta', `Confirmou leitura do alerta: '${notification.titulo}'`);
      return res.json(notification);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao marcar alerta como lido.' });
    }
  },

  // Alertas ativos para a tela inicial da Oficina (por empresa logada)
  async listActiveNotificationsForCompany(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId as string | null;
      const userId = (req as any).userId as string | null;
      if (!companyId) {
        return res.json([]);
      }

      let userRole: string | null = null;
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (user) {
          // Define standard role names like in the frontend / Notificacoes dropdown
          userRole = user.roleAdmin ? 'Administrador' : user.roleOrcamentista ? 'Orçamentista' : user.roleContabilidade ? 'Contabilidade' : user.role;
        }
      }

      const now = new Date();
      const alerts = await prisma.saaSNotification.findMany({
        where: {
          AND: [
            { OR: [{ expiraEm: null }, { expiraEm: { gte: now } }] },
            { OR: [{ targetCompanyId: null }, { targetCompanyId: companyId }] },
            { OR: [{ targetRole: null }, { targetRole: userRole }] }
          ]
        },
        include: {
          leituras: { where: { companyId }, select: { id: true, createdAt: true } }
        }
      });

      const priorityWeight: Record<string, number> = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
      const result = alerts
        .map(a => ({
          id: a.id,
          titulo: a.titulo,
          mensagem: a.mensagem,
          tipo: a.tipo,
          prioridade: a.prioridade,
          createdAt: a.createdAt,
          expiraEm: a.expiraEm,
          lida: a.leituras.length > 0,
          lidaEm: a.leituras[0]?.createdAt || null
        }))
        .sort((a, b) => {
          const wa = priorityWeight[a.prioridade] ?? 1;
          const wb = priorityWeight[b.prioridade] ?? 1;
          if (wa !== wb) return wa - wb;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar alertas e comunicados.' });
    }
  },

  // Registra leitura de um alerta pela oficina (empresa) logada
  async markNotificationReadForCompany(req: Request, res: Response) {
    try {
      const companyId = (req as any).companyId as string | null;
      const id = req.params.id as string;
      if (!companyId) {
        return res.status(400).json({ error: 'Empresa não identificada na requisição.' });
      }

      const notification = await prisma.saaSNotification.findUnique({ where: { id } });
      if (!notification) {
        return res.status(404).json({ error: 'Alerta não encontrado.' });
      }

      await prisma.saaSNotificationRead.upsert({
        where: { notificationId_companyId: { notificationId: id, companyId } },
        update: {},
        create: { notificationId: id, companyId }
      });

      return res.json({ success: true });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao registrar leitura do alerta.' });
    }
  },

  async acessarTenant(req: Request, res: Response) {
    const adminEmail = (req as any).saasUserEmail || 'admin@suzanoit.com';
    const schema = z.object({
      id: z.string()
    });

    try {
      const { id } = schema.parse(req.body);

      // Encontrar o tenant
      const tenant = await prisma.saaSTenant.findUnique({
        where: { id }
      });

      if (!tenant) {
        return res.status(404).json({ error: 'Empresa do SaaS não encontrada.' });
      }

      if (!tenant.companyId) {
        return res.status(400).json({ error: 'Esta empresa SaaS não possui vínculo com uma oficina operacional.' });
      }

      // Encontrar o primeiro usuário da oficina operacional
      const user = await prisma.user.findFirst({
        where: {
          companyId: tenant.companyId
        }
      });

      if (!user) {
        return res.status(404).json({ error: 'Nenhum usuário operacional encontrado para esta oficina.' });
      }

      // Buscar a primeira oficina (workshopId) vinculada a essa empresa
      const workshop = await prisma.oficina.findFirst({
        where: { companyId: tenant.companyId }
      });

      // Gerar token operacional
      const secret = process.env.JWT_SECRET || 'secret';
      const tokenPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        companyId: tenant.companyId,
        impersonatorEmail: adminEmail // Identifica que é uma impersonificação
      };

      const token = jwt.sign(tokenPayload, secret, { expiresIn: '2h' });

      await logSaaSAuditoria(adminEmail, 'Acesso Oficina Impersonificada', `Iniciou acesso à oficina de '${tenant.razaoSocial}'`);

      return res.json({
        token,
        userId: user.id,
        workshopId: workshop?.id || null
      });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ error: (error as any).errors });
      console.error(error);
      return res.status(500).json({ error: 'Erro ao processar acesso à oficina.' });
    }
  }
};
