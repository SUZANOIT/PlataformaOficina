"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaaSController = void 0;
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const createSaaSCompanySchema = zod_1.z.object({
    razaoSocial: zod_1.z.string(),
    nomeFantasia: zod_1.z.string().nullable().optional(),
    cnpj: zod_1.z.string(),
    cnpjSemMascara: zod_1.z.string(),
    inscricaoEstadual: zod_1.z.string().nullable().optional(),
    inscricaoMunicipal: zod_1.z.string().nullable().optional(),
    nomeResponsavel: zod_1.z.string(),
    cargo: zod_1.z.string().nullable().optional(),
    emailPrincipal: zod_1.z.string(),
    telefone: zod_1.z.string().nullable().optional(),
    whatsapp: zod_1.z.string().nullable().optional(),
    cep: zod_1.z.string().nullable().optional(),
    logradouro: zod_1.z.string().nullable().optional(),
    numero: zod_1.z.string().nullable().optional(),
    complemento: zod_1.z.string().nullable().optional(),
    bairro: zod_1.z.string().nullable().optional(),
    cidade: zod_1.z.string().nullable().optional(),
    estado: zod_1.z.string().nullable().optional(),
    planId: zod_1.z.string(),
    adminNome: zod_1.z.string(),
    adminEmail: zod_1.z.string(),
    adminSenha: zod_1.z.string(),
});
const updateSaaSCompanySchema = zod_1.z.object({
    razaoSocial: zod_1.z.string(),
    nomeFantasia: zod_1.z.string().nullable().optional(),
    cnpj: zod_1.z.string(),
    cnpjSemMascara: zod_1.z.string(),
    inscricaoEstadual: zod_1.z.string().nullable().optional(),
    inscricaoMunicipal: zod_1.z.string().nullable().optional(),
    email: zod_1.z.string().nullable().optional(),
    telefone: zod_1.z.string().nullable().optional(),
    whatsapp: zod_1.z.string().nullable().optional(),
    endereco: zod_1.z.string().nullable().optional(),
});
const updateSubscriptionSchema = zod_1.z.object({
    companyId: zod_1.z.string(),
    planId: zod_1.z.string(),
    statusAssinatura: zod_1.z.string(),
    dataVencimento: zod_1.z.string(),
});
const toggleLicenseSchema = zod_1.z.object({
    companyId: zod_1.z.string(),
    moduleId: zod_1.z.string(),
});
exports.SaaSController = {
    async getAdminStats(req, res) {
        try {
            // 1. Total Companies
            const totalCompanies = await prisma_1.prisma.company.count();
            const activeCompanies = await prisma_1.prisma.company.count({
                where: { statusAssinatura: 'Ativa' }
            });
            // 2. Total active users in the platform
            const totalActiveUsers = await prisma_1.prisma.user.count({
                where: { status: 'ATIVO' }
            });
            // 3. MRR & ARR Calculations
            const companiesWithPlans = await prisma_1.prisma.company.findMany({
                where: { statusAssinatura: 'Ativa' },
                include: { plan: true }
            });
            const mrr = companiesWithPlans.reduce((sum, c) => sum + (c.plan?.preco || 0), 0);
            const arr = mrr * 12;
            // 4. Churn rate (companies deactivated/canceled in last 30 days)
            const canceledLast30Days = await prisma_1.prisma.company.count({
                where: {
                    statusAssinatura: 'Cancelada',
                    updatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
                }
            });
            const churnRate = totalCompanies > 0 ? (canceledLast30Days / totalCompanies) * 100 : 0;
            // 5. Plan distribution
            const plans = await prisma_1.prisma.plan.findMany({
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
            const activeLicenses = await prisma_1.prisma.moduleLicense.count({
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
        }
        catch (error) {
            console.error('Error fetching SaaS admin stats:', error);
            return res.status(500).json({ error: 'Erro ao carregar estatísticas do SaaS' });
        }
    },
    async listCompanies(req, res) {
        try {
            const companies = await prisma_1.prisma.company.findMany({
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
                    prisma_1.prisma.user.count({ where: { companyId: c.id } }),
                    prisma_1.prisma.user.count({ where: { companyId: c.id, status: 'ATIVO' } }),
                    prisma_1.prisma.quote.count({
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
        }
        catch (error) {
            console.error('Error listing companies for admin:', error);
            return res.status(500).json({ error: 'Erro ao listar empresas' });
        }
    },
    async updateSubscription(req, res) {
        try {
            const { companyId, planId, statusAssinatura, dataVencimento } = updateSubscriptionSchema.parse(req.body);
            // Verify company and plan exist
            const company = await prisma_1.prisma.company.findUnique({
                where: { id: companyId },
                include: { plan: true }
            });
            if (!company) {
                return res.status(404).json({ error: 'Empresa não encontrada' });
            }
            const plan = await prisma_1.prisma.plan.findUnique({
                where: { id: planId }
            });
            if (!plan) {
                return res.status(404).json({ error: 'Plano não encontrado' });
            }
            const parsedVencimento = new Date(dataVencimento);
            // Create or update Subscription model for subscription record keeping
            let subscription = await prisma_1.prisma.subscription.findUnique({
                where: { companyId }
            });
            const previousPlanName = company.plan?.nome || 'Nenhum';
            const previousStatus = company.statusAssinatura || 'Nenhum';
            if (subscription) {
                subscription = await prisma_1.prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        planId,
                        status: statusAssinatura,
                        dataVencimento: parsedVencimento
                    }
                });
            }
            else {
                subscription = await prisma_1.prisma.subscription.create({
                    data: {
                        companyId,
                        planId,
                        status: statusAssinatura,
                        dataVencimento: parsedVencimento
                    }
                });
            }
            // Update Company core plan details
            await prisma_1.prisma.company.update({
                where: { id: companyId },
                data: {
                    planoId: planId,
                    statusAssinatura,
                    dataVencimento: parsedVencimento
                }
            });
            // Write to Subscription History
            await prisma_1.prisma.subscriptionHistory.create({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error updating subscription:', error);
            return res.status(500).json({ error: 'Erro ao atualizar assinatura' });
        }
    },
    async toggleModuleLicense(req, res) {
        try {
            const { companyId, moduleId } = toggleLicenseSchema.parse(req.body);
            const existing = await prisma_1.prisma.moduleLicense.findFirst({
                where: { companyId, moduleId }
            });
            if (existing) {
                const updated = await prisma_1.prisma.moduleLicense.update({
                    where: { id: existing.id },
                    data: { ativa: !existing.ativa }
                });
                return res.json({
                    success: true,
                    ativa: updated.ativa,
                    message: `Licença do módulo ${updated.ativa ? 'ativada' : 'desativada'} com sucesso.`
                });
            }
            else {
                const created = await prisma_1.prisma.moduleLicense.create({
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
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error toggling module license:', error);
            return res.status(500).json({ error: 'Erro ao alterar licença do módulo' });
        }
    },
    async listPlans(req, res) {
        try {
            const plans = await prisma_1.prisma.plan.findMany({
                orderBy: { preco: 'asc' }
            });
            return res.json(plans);
        }
        catch (error) {
            console.error('Error listing plans:', error);
            return res.status(500).json({ error: 'Erro ao listar planos' });
        }
    },
    async listModules(req, res) {
        try {
            const modules = await prisma_1.prisma.module.findMany({
                orderBy: { nome: 'asc' }
            });
            return res.json(modules);
        }
        catch (error) {
            console.error('Error listing modules:', error);
            return res.status(500).json({ error: 'Erro ao listar módulos' });
        }
    },
    async createCompany(req, res) {
        try {
            const data = createSaaSCompanySchema.parse(req.body);
            // Check if CNPJ already exists
            const existing = await prisma_1.prisma.company.findFirst({
                where: { cnpj: data.cnpj }
            });
            if (existing) {
                return res.status(400).json({ error: 'Uma empresa com este CNPJ já está cadastrada' });
            }
            // Check if Admin email already exists
            const existingUser = await prisma_1.prisma.user.findFirst({
                where: { email: data.adminEmail }
            });
            if (existingUser) {
                return res.status(400).json({ error: 'Este e-mail de administrador já está em uso' });
            }
            const result = await prisma_1.prisma.$transaction(async (tx) => {
                // 1. Create company
                const company = await tx.company.create({
                    data: {
                        razaoSocial: data.razaoSocial,
                        nomeFantasia: data.nomeFantasia || '',
                        cnpj: data.cnpj,
                        cnpjSemMascara: data.cnpjSemMascara,
                        inscricaoEstadual: data.inscricaoEstadual || '',
                        email: data.emailPrincipal,
                        telefone: data.telefone || '',
                        whatsapp: data.whatsapp || '',
                        endereco: `${data.logradouro || ''}, ${data.numero || ''} ${data.complemento || ''} - ${data.bairro || ''}, ${data.cidade || ''}/${data.estado || ''}`,
                        planoId: data.planId,
                        statusAssinatura: 'Trial',
                        dataContratacao: new Date(),
                        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
                    }
                });
                // 2. Create subscription
                const subscription = await tx.subscription.create({
                    data: {
                        companyId: company.id,
                        planId: data.planId,
                        status: 'Trial',
                        dataContratacao: new Date(),
                        dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    }
                });
                // Hash password
                const hashedPassword = await bcrypt_1.default.hash(data.adminSenha, 10);
                // 3. Create admin user
                const adminUser = await tx.user.create({
                    data: {
                        name: data.adminNome,
                        email: data.adminEmail,
                        password: hashedPassword,
                        role: 'ADMIN',
                        roleAdmin: true,
                        roleOrcamentista: true,
                        roleContasPagar: true,
                        roleContasReceber: true,
                        roleContabilidade: true,
                        companyId: company.id,
                        status: 'ATIVO',
                    }
                });
                // 4. Get plan details to license modules
                const plan = await tx.plan.findUnique({
                    where: { id: data.planId }
                });
                if (!plan) {
                    throw new Error('Plano selecionado não existe');
                }
                // Module keys map
                const planModulesKeys = {
                    Start: ['clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico'],
                    Professional: [
                        'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
                        'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos'
                    ],
                    Business: [
                        'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
                        'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos',
                        'emissao_fiscal', 'rede_credenciada', 'rh', 'adiantamentos', 'aprovacao_niveis', 'auditoria'
                    ],
                    Enterprise: [
                        'clientes', 'veiculos', 'plataformas', 'ordens_servico', 'orcamentos', 'dashboard_basico',
                        'contas_receber', 'contas_pagar', 'fluxo_caixa', 'estoque', 'fornecedores', 'xml', 'documentos',
                        'emissao_fiscal', 'rede_credenciada', 'rh', 'adiantamentos', 'aprovacao_niveis', 'auditoria',
                        'multiempresa', 'api', 'bi', 'integracoes', 'whatsapp', 'receitaws', 'fipe'
                    ]
                };
                const allowedKeys = planModulesKeys[plan.nome] || [];
                const dbModules = await tx.module.findMany();
                for (const m of dbModules) {
                    await tx.moduleLicense.create({
                        data: {
                            companyId: company.id,
                            moduleId: m.id,
                            ativa: allowedKeys.includes(m.chave)
                        }
                    });
                }
                // 5. Default financial categories
                const defaultCategories = [
                    { name: 'Serviços de Manutenção', type: 'RECEIVABLE' },
                    { name: 'Venda de Peças', type: 'RECEIVABLE' },
                    { name: 'Aluguel', type: 'PAYABLE' },
                    { name: 'Energia Elétrica', type: 'PAYABLE' },
                    { name: 'Água', type: 'PAYABLE' },
                    { name: 'Telefone/Internet', type: 'PAYABLE' },
                    { name: 'Salários', type: 'PAYABLE' },
                    { name: 'Fornecedores de Peças', type: 'PAYABLE' },
                ];
                for (const cat of defaultCategories) {
                    await tx.financialCategory.create({
                        data: {
                            name: cat.name,
                            type: cat.type,
                            companyId: company.id
                        }
                    });
                }
                // 6. Write history log
                await tx.subscriptionHistory.create({
                    data: {
                        subscriptionId: subscription.id,
                        planoNovo: plan.nome,
                        statusNovo: 'Trial',
                        motivo: 'Criação da conta do cliente no SaaS'
                    }
                });
                return { company, adminUser };
            });
            return res.status(201).json(result);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error creating company in SaaS:', error);
            return res.status(500).json({ error: 'Erro ao cadastrar novo cliente SaaS' });
        }
    },
    async getCompany(req, res) {
        try {
            const id = req.params.id;
            const company = await prisma_1.prisma.company.findUnique({
                where: { id },
                include: {
                    plan: true,
                    subscription: true,
                    moduleLicenses: {
                        include: { module: true }
                    }
                }
            });
            if (!company) {
                return res.status(404).json({ error: 'Empresa não encontrada' });
            }
            return res.json(company);
        }
        catch (error) {
            console.error('Error getting company:', error);
            return res.status(500).json({ error: 'Erro ao carregar detalhes da empresa' });
        }
    },
    async updateCompany(req, res) {
        try {
            const id = req.params.id;
            const data = updateSaaSCompanySchema.parse(req.body);
            const company = await prisma_1.prisma.company.update({
                where: { id },
                data: {
                    razaoSocial: data.razaoSocial,
                    nomeFantasia: data.nomeFantasia || '',
                    cnpj: data.cnpj,
                    cnpjSemMascara: data.cnpjSemMascara,
                    inscricaoEstadual: data.inscricaoEstadual || '',
                    email: data.email || '',
                    telefone: data.telefone || '',
                    whatsapp: data.whatsapp || '',
                    endereco: data.endereco || '',
                }
            });
            return res.json(company);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.issues });
            }
            console.error('Error updating company:', error);
            return res.status(500).json({ error: 'Erro ao atualizar dados da empresa' });
        }
    },
    async buscarCnpj(req, res) {
        try {
            const { cnpj } = req.body;
            if (!cnpj) {
                return res.status(400).json({ error: 'CNPJ é obrigatório' });
            }
            const cleanCnpj = cnpj.replace(/\D/g, '');
            if (cleanCnpj.length !== 14) {
                return res.status(400).json({ error: 'CNPJ inválido. Deve conter 14 dígitos.' });
            }
            // Try ReceitaWS first
            try {
                const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cleanCnpj}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.status !== 'ERROR') {
                        return res.json({
                            razaoSocial: data.nome || '',
                            nomeFantasia: data.fantasia || data.nome || '',
                            cep: data.cep ? data.cep.replace(/\D/g, '') : '',
                            logradouro: data.logradouro || '',
                            numero: data.numero || '',
                            complemento: data.complemento || '',
                            bairro: data.bairro || '',
                            cidade: data.municipio || '',
                            estado: data.uf || '',
                            cnaePrincipal: data.atividade_principal?.[0]?.code || '',
                            situacaoCadastral: data.situacao || ''
                        });
                    }
                }
            }
            catch (err) {
                console.error('ReceitaWS API failed, trying BrasilAPI...', err);
            }
            // Try BrasilAPI fallback
            try {
                const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
                if (response.ok) {
                    const data = await response.json();
                    return res.json({
                        razaoSocial: data.razao_social || '',
                        nomeFantasia: data.nome_fantasia || data.razao_social || '',
                        cep: data.cep || '',
                        logradouro: data.logradouro || '',
                        numero: data.numero || '',
                        complemento: data.complemento || '',
                        bairro: data.bairro || '',
                        cidade: data.municipio || '',
                        estado: data.uf || '',
                        cnaePrincipal: data.cnae_fiscal_principal?.toString() || '',
                        situacaoCadastral: data.descricao_situacao_cadastral || ''
                    });
                }
            }
            catch (err) {
                console.error('BrasilAPI failed too', err);
            }
            return res.status(404).json({ error: 'CNPJ não encontrado nas bases públicas' });
        }
        catch (error) {
            console.error('Error searching CNPJ:', error);
            return res.status(500).json({ error: 'Erro ao consultar CNPJ' });
        }
    },
    async acessarCliente(req, res) {
        try {
            const { companyId } = req.body;
            const targetCompany = await prisma_1.prisma.company.findUnique({
                where: { id: companyId }
            });
            if (!targetCompany) {
                return res.status(404).json({ error: 'Empresa não encontrada' });
            }
            // Generate a new token for the user, but override companyId
            const userId = req.userId;
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: userId }
            });
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            const token = jsonwebtoken_1.default.sign({
                id: user.id,
                role: user.role,
                companyId: targetCompany.id
            }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
            return res.json({ token });
        }
        catch (error) {
            console.error('Error in acessarCliente:', error);
            return res.status(500).json({ error: 'Erro ao acessar empresa do cliente' });
        }
    }
};
