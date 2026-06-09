"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaaSPortalController = void 0;
const prisma_1 = require("../lib/prisma");
const bcrypt_1 = __importDefault(require("bcrypt"));
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
// Helper de Auditoria do SaaS
async function logSaaSAuditoria(usuario, acao, detalhes, tenant, ip) {
    try {
        await prisma_1.prisma.saaSAuditLog.create({
            data: {
                usuario,
                acao,
                detalhes: detalhes || '',
                tenant: tenant || null,
                ip: ip || '127.0.0.1'
            }
        });
    }
    catch (err) {
        console.error('Falha ao registrar log de auditoria no SaaS:', err);
    }
}
exports.SaaSPortalController = {
    // ==================================================================
    // 1. DASHBOARD EXECUTIVO
    // ==================================================================
    async getDashboard(req, res) {
        try {
            const email = req.saasUserEmail || 'admin@suzanoit.com';
            await logSaaSAuditoria(email, 'Acesso Dashboard', 'Visualizou o painel executivo do SaaS');
            // KPIs
            const totalTenants = await prisma_1.prisma.saaSTenant.count();
            const activeTenants = await prisma_1.prisma.saaSTenant.count({ where: { status: 'Ativa' } });
            const trialTenants = await prisma_1.prisma.saaSTenant.count({ where: { status: 'Trial' } });
            const suspendedTenants = await prisma_1.prisma.saaSTenant.count({ where: { status: 'Suspensa' } });
            const blockedTenants = await prisma_1.prisma.saaSTenant.count({ where: { status: 'Bloqueada' } });
            const totalWorkshops = await prisma_1.prisma.oficina.count();
            const activeUsers = await prisma_1.prisma.user.count({ where: { status: 'ATIVO' } });
            const activeSubscriptionsCount = await prisma_1.prisma.saaSSubscription.count({ where: { status: 'Ativa' } });
            const cancelledSubscriptionsCount = await prisma_1.prisma.saaSSubscription.count({ where: { status: 'Cancelada' } });
            const pendingSubscriptionsCount = await prisma_1.prisma.saaSSubscription.count({ where: { status: 'Pendente' } });
            // Calcular MRR (Monthly Recurring Revenue) de assinaturas ativas
            const activeSubs = await prisma_1.prisma.saaSSubscription.findMany({
                where: { status: 'Ativa' }
            });
            const mrr = activeSubs.reduce((sum, sub) => sum + sub.valor, 0);
            const arr = mrr * 12;
            // Churn e inadimplência
            const inadimplentesCount = await prisma_1.prisma.saaSSubscription.count({
                where: { status: 'Atrasada' }
            });
            // Distribuição por plano
            const plans = await prisma_1.prisma.saaSPlan.findMany();
            const planDistribution = await Promise.all(plans.map(async (p) => {
                const count = await prisma_1.prisma.saaSTenant.count({ where: { planoId: p.id, status: 'Ativa' } });
                return {
                    planoNome: p.nome,
                    quantidade: count,
                    mrrContribuicao: count * p.valorMensal
                };
            }));
            // Módulos mais utilizados no Marketplace
            const modules = await prisma_1.prisma.saaSModule.findMany();
            const moduleStats = await Promise.all(modules.map(async (m) => {
                const count = await prisma_1.prisma.saaSTenantModule.count({ where: { moduleId: m.id, ativo: true } });
                return {
                    moduloNome: m.nome,
                    chave: m.chave,
                    quantidade: count
                };
            }));
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
            const tenants = await prisma_1.prisma.saaSTenant.findMany({
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
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar dashboard executivo.' });
        }
    },
    // ==================================================================
    // 2. GESTÃO DE TENANTS (EMPRESAS)
    // ==================================================================
    async listTenants(req, res) {
        try {
            const search = req.query.search;
            const status = req.query.status;
            const planId = req.query.planId;
            const whereClause = {};
            if (status && status !== 'all') {
                whereClause.status = status;
            }
            if (planId && planId !== 'all') {
                whereClause.planoId = planId;
            }
            if (search) {
                whereClause.OR = [
                    { razaoSocial: { contains: search, mode: 'insensitive' } },
                    { nomeFantasia: { contains: search, mode: 'insensitive' } },
                    { cnpj: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } }
                ];
            }
            const tenants = await prisma_1.prisma.saaSTenant.findMany({
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
            // Anexar contagens operacionais reais
            const result = await Promise.all(tenants.map(async (t) => {
                let usersCount = 0;
                let vehiclesCount = 0;
                let workshopsCount = 0;
                let osCount = 0;
                if (t.companyId) {
                    usersCount = await prisma_1.prisma.user.count({ where: { companyId: t.companyId } });
                    vehiclesCount = await prisma_1.prisma.vehicle.count({ where: { companyId: t.companyId } });
                    workshopsCount = await prisma_1.prisma.oficina.count({ where: { companyId: t.companyId } });
                    osCount = await prisma_1.prisma.quote.count({ where: { companyId: t.companyId } });
                }
                return {
                    ...t,
                    usersCount,
                    vehiclesCount,
                    workshopsCount,
                    osCount
                };
            }));
            return res.json(result);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar lista de empresas' });
        }
    },
    async getTenant(req, res) {
        try {
            const id = req.params.id;
            const t = await prisma_1.prisma.saaSTenant.findUnique({
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
            if (!t)
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            let usersCount = 0;
            let vehiclesCount = 0;
            let workshopsCount = 0;
            let osCount = 0;
            if (t.companyId) {
                usersCount = await prisma_1.prisma.user.count({ where: { companyId: t.companyId } });
                vehiclesCount = await prisma_1.prisma.vehicle.count({ where: { companyId: t.companyId } });
                workshopsCount = await prisma_1.prisma.oficina.count({ where: { companyId: t.companyId } });
                osCount = await prisma_1.prisma.quote.count({ where: { companyId: t.companyId } });
            }
            return res.json({
                ...t,
                usersCount,
                vehiclesCount,
                workshopsCount,
                osCount
            });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar detalhes da empresa.' });
        }
    },
    async createTenant(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const createTenantSchema = zod_1.z.object({
            razaoSocial: zod_1.z.string().min(2),
            nomeFantasia: zod_1.z.string().optional(),
            cnpj: zod_1.z.string(),
            email: zod_1.z.string().email(),
            telefone: zod_1.z.string().optional(),
            responsavel: zod_1.z.string(),
            planoId: zod_1.z.string().optional(),
            status: zod_1.z.string().default('Trial'),
            limiteUsuarios: zod_1.z.number().default(5),
            limiteVeiculos: zod_1.z.number().default(100),
            limiteOficinas: zod_1.z.number().default(3),
            limiteOs: zod_1.z.number().default(100),
            adminName: zod_1.z.string(),
            adminEmail: zod_1.z.string().email(),
            adminPassword: zod_1.z.string().min(6)
        });
        try {
            const data = createTenantSchema.parse(req.body);
            // Validar CNPJ único
            const existing = await prisma_1.prisma.saaSTenant.findUnique({ where: { cnpj: data.cnpj } });
            if (existing) {
                return res.status(400).json({ error: 'CNPJ já cadastrado no SaaS' });
            }
            // 1. Criar empresa correspondente no ambiente operacional
            const cleanCnpj = data.cnpj.replace(/\D/g, '');
            const operationalCompany = await prisma_1.prisma.company.create({
                data: {
                    razaoSocial: data.razaoSocial,
                    nomeFantasia: data.nomeFantasia || data.razaoSocial,
                    cnpj: data.cnpj,
                    cnpjSemMascara: cleanCnpj,
                    telefone: data.telefone,
                    email: data.email,
                    statusAssinatura: data.status,
                    dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                }
            });
            // 2. Criar Tenant no SaaS
            const tenant = await prisma_1.prisma.saaSTenant.create({
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
            if (data.planoId) {
                const plan = await prisma_1.prisma.saaSPlan.findUnique({ where: { id: data.planoId } });
                if (plan) {
                    await prisma_1.prisma.saaSSubscription.create({
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
            }
            // 4. Criar Administrador operacional da empresa
            const hashedPassword = await bcrypt_1.default.hash(data.adminPassword, 10);
            await prisma_1.prisma.user.create({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error(error);
            return res.status(500).json({ error: 'Erro ao criar empresa no SaaS.' });
        }
    },
    async updateTenant(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const id = req.params.id;
        const updateTenantSchema = zod_1.z.object({
            razaoSocial: zod_1.z.string().min(2),
            nomeFantasia: zod_1.z.string().optional(),
            cnpj: zod_1.z.string(),
            email: zod_1.z.string().email(),
            telefone: zod_1.z.string().optional(),
            responsavel: zod_1.z.string(),
            status: zod_1.z.string(),
            planoId: zod_1.z.string().optional().nullable(),
            limiteUsuarios: zod_1.z.number(),
            limiteVeiculos: zod_1.z.number(),
            limiteOficinas: zod_1.z.number(),
            limiteOs: zod_1.z.number(),
            dataVencimento: zod_1.z.string().optional().nullable()
        });
        try {
            const data = updateTenantSchema.parse(req.body);
            const tenant = await prisma_1.prisma.saaSTenant.findUnique({ where: { id } });
            if (!tenant)
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            const cleanCnpj = data.cnpj.replace(/\D/g, '');
            const vencimento = data.dataVencimento ? new Date(data.dataVencimento) : null;
            const updated = await prisma_1.prisma.saaSTenant.update({
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
                await prisma_1.prisma.company.update({
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
                        plano_id: data.planoId
                    }
                });
            }
            await logSaaSAuditoria(adminEmail, 'Edição Tenant', `Atualizou os dados da empresa ${updated.razaoSocial}`, updated.id);
            return res.json(updated);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error(error);
            return res.status(500).json({ error: 'Erro ao atualizar dados da empresa.' });
        }
    },
    async blockTenant(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { id } = req.body;
        try {
            const tenant = await prisma_1.prisma.saaSTenant.findUnique({ where: { id } });
            if (!tenant)
                return res.status(404).json({ error: 'Empresa não encontrada' });
            const updated = await prisma_1.prisma.saaSTenant.update({
                where: { id },
                data: { status: 'Bloqueada' }
            });
            if (tenant.companyId) {
                await prisma_1.prisma.company.update({
                    where: { id: tenant.companyId },
                    data: { statusAssinatura: 'Bloqueada' }
                });
                // Bloquear todos os usuários operacionais desta empresa
                await prisma_1.prisma.user.updateMany({
                    where: { companyId: tenant.companyId },
                    data: { status: 'INATIVO' }
                });
            }
            await logSaaSAuditoria(adminEmail, 'Bloqueio Tenant', `Bloqueou a empresa ${updated.razaoSocial}`, updated.id);
            return res.json(updated);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao bloquear empresa.' });
        }
    },
    async suspendTenant(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { id } = req.body;
        try {
            const tenant = await prisma_1.prisma.saaSTenant.findUnique({ where: { id } });
            if (!tenant)
                return res.status(404).json({ error: 'Empresa não encontrada' });
            const updated = await prisma_1.prisma.saaSTenant.update({
                where: { id },
                data: { status: 'Suspensa' }
            });
            if (tenant.companyId) {
                await prisma_1.prisma.company.update({
                    where: { id: tenant.companyId },
                    data: { statusAssinatura: 'Suspensa' }
                });
            }
            await logSaaSAuditoria(adminEmail, 'Suspensão Tenant', `Suspendeu a empresa ${updated.razaoSocial}`, updated.id);
            return res.json(updated);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao suspender empresa.' });
        }
    },
    async reactivateTenant(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { id } = req.body;
        try {
            const tenant = await prisma_1.prisma.saaSTenant.findUnique({ where: { id } });
            if (!tenant)
                return res.status(404).json({ error: 'Empresa não encontrada' });
            const updated = await prisma_1.prisma.saaSTenant.update({
                where: { id },
                data: { status: 'Ativa' }
            });
            if (tenant.companyId) {
                await prisma_1.prisma.company.update({
                    where: { id: tenant.companyId },
                    data: { statusAssinatura: 'Ativa' }
                });
                // Reativar administradores
                await prisma_1.prisma.user.updateMany({
                    where: { companyId: tenant.companyId, roleAdmin: true },
                    data: { status: 'ATIVO' }
                });
            }
            await logSaaSAuditoria(adminEmail, 'Reativação Tenant', `Reativou a empresa ${updated.razaoSocial}`, updated.id);
            return res.json(updated);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao reativar empresa.' });
        }
    },
    async resetTenantAdminPassword(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { tenantId, newPassword } = req.body;
        try {
            const tenant = await prisma_1.prisma.saaSTenant.findUnique({ where: { id: tenantId } });
            if (!tenant || !tenant.companyId) {
                return res.status(404).json({ error: 'Empresa operacional correspondente não encontrada.' });
            }
            const adminUser = await prisma_1.prisma.user.findFirst({
                where: { companyId: tenant.companyId, roleAdmin: true }
            });
            if (!adminUser) {
                return res.status(404).json({ error: 'Nenhum administrador local encontrado para esta empresa.' });
            }
            const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
            await prisma_1.prisma.user.update({
                where: { id: adminUser.id },
                data: { password: hashedPassword }
            });
            await logSaaSAuditoria(adminEmail, 'Reset Senha Tenant Admin', `Resetou a senha do administrador local (${adminUser.email}) da empresa ${tenant.razaoSocial}`, tenant.id);
            return res.json({ success: true, message: 'Senha do administrador resetada com sucesso!' });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao resetar senha do administrador.' });
        }
    },
    async getTenantHistory(req, res) {
        const id = req.params.id;
        try {
            const logs = await prisma_1.prisma.saaSAuditLog.findMany({
                where: { tenant: id },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(logs);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao obter histórico de auditoria da empresa.' });
        }
    },
    // ==================================================================
    // 3. GESTÃO DE PLANOS
    // ==================================================================
    async listPlans(req, res) {
        try {
            const plans = await prisma_1.prisma.saaSPlan.findMany({
                orderBy: { nome: 'asc' }
            });
            return res.json(plans);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar planos.' });
        }
    },
    async createPlan(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const planSchema = zod_1.z.object({
            nome: zod_1.z.string(),
            descricao: zod_1.z.string().optional(),
            valorMensal: zod_1.z.number(),
            valorAnual: zod_1.z.number(),
            limiteUsuarios: zod_1.z.number(),
            limiteVeiculos: zod_1.z.number(),
            limiteOficinas: zod_1.z.number(),
            limiteOs: zod_1.z.number(),
            beneficios: zod_1.z.string().optional()
        });
        try {
            const data = planSchema.parse(req.body);
            const plan = await prisma_1.prisma.saaSPlan.create({
                data: { ...data, ativo: true }
            });
            await logSaaSAuditoria(adminEmail, 'Criação Plano', `Criou o plano SaaS '${plan.nome}'`);
            return res.status(201).json(plan);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            console.error(error);
            return res.status(500).json({ error: 'Erro ao criar plano.' });
        }
    },
    async updatePlan(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const id = req.params.id;
        const planSchema = zod_1.z.object({
            nome: zod_1.z.string(),
            descricao: zod_1.z.string().optional(),
            valorMensal: zod_1.z.number(),
            valorAnual: zod_1.z.number(),
            limiteUsuarios: zod_1.z.number(),
            limiteVeiculos: zod_1.z.number(),
            limiteOficinas: zod_1.z.number(),
            limiteOs: zod_1.z.number(),
            beneficios: zod_1.z.string().optional(),
            ativo: zod_1.z.boolean()
        });
        try {
            const data = planSchema.parse(req.body);
            const plan = await prisma_1.prisma.saaSPlan.update({
                where: { id },
                data
            });
            // Sincronizar plano na tabela operacional Plan (para integridade de integridades)
            const oldPlan = await prisma_1.prisma.plan.findFirst({ where: { nome: plan.nome } });
            if (oldPlan) {
                await prisma_1.prisma.plan.update({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            console.error(error);
            return res.status(500).json({ error: 'Erro ao editar plano.' });
        }
    },
    async duplicatePlan(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { id } = req.body;
        try {
            const original = await prisma_1.prisma.saaSPlan.findUnique({ where: { id } });
            if (!original)
                return res.status(404).json({ error: 'Plano original não encontrado' });
            const plan = await prisma_1.prisma.saaSPlan.create({
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
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao duplicar plano.' });
        }
    },
    // ==================================================================
    // 4. GESTÃO DE ASSINATURAS
    // ==================================================================
    async listSubscriptions(req, res) {
        try {
            const subs = await prisma_1.prisma.saaSSubscription.findMany({
                include: {
                    tenant: true,
                    plan: true
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json(subs);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar assinaturas.' });
        }
    },
    async renovateSubscription(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { id } = req.body;
        try {
            const sub = await prisma_1.prisma.saaSSubscription.findUnique({ where: { id } });
            if (!sub)
                return res.status(404).json({ error: 'Assinatura não encontrada' });
            const nextRenovation = new Date(sub.dataRenovacao.getTime() + 30 * 24 * 60 * 60 * 1000);
            const updatedSub = await prisma_1.prisma.saaSSubscription.update({
                where: { id },
                data: {
                    status: 'Ativa',
                    dataRenovacao: nextRenovation,
                    ultimoPagamento: new Date(),
                    proximoPagamento: new Date(nextRenovation.getTime() - 2 * 24 * 60 * 60 * 1000)
                }
            });
            await prisma_1.prisma.saaSTenant.update({
                where: { id: sub.tenantId },
                data: {
                    status: 'Ativa',
                    dataVencimento: nextRenovation
                }
            });
            await logSaaSAuditoria(adminEmail, 'Renovação Assinatura', `Renovou a assinatura do Tenant ID: ${sub.tenantId} até ${nextRenovation.toLocaleDateString('pt-BR')}`, sub.tenantId);
            return res.json(updatedSub);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao renovar assinatura.' });
        }
    },
    async cancelSubscription(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { id } = req.body;
        try {
            const sub = await prisma_1.prisma.saaSSubscription.findUnique({ where: { id } });
            if (!sub)
                return res.status(404).json({ error: 'Assinatura não encontrada' });
            const updatedSub = await prisma_1.prisma.saaSSubscription.update({
                where: { id },
                data: { status: 'Cancelada' }
            });
            await prisma_1.prisma.saaSTenant.update({
                where: { id: sub.tenantId },
                data: { status: 'Suspensa' } // Ou Inativa
            });
            await logSaaSAuditoria(adminEmail, 'Cancelamento Assinatura', `Cancelou a assinatura do Tenant ID: ${sub.tenantId}`, sub.tenantId);
            return res.json(updatedSub);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao cancelar assinatura.' });
        }
    },
    async getGatewayLogs(req, res) {
        try {
            const logs = await prisma_1.prisma.saaSGatewayLog.findMany({
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
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar logs de gateway.' });
        }
    },
    // ==================================================================
    // 5. MARKETPLACE DE MÓDULOS
    // ==================================================================
    async listModules(req, res) {
        try {
            const modules = await prisma_1.prisma.saaSModule.findMany({
                orderBy: { nome: 'asc' }
            });
            return res.json(modules);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar catálogo de módulos.' });
        }
    },
    async toggleTenantModule(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { tenantId, moduleId, active, valorAdicionalCobrado, configuracao } = req.body;
        try {
            const tenant = await prisma_1.prisma.saaSTenant.findUnique({ where: { id: tenantId } });
            const moduleObj = await prisma_1.prisma.saaSModule.findUnique({ where: { id: moduleId } });
            if (!tenant || !moduleObj) {
                return res.status(404).json({ error: 'Tenant ou Módulo não localizado.' });
            }
            let result;
            if (active) {
                // Habilitar
                result = await prisma_1.prisma.saaSTenantModule.upsert({
                    where: { tenantId_moduleId: { tenantId, moduleId } },
                    update: { ativo: true, valorAdicionalCobrado: Number(valorAdicionalCobrado) || 0, configuracao: configuracao || '{}' },
                    create: { tenantId, moduleId, ativo: true, valorAdicionalCobrado: Number(valorAdicionalCobrado) || 0, configuracao: configuracao || '{}' }
                });
                // Sincronizar na tabela operacional ModuleLicense se a empresa operacional existir
                if (tenant.companyId) {
                    // Achar o modulo operacional pela chave correspondente
                    const opModule = await prisma_1.prisma.module.findUnique({ where: { chave: moduleObj.chave } });
                    if (opModule) {
                        await prisma_1.prisma.moduleLicense.upsert({
                            where: { companyId_moduleId: { companyId: tenant.companyId, moduleId: opModule.id } },
                            update: { ativa: true },
                            create: { companyId: tenant.companyId, moduleId: opModule.id, ativa: true }
                        });
                    }
                    else {
                        // Criar módulo na tabela operacional
                        const newOpModule = await prisma_1.prisma.module.create({
                            data: { nome: moduleObj.nome, chave: moduleObj.chave, descricao: moduleObj.descricao }
                        });
                        await prisma_1.prisma.moduleLicense.create({
                            data: { companyId: tenant.companyId, moduleId: newOpModule.id, ativa: true }
                        });
                    }
                }
                await logSaaSAuditoria(adminEmail, 'Habilitar Módulo', `Ativou módulo '${moduleObj.nome}' para a empresa ${tenant.razaoSocial}`, tenant.id);
            }
            else {
                // Desabilitar
                result = await prisma_1.prisma.saaSTenantModule.update({
                    where: { tenantId_moduleId: { tenantId, moduleId } },
                    data: { ativo: false }
                });
                if (tenant.companyId) {
                    const opModule = await prisma_1.prisma.module.findUnique({ where: { chave: moduleObj.chave } });
                    if (opModule) {
                        await prisma_1.prisma.moduleLicense.update({
                            where: { companyId_moduleId: { companyId: tenant.companyId, moduleId: opModule.id } },
                            data: { ativa: false }
                        });
                    }
                }
                await logSaaSAuditoria(adminEmail, 'Desabilitar Módulo', `Desativou módulo '${moduleObj.nome}' para a empresa ${tenant.razaoSocial}`, tenant.id);
            }
            return res.json(result);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao alternar licença do módulo.' });
        }
    },
    // ==================================================================
    // 6. GESTÃO DE USUÁRIOS GLOBAIS (SaaS Admins)
    // ==================================================================
    async listUsers(req, res) {
        try {
            const users = await prisma_1.prisma.saaSUser.findMany({
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
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar usuários de administração.' });
        }
    },
    async createUser(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const schema = zod_1.z.object({
            nome: zod_1.z.string(),
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(6),
            roleId: zod_1.z.string(),
            status: zod_1.z.string().default('ATIVO')
        });
        try {
            const data = schema.parse(req.body);
            const existing = await prisma_1.prisma.saaSUser.findUnique({ where: { email: data.email } });
            if (existing) {
                return res.status(400).json({ error: 'E-mail administrativo já cadastrado.' });
            }
            const hashedPassword = await bcrypt_1.default.hash(data.password, 10);
            const user = await prisma_1.prisma.saaSUser.create({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            console.error(error);
            return res.status(500).json({ error: 'Erro ao criar usuário administrativo.' });
        }
    },
    async updateUser(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const id = req.params.id;
        const schema = zod_1.z.object({
            nome: zod_1.z.string(),
            email: zod_1.z.string().email(),
            roleId: zod_1.z.string(),
            status: zod_1.z.string()
        });
        try {
            const data = schema.parse(req.body);
            const user = await prisma_1.prisma.saaSUser.update({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            console.error(error);
            return res.status(500).json({ error: 'Erro ao editar usuário administrativo.' });
        }
    },
    async resetUserPassword(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { userId, newPassword } = req.body;
        try {
            const user = await prisma_1.prisma.saaSUser.findUnique({ where: { id: userId } });
            if (!user)
                return res.status(404).json({ error: 'Usuário administrativo não localizado.' });
            const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
            await prisma_1.prisma.saaSUser.update({
                where: { id: userId },
                data: { password: hashedPassword }
            });
            await logSaaSAuditoria(adminEmail, 'Reset Senha Usuário SaaS', `Redefiniu a senha do usuário administrativo '${user.nome}' (${user.email})`);
            return res.json({ success: true, message: 'Senha redefinida com sucesso!' });
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao redefinir senha.' });
        }
    },
    async listRoles(req, res) {
        try {
            const roles = await prisma_1.prisma.saaSRole.findMany({
                orderBy: { nome: 'asc' }
            });
            return res.json(roles);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar perfis de acesso.' });
        }
    },
    // ==================================================================
    // 7. FINANCEIRO SAAS
    // ==================================================================
    async getFinancialStats(req, res) {
        try {
            const activeSubs = await prisma_1.prisma.saaSSubscription.findMany({ where: { status: 'Ativa' } });
            const mrr = activeSubs.reduce((sum, sub) => sum + sub.valor, 0);
            // Metricas financeiras
            const ticketMedio = mrr / (activeSubs.length || 1);
            const cacSetting = await prisma_1.prisma.saaSSetting.findUnique({ where: { chave: 'cac' } });
            const cac = cacSetting ? parseFloat(cacSetting.valor) : 150.00;
            const ltv = ticketMedio * 18; // LifeTime Value (Ticket médio * tempo de retenção médio de 18 meses)
            const [faturamentos, tenants, plans] = await Promise.all([
                prisma_1.prisma.saaSFaturamento.findMany({ orderBy: { createdAt: 'desc' } }),
                prisma_1.prisma.saaSTenant.findMany(),
                prisma_1.prisma.saaSPlan.findMany()
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
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao computar financeiro SaaS.' });
        }
    },
    // ==================================================================
    // 8. AUDITORIA
    // ==================================================================
    async listAuditLogs(req, res) {
        try {
            const user = req.query.user;
            const acao = req.query.acao;
            const search = req.query.search;
            const where = {};
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
            const logs = await prisma_1.prisma.saaSAuditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 100 // Limite para desempenho
            });
            return res.json(logs);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar logs de auditoria.' });
        }
    },
    // ==================================================================
    // 9. MONITORAMENTO OPERACIONAL (CPU, Memória, Banco)
    // ==================================================================
    async getTelemetry(req, res) {
        try {
            const memoryUsage = process.memoryUsage();
            // CPU load calculation
            const cpus = os_1.default.cpus();
            const load = os_1.default.loadavg()[0];
            const cpuUsage = Math.min(100, Math.max(1, (load / (cpus.length || 1)) * 100)).toFixed(1) + '%';
            // Real database size in PostgreSQL
            let dbSize = '18.4 MB';
            try {
                const dbSizeResult = await prisma_1.prisma.$queryRawUnsafe(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
                if (dbSizeResult && dbSizeResult[0]?.size) {
                    dbSize = dbSizeResult[0].size;
                }
            }
            catch (e) {
                console.error('Failed to read db size:', e);
            }
            // Real disk usage using df -h
            let diskUsage = '14.2 GB / 100 GB (14%)';
            try {
                const stdout = (0, child_process_1.execSync)('df -h / | tail -1').toString();
                const parts = stdout.split(/\s+/);
                if (parts.length >= 5) {
                    diskUsage = `${parts[2]} / ${parts[1]} (${parts[4]})`;
                }
            }
            catch (e) {
                console.error('Failed to read disk usage:', e);
            }
            const telemetry = {
                cpuUsage,
                memoryUsage: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1) + ' MB / ' + (memoryUsage.heapTotal / 1024 / 1024).toFixed(1) + ' MB',
                postgresSize: dbSize,
                diskUsage,
                processingQueue: {
                    activeJobs: 0,
                    pendingJobs: 0,
                    failedJobs: 2
                },
                apis: [
                    { name: 'ReceitaWS', status: 'ONLINE', ping: '124ms' },
                    { name: 'NF-e Sefaz', status: 'ONLINE', ping: '240ms' },
                    { name: 'Tabela FIPE', status: 'ONLINE', ping: '89ms' },
                    { name: 'Stripe Gateway', status: 'ONLINE', ping: '110ms' },
                    { name: 'Asaas Gateway', status: 'ONLINE', ping: '135ms' },
                    { name: 'WhatsApp API', status: 'ONLINE', ping: '95ms' }
                ]
            };
            return res.json(telemetry);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao buscar telemetria operacional.' });
        }
    },
    // ==================================================================
    // 10. CONFIGURAÇÕES GLOBAIS
    // ==================================================================
    async getSettings(req, res) {
        try {
            const settings = await prisma_1.prisma.saaSSetting.findMany();
            const result = {};
            settings.forEach(s => {
                try {
                    result[s.chave] = JSON.parse(s.valor);
                }
                catch {
                    result[s.chave] = s.valor;
                }
            });
            return res.json(result);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar configurações.' });
        }
    },
    async saveSettings(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const { key, value } = req.body;
        try {
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
            const setting = await prisma_1.prisma.saaSSetting.upsert({
                where: { chave: key },
                update: { valor: stringValue },
                create: { chave: key, valor: stringValue }
            });
            await logSaaSAuditoria(adminEmail, 'Alteração Configurações', `Atualizou a chave de configuração '${key}'`);
            return res.json(setting);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao salvar configuração.' });
        }
    },
    // ==================================================================
    // 11. GESTÃO DE NOTIFICAÇÕES (ALERTAS SAAS)
    // ==================================================================
    async listNotifications(req, res) {
        try {
            const alerts = await prisma_1.prisma.saaSNotification.findMany({
                orderBy: { createdAt: 'desc' }
            });
            return res.json(alerts);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao carregar alertas.' });
        }
    },
    async createNotification(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const schema = zod_1.z.object({
            titulo: zod_1.z.string(),
            mensagem: zod_1.z.string(),
            tipo: zod_1.z.enum(['INFO', 'WARNING', 'SUCCESS', 'ERROR'])
        });
        try {
            const data = schema.parse(req.body);
            const alert = await prisma_1.prisma.saaSNotification.create({
                data
            });
            await logSaaSAuditoria(adminEmail, 'Disparo Notificação', `Enviou alerta geral: '${alert.titulo}'`);
            return res.status(201).json(alert);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            console.error(error);
            return res.status(500).json({ error: 'Erro ao disparar alerta.' });
        }
    },
    async markAsRead(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const id = req.params.id;
        try {
            const notification = await prisma_1.prisma.saaSNotification.update({
                where: { id },
                data: { lida: true }
            });
            await logSaaSAuditoria(adminEmail, 'Confirmação Leitura Alerta', `Confirmou leitura do alerta: '${notification.titulo}'`);
            return res.json(notification);
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Erro ao marcar alerta como lido.' });
        }
    },
    async acessarTenant(req, res) {
        const adminEmail = req.saasUserEmail || 'admin@suzanoit.com';
        const schema = zod_1.z.object({
            id: zod_1.z.string()
        });
        try {
            const { id } = schema.parse(req.body);
            // Encontrar o tenant
            const tenant = await prisma_1.prisma.saaSTenant.findUnique({
                where: { id }
            });
            if (!tenant) {
                return res.status(404).json({ error: 'Empresa do SaaS não encontrada.' });
            }
            if (!tenant.companyId) {
                return res.status(400).json({ error: 'Esta empresa SaaS não possui vínculo com uma oficina operacional.' });
            }
            // Encontrar o primeiro usuário da oficina operacional
            const user = await prisma_1.prisma.user.findFirst({
                where: {
                    companyId: tenant.companyId
                }
            });
            if (!user) {
                return res.status(404).json({ error: 'Nenhum usuário operacional encontrado para esta oficina.' });
            }
            // Buscar a primeira oficina (workshopId) vinculada a essa empresa
            const workshop = await prisma_1.prisma.oficina.findFirst({
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
            const token = jsonwebtoken_1.default.sign(tokenPayload, secret, { expiresIn: '2h' });
            await logSaaSAuditoria(adminEmail, 'Acesso Oficina Impersonificada', `Iniciou acesso à oficina de '${tenant.razaoSocial}'`);
            return res.json({
                token,
                userId: user.id,
                workshopId: workshop?.id || null
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError)
                return res.status(400).json({ error: error.errors });
            console.error(error);
            return res.status(500).json({ error: 'Erro ao processar acesso à oficina.' });
        }
    }
};
