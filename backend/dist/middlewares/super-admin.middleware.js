"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.superAdminMiddleware = void 0;
const prisma_1 = require("../lib/prisma");
const superAdminMiddleware = async (req, res, next) => {
    const companyId = req.companyId;
    const userId = req.userId;
    if (!userId || !companyId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        if (user?.role === 'SUPER_ADMIN' ||
            (user?.roleAdmin && companyId === 'mca-padrao-company-uuid-000000000001')) {
            req.userEmail = user?.email;
            return next();
        }
        return res.status(403).json({ error: '403 - Acesso Negado' });
    }
    catch (error) {
        console.error('Error in superAdminMiddleware:', error);
        return res.status(500).json({ error: 'Erro interno ao validar privilégios de super administrador' });
    }
};
exports.superAdminMiddleware = superAdminMiddleware;
