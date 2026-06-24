"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const audit_logger_1 = require("../utils/audit.logger");
const registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
const createUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
    roleAdmin: zod_1.z.boolean().optional().default(false),
    roleOrcamentista: zod_1.z.boolean().optional().default(false),
    roleContasPagar: zod_1.z.boolean().optional().default(false),
    roleContasReceber: zod_1.z.boolean().optional().default(false),
    roleContabilidade: zod_1.z.boolean().optional().default(false),
    roleRh: zod_1.z.boolean().optional().default(false),
    roleColaborador: zod_1.z.boolean().optional().default(false),
});
const updateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(3),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6).optional().or(zod_1.z.literal('')),
    status: zod_1.z.enum(['ACTIVE', 'INACTIVE']).optional(),
    roleAdmin: zod_1.z.boolean().optional(),
    roleOrcamentista: zod_1.z.boolean().optional(),
    roleContasPagar: zod_1.z.boolean().optional(),
    roleContasReceber: zod_1.z.boolean().optional(),
    roleContabilidade: zod_1.z.boolean().optional(),
    roleRh: zod_1.z.boolean().optional(),
    roleColaborador: zod_1.z.boolean().optional(),
});
exports.AuthController = {
    async register(req, res) {
        try {
            const { name, email, password } = registerSchema.parse(req.body);
            const userExists = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (userExists) {
                audit_logger_1.AuditLogger.log(null, null, 'REGISTER_USER', `Attempted duplicate user email: ${email}`, 'DUPLICATE_ATTEMPT');
                return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
            }
            const hashedPassword = await bcrypt_1.default.hash(password, 10);
            const user = await prisma_1.prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    roleAdmin: true, // Registrations from public register are admins
                    status: 'ATIVO',
                },
            });
            audit_logger_1.AuditLogger.log(user.id, null, 'REGISTER_USER', `Registered user: ${user.email} (${user.id})`, 'SUCCESS');
            return res.status(201).json({ id: user.id, name: user.name, email: user.email });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
                console.error('Prisma error in register:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in register:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async login(req, res) {
        try {
            const { email, password } = loginSchema.parse(req.body);
            const user = await prisma_1.prisma.user.findUnique({ where: { email } });
            if (!user) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
            const validPassword = await bcrypt_1.default.compare(password, user.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Invalid credentials' });
            }
            if (user.mustChangePassword) {
                // Enviar um token temporário apenas para a rota de alteração de senha
                const tempToken = jsonwebtoken_1.default.sign({ id: user.id, requirePasswordChange: true }, process.env.JWT_SECRET || 'secret', {
                    expiresIn: '1h',
                });
                return res.status(403).json({
                    error: 'REQUIRE_PASSWORD_CHANGE',
                    message: 'Você deve redefinir sua senha no primeiro acesso.',
                    tempToken
                });
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id }, process.env.JWT_SECRET || 'secret', {
                expiresIn: '1d',
            });
            console.log(`User logged in: ${user.email} (id=${user.id})`);
            return res.json({
                user: {
                    id: user.id,
                    nome: user.name,
                    name: user.name,
                    email: user.email,
                    status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
                    roleAdmin: user.roleAdmin,
                    roleOrcamentista: user.roleOrcamentista,
                    roleContasPagar: user.roleContasPagar,
                    roleContasReceber: user.roleContasReceber,
                    roleContabilidade: user.roleContabilidade,
                    roleRh: user.roleRh,
                    roleColaborador: user.roleColaborador,
                },
                token,
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma error in login:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in login:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async listUsers(req, res) {
        try {
            const companyId = req.companyId || null;
            const whereClause = companyId ? { companyId } : {};
            const users = await prisma_1.prisma.user.findMany({
                where: whereClause,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    roleAdmin: true,
                    roleOrcamentista: true,
                    roleContasPagar: true,
                    roleContasReceber: true,
                    roleContabilidade: true,
                    roleRh: true,
                    roleColaborador: true,
                    createdAt: true
                },
                orderBy: { createdAt: 'desc' }
            });
            const mappedUsers = users.map(user => ({
                id: user.id,
                nome: user.name,
                name: user.name,
                email: user.email,
                status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
                roleAdmin: user.roleAdmin,
                roleOrcamentista: user.roleOrcamentista,
                roleContasPagar: user.roleContasPagar,
                roleContasReceber: user.roleContasReceber,
                roleContabilidade: user.roleContabilidade,
                roleRh: user.roleRh,
                roleColaborador: user.roleColaborador,
                createdAt: user.createdAt,
            }));
            return res.json(mappedUsers);
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                console.error('Prisma error in listUsers:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in listUsers:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async createUser(req, res) {
        try {
            const currentUserId = req.userId || null;
            const currentCompanyId = req.companyId || null;
            const body = { ...req.body };
            if (body.nome)
                body.name = body.nome;
            if (body.senha)
                body.password = body.senha;
            const parsedData = createUserSchema.parse(body);
            // Validar limites de usuários ativos do plano contratado da empresa
            if (currentCompanyId) {
                const company = await prisma_1.prisma.company.findUnique({
                    where: { id: currentCompanyId },
                    include: { plan: true }
                });
                if (company && company.plan) {
                    const activeUsersCount = await prisma_1.prisma.user.count({
                        where: {
                            companyId: currentCompanyId,
                            status: 'ATIVO'
                        }
                    });
                    if (parsedData.status !== 'INACTIVE' && activeUsersCount >= company.plan.limiteUsuarios) {
                        audit_logger_1.AuditLogger.log(currentUserId, currentCompanyId, 'CREATE_USER', `Blocked creating user due to plan user limit (${company.plan.limiteUsuarios})`, 'ERROR');
                        return res.status(403).json({
                            error: `Limite de usuários ativos atingido para o plano ${company.plan.nome} (${company.plan.limiteUsuarios} usuários).`,
                            code: 'PLAN_LIMIT_REACHED'
                        });
                    }
                }
            }
            const userExists = await prisma_1.prisma.user.findUnique({ where: { email: parsedData.email } });
            if (userExists) {
                audit_logger_1.AuditLogger.log(currentUserId, currentCompanyId, 'CREATE_USER', `Attempted duplicate user email: ${parsedData.email}`, 'DUPLICATE_ATTEMPT');
                return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
            }
            const hashedPassword = await bcrypt_1.default.hash(parsedData.password, 10);
            const user = await prisma_1.prisma.user.create({
                data: {
                    name: parsedData.name,
                    email: parsedData.email,
                    password: hashedPassword,
                    status: parsedData.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO',
                    roleAdmin: parsedData.roleAdmin,
                    roleOrcamentista: parsedData.roleOrcamentista,
                    roleContasPagar: parsedData.roleContasPagar,
                    roleContasReceber: parsedData.roleContasReceber,
                    roleContabilidade: parsedData.roleContabilidade,
                    roleRh: parsedData.roleRh,
                    roleColaborador: parsedData.roleColaborador,
                    companyId: currentCompanyId
                },
            });
            audit_logger_1.AuditLogger.log(currentUserId, currentCompanyId, 'CREATE_USER', `Created user: ${user.email} (${user.id})`, 'SUCCESS');
            return res.status(201).json({
                id: user.id,
                nome: user.name,
                name: user.name,
                email: user.email,
                status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
                roleAdmin: user.roleAdmin,
                roleOrcamentista: user.roleOrcamentista,
                roleContasPagar: user.roleContasPagar,
                roleContasReceber: user.roleContasReceber,
                roleContabilidade: user.roleContabilidade,
                roleRh: user.roleRh,
                roleColaborador: user.roleColaborador,
                createdAt: user.createdAt
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
                console.error('Prisma error in createUser:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in createUser:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async updateUser(req, res) {
        try {
            const id = req.params.id;
            const currentUserId = req.userId || null;
            const currentCompanyId = req.companyId || null;
            const body = { ...req.body };
            if (body.nome)
                body.name = body.nome;
            if (body.senha)
                body.password = body.senha;
            const parsedData = updateUserSchema.parse(body);
            const user = await prisma_1.prisma.user.findUnique({ where: { id } });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            // Validar limites de usuários ativos do plano contratado se estiver ativando
            if (parsedData.status && parsedData.status === 'ACTIVE' && user.status !== 'ATIVO' && currentCompanyId) {
                const company = await prisma_1.prisma.company.findUnique({
                    where: { id: currentCompanyId },
                    include: { plan: true }
                });
                if (company && company.plan) {
                    const activeUsersCount = await prisma_1.prisma.user.count({
                        where: {
                            companyId: currentCompanyId,
                            status: 'ATIVO'
                        }
                    });
                    if (activeUsersCount >= company.plan.limiteUsuarios) {
                        audit_logger_1.AuditLogger.log(currentUserId, currentCompanyId, 'UPDATE_USER', `Blocked activating user due to plan user limit (${company.plan.limiteUsuarios})`, 'ERROR');
                        return res.status(403).json({
                            error: `Limite de usuários ativos atingido para o plano ${company.plan.nome} (${company.plan.limiteUsuarios} usuários).`,
                            code: 'PLAN_LIMIT_REACHED'
                        });
                    }
                }
            }
            if (parsedData.email !== user.email) {
                const emailCollision = await prisma_1.prisma.user.findUnique({ where: { email: parsedData.email } });
                if (emailCollision) {
                    audit_logger_1.AuditLogger.log(currentUserId, currentCompanyId, 'UPDATE_USER', `Attempted duplicate user email update: ${parsedData.email}`, 'DUPLICATE_ATTEMPT');
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
            }
            const updateData = {
                name: parsedData.name,
                email: parsedData.email,
            };
            if (parsedData.status) {
                updateData.status = parsedData.status === 'ACTIVE' ? 'ATIVO' : 'INATIVO';
            }
            if (parsedData.roleAdmin !== undefined)
                updateData.roleAdmin = parsedData.roleAdmin;
            if (parsedData.roleOrcamentista !== undefined)
                updateData.roleOrcamentista = parsedData.roleOrcamentista;
            if (parsedData.roleContasPagar !== undefined)
                updateData.roleContasPagar = parsedData.roleContasPagar;
            if (parsedData.roleContasReceber !== undefined)
                updateData.roleContasReceber = parsedData.roleContasReceber;
            if (parsedData.roleContabilidade !== undefined)
                updateData.roleContabilidade = parsedData.roleContabilidade;
            if (parsedData.roleRh !== undefined)
                updateData.roleRh = parsedData.roleRh;
            if (parsedData.roleColaborador !== undefined)
                updateData.roleColaborador = parsedData.roleColaborador;
            if (parsedData.password && parsedData.password.length >= 6) {
                updateData.password = await bcrypt_1.default.hash(parsedData.password, 10);
            }
            const updatedUser = await prisma_1.prisma.user.update({
                where: { id },
                data: updateData,
            });
            audit_logger_1.AuditLogger.log(currentUserId, currentCompanyId, 'UPDATE_USER', `Updated user: ${updatedUser.email} (${updatedUser.id})`, 'SUCCESS');
            return res.json({
                id: updatedUser.id,
                nome: updatedUser.name,
                name: updatedUser.name,
                email: updatedUser.email,
                status: updatedUser.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
                roleAdmin: updatedUser.roleAdmin,
                roleOrcamentista: updatedUser.roleOrcamentista,
                roleContasPagar: updatedUser.roleContasPagar,
                roleContasReceber: updatedUser.roleContasReceber,
                roleContabilidade: updatedUser.roleContabilidade,
                roleRh: updatedUser.roleRh,
                roleColaborador: updatedUser.roleColaborador,
                createdAt: updatedUser.createdAt
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2002') {
                    return res.status(409).json({ error: 'Já existe um cadastro com os dados informados.', code: 'DUPLICATE_RECORD' });
                }
                if (error.code === 'P2025') {
                    return res.status(404).json({ error: 'User not found' });
                }
                console.error('Prisma error in updateUser:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in updateUser:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async deleteUser(req, res) {
        try {
            const id = req.params.id;
            const user = await prisma_1.prisma.user.findUnique({ where: { id } });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            await prisma_1.prisma.user.delete({ where: { id } });
            console.log(`User deleted: ${user.email} (id=${user.id})`);
            return res.status(204).send();
        }
        catch (error) {
            if (error instanceof client_1.Prisma.PrismaClientKnownRequestError) {
                if (error.code === 'P2025') {
                    return res.status(404).json({ error: 'User not found' });
                }
                console.error('Prisma error in deleteUser:', error.code, error.message);
                return res.status(500).json({ error: 'Database error', code: error.code });
            }
            console.error('Error in deleteUser:', error);
            return res.status(500).json({
                error: 'Internal server error',
                details: process.env.NODE_ENV !== 'production' && error instanceof Error ? error.message : undefined,
            });
        }
    },
    async me(req, res) {
        try {
            const id = req.userId;
            const user = await prisma_1.prisma.user.findUnique({
                where: { id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    status: true,
                    roleAdmin: true,
                    roleOrcamentista: true,
                    roleContasPagar: true,
                    roleContasReceber: true,
                    roleContabilidade: true,
                    roleRh: true,
                    roleColaborador: true,
                    createdAt: true,
                    companyId: true,
                    company: {
                        include: {
                            plan: true,
                            moduleLicenses: {
                                where: { ativa: true },
                                include: { module: true }
                            }
                        }
                    }
                }
            });
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            let plano = 'Start';
            let statusAssinatura = 'Trial';
            let activeModules = [];
            let companyName = '';
            if (user.company) {
                plano = user.company.plan?.nome || 'Start';
                statusAssinatura = user.company.statusAssinatura || 'Trial';
                companyName = user.company.nomeFantasia || user.company.razaoSocial || '';
                // Módulos padrões para cada plano
                const planModules = {
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
                        'multiempresa', 'bi', 'integracoes', 'whatsapp', 'receitaws'
                    ]
                };
                const planAllowed = planModules[plano] || [];
                const licenseAllowed = user.company.moduleLicenses.map(ml => ml.module.chave);
                activeModules = Array.from(new Set([...planAllowed, ...licenseAllowed]));
            }
            let activeUsersCount = 0;
            let osCountThisMonth = 0;
            let planDetails = null;
            if (user.company) {
                planDetails = user.company.plan ? {
                    nome: user.company.plan.nome,
                    limiteUsuarios: user.company.plan.limiteUsuarios,
                    limiteOsMes: user.company.plan.limiteOsMes,
                    preco: user.company.plan.preco
                } : null;
                const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                [activeUsersCount, osCountThisMonth] = await Promise.all([
                    prisma_1.prisma.user.count({ where: { companyId: user.company.id } }),
                    prisma_1.prisma.quote.count({
                        where: {
                            companyId: user.company.id,
                            createdAt: { gte: startOfMonth }
                        }
                    })
                ]);
            }
            return res.json({
                id: user.id,
                nome: user.name,
                name: user.name,
                email: user.email,
                status: user.status === 'ATIVO' ? 'ACTIVE' : 'INACTIVE',
                roleAdmin: user.roleAdmin,
                roleOrcamentista: user.roleOrcamentista,
                roleContasPagar: user.roleContasPagar,
                roleContasReceber: user.roleContasReceber,
                roleContabilidade: user.roleContabilidade,
                roleRh: user.roleRh,
                roleColaborador: user.roleColaborador,
                createdAt: user.createdAt,
                companyId: user.companyId,
                company: user.company ? {
                    id: user.company.id,
                    nome: companyName,
                    type: user.company.type,
                    cnpj: user.company.cnpj,
                    endereco: user.company.endereco,
                    telefone: user.company.telefone,
                    whatsapp: user.company.whatsapp,
                    email: user.company.email,
                    plano: plano,
                    statusAssinatura: statusAssinatura,
                    dataVencimento: user.company.dataVencimento,
                    activeModules: activeModules,
                    planDetails: planDetails,
                    activeUsersCount,
                    osCountThisMonth
                } : null
            });
        }
        catch (error) {
            console.error('Error in auth.me:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    },
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            const user = await prisma_1.prisma.user.findFirst({
                where: { email }
            });
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado com este e-mail' });
            }
            console.log(`Password reset requested for email: ${email}`);
            return res.json({
                success: true,
                message: 'Link de redefinição de senha enviado para o seu e-mail.',
                token: 'mock-reset-token-12345'
            });
        }
        catch (error) {
            console.error('Error in forgotPassword:', error);
            return res.status(500).json({ error: 'Erro ao processar solicitação de redefinição de senha' });
        }
    },
    async resetPassword(req, res) {
        try {
            const { token, password } = req.body;
            if (!token || !password) {
                return res.status(400).json({ error: 'Token e senha são obrigatórios' });
            }
            return res.json({
                message: 'Senha redefinida com sucesso (simulado)',
            });
        }
        catch (error) {
            console.error('Error resetting password:', error);
            return res.status(500).json({ error: 'Failed to reset password' });
        }
    },
    // Novo método para forçar alteração de senha (Onboarding SaaS)
    async forcePasswordChange(req, res) {
        try {
            const { tempToken, newPassword } = req.body;
            if (!tempToken || !newPassword) {
                return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
            }
            // Valida o token temporário
            const decoded = jsonwebtoken_1.default.verify(tempToken, process.env.JWT_SECRET || 'secret');
            if (!decoded.requirePasswordChange) {
                return res.status(400).json({ error: 'Token inválido para esta operação' });
            }
            const user = await prisma_1.prisma.user.findUnique({ where: { id: decoded.id } });
            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }
            const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
            // Atualiza o User
            await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    mustChangePassword: false
                }
            });
            // Se houver um Collaborator associado, tira a flag dele também
            const collaborator = await prisma_1.prisma.collaborator.findFirst({
                where: { email: user.email }
            });
            if (collaborator) {
                await prisma_1.prisma.collaborator.update({
                    where: { id: collaborator.id },
                    data: { mustChangePassword: false }
                });
            }
            return res.json({ message: 'Senha redefinida com sucesso. Faça o login novamente.' });
        }
        catch (error) {
            console.error('Error on force password change:', error);
            return res.status(500).json({ error: 'Token inválido ou expirado.' });
        }
    }
};
