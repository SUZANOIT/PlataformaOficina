"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saasAdminMiddleware = void 0;
const prisma_1 = require("../lib/prisma");
const saasAdminMiddleware = async (req, res, next) => {
    const companyId = req.companyId;
    const userId = req.userId;
    if (!userId || !companyId) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    try {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId }
        });
        // Apenas administradores da MCA Gestão de Oficina (MCA CARD) podem acessar
        if (user?.roleAdmin && companyId === 'mca-padrao-company-uuid-000000000001') {
            return next();
        }
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores da plataforma podem acessar este recurso.' });
    }
    catch (error) {
        console.error('Error in saasAdminMiddleware:', error);
        return res.status(500).json({ error: 'Erro interno ao validar privilégios de administração' });
    }
};
exports.saasAdminMiddleware = saasAdminMiddleware;
