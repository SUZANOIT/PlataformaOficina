"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saasPermissionGuard = exports.saasAuthMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const saasAuthMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }
    const [, token] = authHeader.split(' ');
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        if (!decoded.isSaaSUser) {
            return res.status(403).json({ error: 'Acesso negado. Este token não possui privilégios de administração do SaaS.' });
        }
        const saasUser = await prisma_1.prisma.saaSUser.findUnique({
            where: { id: decoded.id }
        });
        if (!saasUser) {
            return res.status(401).json({ error: 'Usuário administrativo não cadastrado.' });
        }
        if (saasUser.status !== 'ATIVO') {
            return res.status(403).json({ error: 'Conta de administração inativa.' });
        }
        // Configurar o payload administrativo na requisição
        req.saasUserId = decoded.id;
        req.saasUserEmail = decoded.email;
        req.saasUserRole = decoded.role;
        req.saasUserPermissions = decoded.permissions || [];
        return next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ error: 'Sua sessão administrativa expirou.', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Token de autenticação inválido.' });
    }
};
exports.saasAuthMiddleware = saasAuthMiddleware;
// Guard de Permissão Granular (RBAC) no Backend
const saasPermissionGuard = (requiredPermission) => {
    return (req, res, next) => {
        const permissions = req.saasUserPermissions;
        const role = req.saasUserRole;
        if (!permissions) {
            return res.status(403).json({ error: 'Nenhuma permissão administrativa concedida.' });
        }
        // SUPER_ADMIN ou o perfil que tiver a permissão 'total' tem acesso livre
        if (role === 'SUPER_ADMIN' || permissions.includes('total')) {
            return next();
        }
        // Verificar se o usuário possui a permissão específica exigida para o recurso
        if (permissions.includes(requiredPermission)) {
            return next();
        }
        return res.status(403).json({
            error: `Acesso negado. Permissão necessária: '${requiredPermission}'`
        });
    };
};
exports.saasPermissionGuard = saasPermissionGuard;
