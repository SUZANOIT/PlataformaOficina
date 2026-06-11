import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Helper for administrative audit logging
async function registrarAuditoria(usuario: string, action: string, modulo: string, registroAfetado?: string, tenant?: string, ip?: string) {
  try {
    await prisma.saaSAuditoria.create({
      data: {
        usuario,
        acao: action,
        modulo,
        registroAfetado,
        tenant,
        ip: ip || '127.0.0.1'
      }
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}

// Self-healing function to initialize SaaS data if empty
async function inicializarSaaSSeVazio() {
  try {
    const planosCount = await prisma.saaSPlano.count();
    if (planosCount === 0) {
      // Create default plans
      await prisma.saaSPlano.createMany({
        data: [
          { nome: 'Start', descricao: 'Ideal para pequenas oficinas', valorMensal: 99.90, valorAnual: 999.00, limiteUsuarios: 5, limiteVeiculos: 100, limiteOs: 100, limiteOrcamentos: 200, limiteArmazenamento: 1000, ativo: true },
          { nome: 'Professional', descricao: 'Para oficinas em crescimento', valorMensal: 199.90, valorAnual: 1999.00, limiteUsuarios: 15, limiteVeiculos: 500, limiteOs: 500, limiteOrcamentos: 1000, limiteArmazenamento: 5000, ativo: true, possuiWhatsapp: true },
          { nome: 'Business', descricao: 'Gestão completa com integrações', valorMensal: 399.90, valorAnual: 3999.00, limiteUsuarios: 50, limiteVeiculos: 2000, limiteOs: 2000, limiteOrcamentos: 5000, limiteArmazenamento: 20000, ativo: true, possuiWhatsapp: true, possuiIntegracoes: true, possuiBi: true },
          { nome: 'Enterprise', descricao: 'Para grandes redes de oficinas', valorMensal: 799.90, valorAnual: 7999.00, limiteUsuarios: 999, limiteVeiculos: 99999, limiteOs: 99999, limiteOrcamentos: 99999, limiteArmazenamento: 100000, ativo: true, possuiWhatsapp: true, possuiIntegracoes: true, possuiBi: true, possuiApi: true }
        ]
      });
    }

    const configCount = await prisma.saaSConfiguracao.count();
    if (configCount === 0) {
      await prisma.saaSConfiguracao.createMany({
        data: [
          { chave: 'nome_plataforma', valor: 'SuzanoIT Gestão de Oficina' },
          { chave: 'branding', valor: JSON.stringify({ logoPrincipal: '', logoEscura: '', favicon: '', corPrimaria: '#3b82f6', corSecundaria: '#1e3a8a' }) },
          { chave: 'comunicacao', valor: JSON.stringify({ smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpUser: '', smtpPassword: '', smtpFrom: 'noreply@suzanoit.com' }) },
          { chave: 'api_keys', valor: JSON.stringify({ receitaWsToken: '', viaCepEnabled: true }) },
          { chave: 'limites_padrao', valor: JSON.stringify({ usuarios: 5, veiculos: 100, os: 100, armazenamento: 2000 }) }
        ]
      });
    }

    const empresasCount = await prisma.saaSEmpresa.count();
    if (empresasCount === 0) {
      // Sync from existing Company table
      const companies = await prisma.company.findMany({
        include: {
          plan: true
        }
      });

      const defaultPlan = await prisma.saaSPlano.findFirst({ where: { nome: 'Enterprise' } });

      for (const comp of companies) {
        await prisma.saaSEmpresa.create({
          data: {
            id: comp.id,
            razaoSocial: comp.razaoSocial,
            nomeFantasia: comp.nomeFantasia || comp.razaoSocial,
            cnpj: comp.cnpj,
            email: comp.email || 'contato@' + comp.cnpjSemMascara + '.com',
            telefone: comp.telefone || '',
            responsavel: 'Administrador Master',
            planoId: defaultPlan?.id || null,
            status: 'ATIVO',
            dataVencimento: comp.dataVencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            limiteUsuarios: defaultPlan?.limiteUsuarios ?? 10,
            limiteVeiculos: defaultPlan?.limiteVeiculos ?? 500,
            limiteOs: defaultPlan?.limiteOs ?? 500,
            limiteArmazenamento: defaultPlan?.limiteArmazenamento ?? 10000,
            companyId: comp.id
          }
        });

        // Create initial subscription for SaaSEmpresa
        if (defaultPlan) {
          await prisma.saaSAssinatura.create({
            data: {
              empresaId: comp.id,
              planoId: defaultPlan.id,
              valor: defaultPlan.valorMensal,
              status: 'ATIVA',
              dataVencimento: comp.dataVencimento || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              ultimoPagamento: new Date()
            }
          });

          // Seed a fake payment history item
          await prisma.saaSFaturamento.create({
            data: {
              empresaId: comp.id,
              planoId: defaultPlan.id,
              valor: defaultPlan.valorMensal,
              competencia: '06/2026',
              status: 'PAGO',
              dataPagamento: new Date()
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error initializing SaaS data:', error);
  }
}

export const AdminSaaSController = {
  // 1. Dashboard stats
  getDashboardStats: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    await registrarAuditoria(userEmail, 'CONSULTA', 'Dashboard SaaS', 'Metricas Globais');
    await inicializarSaaSSeVazio();

    try {
      const activeCompanies = await prisma.saaSEmpresa.count({ where: { status: 'ATIVO' } });
      const suspendedCompanies = await prisma.saaSEmpresa.count({ where: { status: 'SUSPENSO' } });
      const activeSubs = await prisma.saaSAssinatura.count({ where: { status: 'ATIVA' } });

      // Calculate MRR & ARR from active subscriptions
      const subscriptions = await prisma.saaSAssinatura.findMany({ where: { status: 'ATIVA' } });
      const mrr = subscriptions.reduce((sum, sub) => sum + sub.valor, 0);
      const arr = mrr * 12;

      // Count totals from operational tables
      const totalUsers = await prisma.user.count();
      const totalVehicles = await prisma.vehicle.count();
      const totalOS = await prisma.quote.count({ where: { status: { not: 'Orçamento' } } });
      const totalQuotes = await prisma.quote.count({ where: { status: 'Orçamento' } });

      // Monthly revenue from billing table
      const billing = await prisma.saaSFaturamento.findMany({
        where: {
          status: 'PAGO'
        }
      });
      const monthlyRevenue = billing.reduce((sum, pay) => sum + pay.valor, 0);

      // Group subscriptions by plan
      const subscriptionsByPlan = await prisma.saaSAssinatura.groupBy({
        by: ['planoId'],
        _count: { id: true }
      });

      const plans = await prisma.saaSPlano.findMany();
      const planStats = subscriptionsByPlan.map(stat => {
        const plan = plans.find(p => p.id === stat.planoId);
        return {
          planName: plan?.nome || 'Outro',
          count: stat._count.id
        };
      });

      // Group companies by status
      const companiesByStatusGroup = await prisma.saaSEmpresa.groupBy({
        by: ['status'],
        _count: { id: true }
      });
      const statusStats = companiesByStatusGroup.map(stat => ({
        status: stat.status,
        count: stat._count.id
      }));

      // Fake growth data for charts
      const revenueHistory = [
        { name: 'Jan', valor: mrr * 0.8 },
        { name: 'Fev', valor: mrr * 0.85 },
        { name: 'Mar', valor: mrr * 0.9 },
        { name: 'Abr', valor: mrr * 0.95 },
        { name: 'Mai', valor: mrr * 0.98 },
        { name: 'Jun', valor: mrr }
      ];

      return res.json({
        kpis: {
          activeCompanies,
          suspendedCompanies,
          activeSubs,
          mrr,
          arr,
          totalUsers,
          totalVehicles,
          totalOS,
          totalQuotes,
          monthlyRevenue
        },
        charts: {
          revenueHistory,
          planStats,
          statusStats
        }
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar dados do dashboard' });
    }
  },

  // 2. Empresas CRUD
  listEmpresas: async (req: Request, res: Response) => {
    await inicializarSaaSSeVazio();
    try {
      const empresas = await prisma.saaSEmpresa.findMany({
        orderBy: { createdAt: 'desc' }
      });
      const planos = await prisma.saaSPlano.findMany();

      const result = empresas.map(emp => {
        const plan = planos.find(p => p.id === emp.planoId);
        return {
          ...emp,
          planName: plan?.nome || 'Nenhum'
        };
      });

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar lista de empresas' });
    }
  },

  getEmpresa: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const empresa = await prisma.saaSEmpresa.findUnique({
        where: { id }
      });
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }
      return res.json(empresa);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao buscar detalhes da empresa' });
    }
  },

  createEmpresa: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const {
      razaoSocial,
      nomeFantasia,
      cnpj,
      email,
      telefone,
      responsavel,
      planoId,
      limiteUsuarios,
      limiteVeiculos,
      limiteOs,
      limiteArmazenamento,
      adminName,
      adminEmail,
      adminPassword,
      type
    } = req.body;

    try {
      const existing = await prisma.saaSEmpresa.findUnique({ where: { cnpj } });
      if (existing) {
        return res.status(400).json({ error: 'CNPJ já cadastrado no SaaS' });
      }

      // 1. Create matching operational Company first to preserve architecture
      const cleanCnpj = cnpj.replace(/\D/g, '');
      const operationalCompany = await prisma.company.create({
        data: {
          razaoSocial,
          nomeFantasia,
          cnpj,
          cnpjSemMascara: cleanCnpj,
          telefone,
          email,
          type: type || 'OFICINA',
          statusAssinatura: 'Trial',
          dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      // 2. Create SaaSEmpresa link
      const saasEmpresa = await prisma.saaSEmpresa.create({
        data: {
          razaoSocial,
          nomeFantasia,
          cnpj,
          email,
          telefone,
          responsavel,
          planoId,
          status: 'ATIVO',
          dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          limiteUsuarios: Number(limiteUsuarios) || 5,
          limiteVeiculos: Number(limiteVeiculos) || 100,
          limiteOs: Number(limiteOs) || 100,
          limiteArmazenamento: Number(limiteArmazenamento) || 2000,
          companyId: operationalCompany.id
        }
      });

      // 3. Create SaaS Subscription
      if (planoId) {
        const plan = await prisma.saaSPlano.findUnique({ where: { id: planoId } });
        if (plan) {
          await prisma.saaSAssinatura.create({
            data: {
              empresaId: saasEmpresa.id,
              planoId: plan.id,
              valor: plan.valorMensal,
              status: 'ATIVA',
              dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            }
          });
        }
      }

      // 4. Create primary Administrator user for the company
      if (adminEmail && adminPassword) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await prisma.user.create({
          data: {
            name: adminName || responsavel,
            email: adminEmail,
            password: hashedPassword,
            role: 'ADMIN',
            roleAdmin: true,
            companyId: operationalCompany.id
          }
        });
      }

      await registrarAuditoria(userEmail, 'INCLUSAO', 'Empresas SaaS', saasEmpresa.razaoSocial, saasEmpresa.id);

      return res.status(201).json(saasEmpresa);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar empresa no SaaS' });
    }
  },

  updateEmpresa: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const id = req.params.id as string;
    const {
      razaoSocial,
      nomeFantasia,
      cnpj,
      email,
      telefone,
      responsavel,
      status,
      planoId,
      limiteUsuarios,
      limiteVeiculos,
      limiteOs,
      limiteArmazenamento,
      dataVencimento,
      type
    } = req.body;

    try {
      const empresa = await prisma.saaSEmpresa.findUnique({ where: { id } });
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada' });
      }

      const updated = await prisma.saaSEmpresa.update({
        where: { id },
        data: {
          razaoSocial,
          nomeFantasia,
          cnpj,
          email,
          telefone,
          responsavel,
          status,
          planoId,
          limiteUsuarios: Number(limiteUsuarios),
          limiteVeiculos: Number(limiteVeiculos),
          limiteOs: Number(limiteOs),
          limiteArmazenamento: Number(limiteArmazenamento),
          dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined
        }
      });

      // Synchronize back to operational company
      if (empresa.companyId) {
        await prisma.company.update({
          where: { id: empresa.companyId },
          data: {
            razaoSocial,
            nomeFantasia,
            cnpj,
            cnpjSemMascara: cnpj.replace(/\D/g, ''),
            telefone,
            email,
            type: type || 'OFICINA',
            dataVencimento: dataVencimento ? new Date(dataVencimento) : undefined
          }
        });
      }

      await registrarAuditoria(userEmail, 'ALTERACAO', 'Empresas SaaS', updated.razaoSocial, updated.id);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar dados da empresa' });
    }
  },

  deleteEmpresa: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const id = req.params.id as string;
    try {
      const deleted = await prisma.saaSEmpresa.update({
        where: { id },
        data: { status: 'INATIVO' }
      });
      await registrarAuditoria(userEmail, 'EXCLUSAO', 'Empresas SaaS', deleted.razaoSocial, deleted.id);
      return res.json({ success: true, deleted });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao deletar empresa' });
    }
  },

  suspenderEmpresa: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const updated = await prisma.saaSEmpresa.update({
        where: { id },
        data: { status: 'SUSPENSO' }
      });
      await registrarAuditoria(userEmail, 'SUSPENSAO', 'Empresas SaaS', updated.razaoSocial, updated.id);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao suspender empresa' });
    }
  },

  reativarEmpresa: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const updated = await prisma.saaSEmpresa.update({
        where: { id },
        data: { status: 'ATIVO' }
      });
      await registrarAuditoria(userEmail, 'REATIVACAO', 'Empresas SaaS', updated.razaoSocial, updated.id);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao reativar empresa' });
    }
  },

  resetSenhaAdmin: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { companyId, newPassword } = req.body;
    try {
      const admin = await prisma.user.findFirst({
        where: { companyId, roleAdmin: true }
      });
      if (!admin) {
        return res.status(404).json({ error: 'Administrador deste tenant não encontrado' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: admin.id },
        data: { password: hashedPassword }
      });

      await registrarAuditoria(userEmail, 'ALTERACAO', 'Usuarios SaaS', 'Reset senha admin de ' + admin.email);
      return res.json({ success: true, message: 'Senha resetada com sucesso!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao resetar senha de administrador' });
    }
  },

  acessarTenant: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body; // SaaSEmpresa ID
    try {
      const saasEmpresa = await prisma.saaSEmpresa.findUnique({ where: { id } });
      if (!saasEmpresa || !saasEmpresa.companyId) {
        return res.status(404).json({ error: 'Empresa operacional correspondente não encontrada' });
      }

      await registrarAuditoria(userEmail, 'LOGIN', 'Impersonation SaaS', saasEmpresa.razaoSocial, saasEmpresa.id);

      // Generate a support impersonation token
      const token = jwt.sign(
        { 
          userId: (req as any).userId, 
          userEmail, 
          companyId: saasEmpresa.companyId,
          impersonatorEmail: userEmail // Keep track of the original user
        },
        process.env.JWT_SECRET || 'fallback-secret-key-mca-oficina-saas-platform-token-sig',
        { expiresIn: '1h' }
      );

      return res.json({ token });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar acesso de suporte ao tenant' });
    }
  },

  getHistoricoEmpresa: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const audits = await prisma.saaSAuditoria.findMany({
        where: { tenant: id },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(audits);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao obter logs de auditoria' });
    }
  },

  // 3. Planos CRUD
  listPlanos: async (req: Request, res: Response) => {
    await inicializarSaaSSeVazio();
    try {
      const planos = await prisma.saaSPlano.findMany({
        orderBy: { nome: 'asc' }
      });
      return res.json(planos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar planos' });
    }
  },

  getPlano: async (req: Request, res: Response) => {
    const id = req.params.id as string;
    try {
      const plano = await prisma.saaSPlano.findUnique({ where: { id } });
      if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });
      return res.json(plano);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar detalhes do plano' });
    }
  },

  createPlano: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const {
      nome,
      descricao,
      valorMensal,
      valorAnual,
      limiteUsuarios,
      limiteVeiculos,
      limiteOs,
      limiteOrcamentos,
      limiteArmazenamento,
      possuiApi,
      possuiIntegracoes,
      possuiWhatsapp,
      possuiBi,
      tipoPlano
    } = req.body;

    try {
      const plano = await prisma.saaSPlano.create({
        data: {
          nome,
          descricao,
          valorMensal: Number(valorMensal),
          valorAnual: Number(valorAnual),
          limiteUsuarios: Number(limiteUsuarios),
          limiteVeiculos: Number(limiteVeiculos),
          limiteOs: Number(limiteOs),
          limiteOrcamentos: Number(limiteOrcamentos),
          limiteArmazenamento: Number(limiteArmazenamento),
          possuiApi: Boolean(possuiApi),
          possuiIntegracoes: Boolean(possuiIntegracoes),
          possuiWhatsapp: Boolean(possuiWhatsapp),
          possuiBi: Boolean(possuiBi),
          tipoPlano: tipoPlano || 'OFICINA',
          ativo: true
        }
      });
      await registrarAuditoria(userEmail, 'INCLUSAO', 'Planos SaaS', plano.nome, plano.id);
      return res.status(201).json(plano);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar plano' });
    }
  },

  updatePlano: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const id = req.params.id as string;
    const {
      nome,
      descricao,
      valorMensal,
      valorAnual,
      limiteUsuarios,
      limiteVeiculos,
      limiteOs,
      limiteOrcamentos,
      limiteArmazenamento,
      possuiApi,
      possuiIntegracoes,
      possuiWhatsapp,
      possuiBi,
      tipoPlano,
      ativo
    } = req.body;

    try {
      const plano = await prisma.saaSPlano.update({
        where: { id },
        data: {
          nome,
          descricao,
          valorMensal: Number(valorMensal),
          valorAnual: Number(valorAnual),
          limiteUsuarios: Number(limiteUsuarios),
          limiteVeiculos: Number(limiteVeiculos),
          limiteOs: Number(limiteOs),
          limiteOrcamentos: Number(limiteOrcamentos),
          limiteArmazenamento: Number(limiteArmazenamento),
          possuiApi: Boolean(possuiApi),
          possuiIntegracoes: Boolean(possuiIntegracoes),
          possuiWhatsapp: Boolean(possuiWhatsapp),
          possuiBi: Boolean(possuiBi),
          tipoPlano: tipoPlano || 'OFICINA',
          ativo: Boolean(ativo)
        }
      });
      await registrarAuditoria(userEmail, 'ALTERACAO', 'Planos SaaS', plano.nome, plano.id);
      return res.json(plano);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao atualizar plano' });
    }
  },

  duplicatePlano: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const original = await prisma.saaSPlano.findUnique({ where: { id } });
      if (!original) return res.status(404).json({ error: 'Plano original não encontrado' });

      const copy = await prisma.saaSPlano.create({
        data: {
          nome: `${original.nome} (Copia - ${Date.now().toString().slice(-4)})`,
          descricao: original.descricao,
          valorMensal: original.valorMensal,
          valorAnual: original.valorAnual,
          limiteUsuarios: original.limiteUsuarios,
          limiteVeiculos: original.limiteVeiculos,
          limiteOs: original.limiteOs,
          limiteOrcamentos: original.limiteOrcamentos,
          limiteArmazenamento: original.limiteArmazenamento,
          possuiApi: original.possuiApi,
          possuiIntegracoes: original.possuiIntegracoes,
          possuiWhatsapp: original.possuiWhatsapp,
          possuiBi: original.possuiBi,
          ativo: true
        }
      });

      await registrarAuditoria(userEmail, 'INCLUSAO', 'Planos SaaS', copy.nome, copy.id);
      return res.status(201).json(copy);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao duplicar plano' });
    }
  },

  // 4. Assinaturas CRUD
  listAssinaturas: async (req: Request, res: Response) => {
    try {
      const assinaturas = await prisma.saaSAssinatura.findMany({
        orderBy: { createdAt: 'desc' }
      });
      const empresas = await prisma.saaSEmpresa.findMany();
      const planos = await prisma.saaSPlano.findMany();

      const result = assinaturas.map(sub => {
        const emp = empresas.find(e => e.id === sub.empresaId);
        const plan = planos.find(p => p.id === sub.planoId);
        return {
          ...sub,
          razaoSocial: emp?.razaoSocial || 'Desconhecida',
          planoNome: plan?.nome || 'Nenhum'
        };
      });

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar assinaturas' });
    }
  },

  renovarAssinatura: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const subscription = await prisma.saaSAssinatura.findUnique({ where: { id } });
      if (!subscription) return res.status(404).json({ error: 'Assinatura não encontrada' });

      // Extend expiration by 30 days
      const currentExp = new Date(subscription.dataVencimento).getTime();
      const newExp = new Date(Math.max(Date.now(), currentExp) + 30 * 24 * 60 * 60 * 1000);

      const updated = await prisma.saaSAssinatura.update({
        where: { id },
        data: {
          status: 'ATIVA',
          dataVencimento: newExp,
          ultimoPagamento: new Date()
        }
      });

      // Synchronize to SaaSEmpresa
      await prisma.saaSEmpresa.update({
        where: { id: subscription.empresaId },
        data: {
          status: 'ATIVO',
          dataVencimento: newExp
        }
      });

      await registrarAuditoria(userEmail, 'REATIVACAO', 'Assinaturas SaaS', 'Renovada assinatura ' + id, subscription.empresaId);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao renovar assinatura' });
    }
  },

  cancelarAssinatura: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const subscription = await prisma.saaSAssinatura.findUnique({ where: { id } });
      if (!subscription) return res.status(404).json({ error: 'Assinatura não encontrada' });

      const updated = await prisma.saaSAssinatura.update({
        where: { id },
        data: { status: 'CANCELADA' }
      });

      await prisma.saaSEmpresa.update({
        where: { id: subscription.empresaId },
        data: { status: 'INATIVO' }
      });

      await registrarAuditoria(userEmail, 'EXCLUSAO', 'Assinaturas SaaS', 'Cancelamento de assinatura ' + id, subscription.empresaId);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao cancelar assinatura' });
    }
  },

  suspenderAssinatura: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const subscription = await prisma.saaSAssinatura.findUnique({ where: { id } });
      if (!subscription) return res.status(404).json({ error: 'Assinatura não encontrada' });

      const updated = await prisma.saaSAssinatura.update({
        where: { id },
        data: { status: 'SUSPENSA' }
      });

      await prisma.saaSEmpresa.update({
        where: { id: subscription.empresaId },
        data: { status: 'SUSPENSO' }
      });

      await registrarAuditoria(userEmail, 'SUSPENSAO', 'Assinaturas SaaS', 'Suspensão de assinatura ' + id, subscription.empresaId);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao suspender assinatura' });
    }
  },

  reativarAssinatura: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const subscription = await prisma.saaSAssinatura.findUnique({ where: { id } });
      if (!subscription) return res.status(404).json({ error: 'Assinatura não encontrada' });

      const updated = await prisma.saaSAssinatura.update({
        where: { id },
        data: { status: 'ATIVA' }
      });

      await prisma.saaSEmpresa.update({
        where: { id: subscription.empresaId },
        data: { status: 'ATIVO' }
      });

      await registrarAuditoria(userEmail, 'REATIVACAO', 'Assinaturas SaaS', 'Reativação de assinatura ' + id, subscription.empresaId);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao reativar assinatura' });
    }
  },

  gerarCobranca: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { empresaId, planoId, valor, competencia } = req.body;
    try {
      const faturamento = await prisma.saaSFaturamento.create({
        data: {
          empresaId,
          planoId,
          valor: Number(valor),
          competencia,
          status: 'PENDENTE'
        }
      });

      await registrarAuditoria(userEmail, 'INCLUSAO', 'Faturamento SaaS', 'Gerada cobranca de R$' + valor + ' competencia ' + competencia, empresaId);
      return res.status(201).json(faturamento);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao gerar cobrança' });
    }
  },

  // 5. Usuários SaaS
  listUsuarios: async (req: Request, res: Response) => {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' }
      });
      const companies = await prisma.company.findMany();

      const result = users.map(u => {
        const comp = companies.find(c => c.id === u.companyId);
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          roleAdmin: u.roleAdmin,
          status: u.status,
          createdAt: u.createdAt,
          companyName: comp?.razaoSocial || 'Sem Empresa'
        };
      });

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar usuários' });
    }
  },

  bloquearUsuario: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: 'INATIVO' }
      });
      await registrarAuditoria(userEmail, 'ALTERACAO', 'Usuarios SaaS', 'Bloqueio de usuario ' + updated.email);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao bloquear usuário' });
    }
  },

  desbloquearUsuario: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id } = req.body;
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { status: 'ATIVO' }
      });
      await registrarAuditoria(userEmail, 'ALTERACAO', 'Usuarios SaaS', 'Desbloqueio de usuario ' + updated.email);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao desbloquear usuário' });
    }
  },

  redefinirSenhaUsuario: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id, newPassword } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      const updated = await prisma.user.update({
        where: { id },
        data: { password: hashedPassword }
      });
      await registrarAuditoria(userEmail, 'ALTERACAO', 'Usuarios SaaS', 'Redefinir senha de ' + updated.email);
      return res.json({ success: true, message: 'Senha redefinida com sucesso!' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao redefinir senha do usuário' });
    }
  },

  alterarPerfilUsuario: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id, role, roleAdmin } = req.body;
    try {
      const updated = await prisma.user.update({
        where: { id },
        data: { 
          role,
          roleAdmin: roleAdmin !== undefined ? Boolean(roleAdmin) : undefined
        }
      });
      await registrarAuditoria(userEmail, 'ALTERACAO', 'Usuarios SaaS', 'Alteracao perfil de ' + updated.email + ' para ' + role);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao alterar perfil do usuário' });
    }
  },

  getAuditoriaUsuario: async (req: Request, res: Response) => {
    const email = req.params.email as string;
    try {
      const logs = await prisma.saaSAuditoria.findMany({
        where: { usuario: email },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(logs);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao obter logs de auditoria do usuário' });
    }
  },

  // 6. Faturamento
  listFaturamentos: async (req: Request, res: Response) => {
    try {
      const faturamentos = await prisma.saaSFaturamento.findMany({
        orderBy: { createdAt: 'desc' }
      });
      const empresas = await prisma.saaSEmpresa.findMany();
      const planos = await prisma.saaSPlano.findMany();

      const result = faturamentos.map(f => {
        const emp = empresas.find(e => e.id === f.empresaId);
        const plan = planos.find(p => p.id === f.planoId);
        return {
          ...f,
          razaoSocial: emp?.razaoSocial || 'Desconhecida',
          planoNome: plan?.nome || 'Nenhum'
        };
      });

      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar faturamentos' });
    }
  },

  alterarStatusFaturamento: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { id, status } = req.body;
    try {
      const updated = await prisma.saaSFaturamento.update({
        where: { id },
        data: { 
          status,
          dataPagamento: status === 'PAGO' ? new Date() : null
        }
      });
      await registrarAuditoria(userEmail, 'ALTERACAO', 'Faturamento SaaS', 'Alterado status fatura ' + id + ' para ' + status, updated.empresaId);
      return res.json(updated);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao alterar status da fatura' });
    }
  },

  // 7. Configurações
  getConfiguracoes: async (req: Request, res: Response) => {
    await inicializarSaaSSeVazio();
    try {
      const configs = await prisma.saaSConfiguracao.findMany();
      const result: Record<string, any> = {};
      configs.forEach(c => {
        try {
          result[c.chave] = JSON.parse(c.valor);
        } catch {
          result[c.chave] = c.valor;
        }
      });
      return res.json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao carregar configurações globais' });
    }
  },

  salvarConfiguracoes: async (req: Request, res: Response) => {
    const userEmail = (req as any).userEmail || 'admin';
    const { key, value } = req.body;
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      const config = await prisma.saaSConfiguracao.upsert({
        where: { chave: key },
        update: { valor: stringValue },
        create: { chave: key, valor: stringValue }
      });

      await registrarAuditoria(userEmail, 'ALTERACAO', 'Configuracoes SaaS', 'Atualizada chave de configuracao: ' + key);
      return res.json(config);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao salvar configuração global' });
    }
  }
};
