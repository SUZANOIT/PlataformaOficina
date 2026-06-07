"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaaSAuthController = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string(),
});
exports.SaaSAuthController = {
    async login(req, res) {
        try {
            const { email, password } = loginSchema.parse(req.body);
            // Encontrar o usuário administrativo no SaaS
            const saasUser = await prisma_1.prisma.saaSUser.findUnique({
                where: { email },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            });
            if (!saasUser) {
                return res.status(400).json({ error: 'Credenciais inválidas' });
            }
            if (saasUser.status !== 'ATIVO') {
                return res.status(403).json({ error: 'Sua conta administrativa está inativa.' });
            }
            const validPassword = await bcrypt_1.default.compare(password, saasUser.password);
            if (!validPassword) {
                return res.status(400).json({ error: 'Credenciais inválidas' });
            }
            // Atualizar data de último login
            await prisma_1.prisma.saaSUser.update({
                where: { id: saasUser.id },
                data: { ultimoLogin: new Date() }
            });
            const permissions = saasUser.role?.permissions.map(rp => rp.permission.nome) || [];
            const roleName = saasUser.role?.nome || 'NENHUM';
            // Gerar token assinado contendo as informações administrativas e RBAC
            const token = jsonwebtoken_1.default.sign({
                id: saasUser.id,
                email: saasUser.email,
                isSaaSUser: true,
                role: roleName,
                permissions
            }, process.env.JWT_SECRET || 'secret', { expiresIn: '1d' });
            console.log(`Global SaaS Admin logged in: ${saasUser.email} (role=${roleName})`);
            return res.json({
                user: {
                    id: saasUser.id,
                    nome: saasUser.nome,
                    email: saasUser.email,
                    status: saasUser.status,
                    role: roleName,
                    permissions
                },
                token
            });
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error('Error in SaaS login:', error);
            return res.status(500).json({ error: 'Erro interno no servidor administrativo.' });
        }
    },
    async me(req, res) {
        try {
            const saasUserId = req.saasUserId;
            if (!saasUserId) {
                return res.status(401).json({ error: 'Não autenticado' });
            }
            const saasUser = await prisma_1.prisma.saaSUser.findUnique({
                where: { id: saasUserId },
                include: {
                    role: {
                        include: {
                            permissions: {
                                include: {
                                    permission: true
                                }
                            }
                        }
                    }
                }
            });
            if (!saasUser) {
                return res.status(404).json({ error: 'Administrador não encontrado.' });
            }
            const permissions = saasUser.role?.permissions.map(rp => rp.permission.nome) || [];
            const roleName = saasUser.role?.nome || 'NENHUM';
            return res.json({
                id: saasUser.id,
                nome: saasUser.nome,
                email: saasUser.email,
                status: saasUser.status,
                role: roleName,
                permissions
            });
        }
        catch (error) {
            console.error('Error in SaaS me:', error);
            return res.status(500).json({ error: 'Erro ao verificar sessão administrativa.' });
        }
    }
};
