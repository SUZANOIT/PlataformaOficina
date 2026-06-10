"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.routes = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./controllers/auth.controller");
const company_controller_1 = require("./controllers/company.controller");
const quote_controller_1 = require("./controllers/quote.controller");
const email_controller_1 = require("./controllers/email.controller");
const financial_controller_1 = require("./controllers/financial.controller");
const registry_controller_1 = require("./controllers/registry.controller");
const platform_controller_1 = require("./controllers/platform.controller");
const fleet_controller_1 = require("./controllers/fleet.controller");
const advance_controller_1 = require("./controllers/advance.controller");
const absence_controller_1 = require("./controllers/absence.controller");
const financial_category_controller_1 = require("./controllers/financial-category.controller");
const fiscal_controller_1 = require("./controllers/fiscal.controller");
const saas_controller_1 = require("./controllers/saas.controller");
const product_controller_1 = require("./controllers/product.controller");
const tax_controller_1 = require("./controllers/tax.controller");
const nfe_controller_1 = require("./controllers/nfe.controller");
const saas_admin_middleware_1 = require("./middlewares/saas-admin.middleware");
const admin_saas_controller_1 = require("./controllers/admin-saas.controller");
const super_admin_middleware_1 = require("./middlewares/super-admin.middleware");
const saas_auth_controller_1 = require("./controllers/saas-auth.controller");
const saas_portal_controller_1 = require("./controllers/saas-portal.controller");
const saas_auth_middleware_1 = require("./middlewares/saas-auth.middleware");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const routes = (0, express_1.Router)();
exports.routes = routes;
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token not provided' });
    }
    const [, token] = authHeader.split(' ');
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        req.userId = decoded.id;
        req.role = decoded.role;
        const { prisma } = require('./lib/prisma');
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                companyId: true,
                roleAdmin: true,
                roleOrcamentista: true,
                roleContasPagar: true,
                roleContasReceber: true,
                roleContabilidade: true,
                roleRh: true,
                roleColaborador: true,
            }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
        // Usuários cujo único nível de acesso é Contabilidade só podem usar a Exportação XML Contabilidade
        const isContabilidadeOnly = user.roleContabilidade
            && !user.roleAdmin
            && !user.roleOrcamentista
            && !user.roleContasPagar
            && !user.roleContasReceber
            && !user.roleRh
            && !user.roleColaborador;
        if (isContabilidadeOnly) {
            const path = req.originalUrl.split('?')[0];
            const allowedPaths = [
                '/auth/me',
                '/fiscal/documents/accounting/summary',
                '/fiscal/documents/export/xml-pack',
            ];
            if (!allowedPaths.includes(path)) {
                return res.status(403).json({
                    error: 'Acesso restrito: seu nível de acesso permite apenas a Exportação XML Contabilidade',
                    code: 'CONTABILIDADE_ONLY',
                });
            }
        }
        // Usuários cujo único nível de acesso é Orçamentista só podem acessar Orçamentos e rotas de suporte
        const isOrcamentistaOnly = user.roleOrcamentista
            && !user.roleAdmin
            && !user.roleContabilidade
            && !user.roleContasPagar
            && !user.roleContasReceber
            && !user.roleRh
            && !user.roleColaborador;
        if (isOrcamentistaOnly) {
            const path = req.originalUrl.split('?')[0];
            const isAllowed = path === '/auth/me' ||
                path.startsWith('/quotes') ||
                path.startsWith('/registry/clients') ||
                path.startsWith('/registry/platforms') ||
                path.startsWith('/fleet/vehicles') ||
                path.startsWith('/fleet/workshops') ||
                path.startsWith('/api/fleet/vehicles') ||
                path.startsWith('/api/fleet/workshops') ||
                path.startsWith('/products') ||
                path.startsWith('/companies');
            if (!isAllowed) {
                return res.status(403).json({
                    error: 'Acesso restrito: seu nível de acesso permite apenas o uso do módulo de Orçamentos.',
                    code: 'ORCAMENTISTA_ONLY',
                });
            }
        }
        req.companyId = user.companyId;
        const { tenantContext } = require('./lib/tenant-context');
        return tenantContext.run({ companyId: user.companyId, userId: decoded.id }, () => {
            return next();
        });
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
        }
        console.error('Database error in authMiddleware:', error);
        return res.status(500).json({ error: 'Internal database error during authentication' });
    }
};
// Route to run prisma db push in production environment
routes.get('/debug/run-migrate', async (req, res) => {
    const { exec } = require('child_process');
    exec('npx prisma db push', (err, stdout, stderr) => {
        return res.json({
            error: err?.message || null,
            stdout: stdout || '',
            stderr: stderr || ''
        });
    });
});
// Auth
routes.post('/auth/register', auth_controller_1.AuthController.register);
routes.post('/auth/login', auth_controller_1.AuthController.login);
routes.get('/auth/me', authMiddleware, auth_controller_1.AuthController.me);
routes.post('/auth/forgot-password', auth_controller_1.AuthController.forgotPassword);
routes.post('/auth/reset-password', auth_controller_1.AuthController.resetPassword);
routes.post('/api/auth/login', auth_controller_1.AuthController.login);
routes.post('/api/auth/forgot-password', auth_controller_1.AuthController.forgotPassword);
routes.post('/api/auth/reset-password', auth_controller_1.AuthController.resetPassword);
// Proxy ReceitaWS (Bypass CORS)
routes.get('/api/cnpj/:cnpj', async (req, res) => {
    try {
        const { cnpj } = req.params;
        const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
        const data = await response.json();
        return res.json(data);
    }
    catch (error) {
        return res.status(500).json({ error: 'Erro ao consultar CNPJ' });
    }
});
// Usuários
routes.use('/users', authMiddleware);
routes.get('/users', auth_controller_1.AuthController.listUsers);
routes.post('/users', auth_controller_1.AuthController.createUser);
routes.put('/users/:id', auth_controller_1.AuthController.updateUser);
routes.delete('/users/:id', auth_controller_1.AuthController.deleteUser);
// Empresas
routes.use('/companies', authMiddleware);
routes.get('/companies', company_controller_1.CompanyController.list);
routes.post('/companies', company_controller_1.CompanyController.create);
// Cadastros de Clientes e Fornecedores
routes.use('/registry', authMiddleware);
routes.get('/registry/clients', registry_controller_1.RegistryController.listClients);
routes.post('/registry/clients', registry_controller_1.RegistryController.createClient);
routes.put('/registry/clients/:id', registry_controller_1.RegistryController.updateClient);
routes.delete('/registry/clients/:id', registry_controller_1.RegistryController.deleteClient);
routes.get('/registry/suppliers', registry_controller_1.RegistryController.listSuppliers);
routes.post('/registry/suppliers', registry_controller_1.RegistryController.createSupplier);
routes.put('/registry/suppliers/:id', registry_controller_1.RegistryController.updateSupplier);
routes.delete('/registry/suppliers/:id', registry_controller_1.RegistryController.deleteSupplier);
routes.get('/registry/collaborators', registry_controller_1.RegistryController.listCollaborators);
routes.post('/registry/collaborators', registry_controller_1.RegistryController.createCollaborator);
routes.put('/registry/collaborators/:id', registry_controller_1.RegistryController.updateCollaborator);
routes.delete('/registry/collaborators/:id', registry_controller_1.RegistryController.deleteCollaborator);
routes.get('/registry/collaborators/:id/advances', advance_controller_1.AdvanceController.listAdvances);
routes.post('/registry/collaborators/:id/advances', advance_controller_1.AdvanceController.createAdvance);
routes.put('/registry/collaborators/advances/:advanceId', advance_controller_1.AdvanceController.updateAdvanceStatus);
routes.delete('/registry/collaborators/advances/:advanceId', advance_controller_1.AdvanceController.deleteAdvance);
routes.post('/registry/collaborators/advances/:advanceId/pdf', advance_controller_1.AdvanceController.logPdfGeneration);
routes.get('/registry/platforms', platform_controller_1.PlatformController.list);
routes.post('/registry/platforms', platform_controller_1.PlatformController.create);
routes.put('/registry/platforms/:id', platform_controller_1.PlatformController.update);
routes.delete('/registry/platforms/:id', platform_controller_1.PlatformController.delete);
// RH - Gestão de Faltas e Fechamento
routes.use('/rh', authMiddleware);
routes.get('/rh/absences', absence_controller_1.AbsenceController.listAbsences);
routes.post('/rh/absences', absence_controller_1.AbsenceController.createAbsence);
routes.put('/rh/absences/:id', absence_controller_1.AbsenceController.updateAbsence);
routes.delete('/rh/absences/:id', absence_controller_1.AbsenceController.deleteAbsence);
routes.get('/rh/closing', absence_controller_1.AbsenceController.getMonthlyClosing);
routes.post('/rh/closing', absence_controller_1.AbsenceController.closeMonth);
routes.get('/rh/dashboard', absence_controller_1.AbsenceController.getDashboardStats);
routes.get('/rh/audit-logs', absence_controller_1.AbsenceController.listAuditLogs);
// Dashboard
routes.use('/dashboard', authMiddleware);
routes.get('/dashboard', quote_controller_1.QuoteController.getDashboardStats);
// Orçamentos
routes.use('/quotes', authMiddleware);
routes.get('/quotes', quote_controller_1.QuoteController.list);
routes.post('/quotes', quote_controller_1.QuoteController.create);
routes.get('/quotes/:id', quote_controller_1.QuoteController.show);
routes.put('/quotes/:id', quote_controller_1.QuoteController.update);
routes.delete('/quotes/:id', quote_controller_1.QuoteController.delete);
routes.post('/quotes/:id/send-email', email_controller_1.EmailController.sendQuote);
// Configurações
routes.use('/settings', authMiddleware);
routes.get('/settings/email', email_controller_1.EmailController.getConfig);
routes.post('/settings/email', email_controller_1.EmailController.saveConfig);
// Módulo de Gestão Financeira
routes.use('/financial', authMiddleware);
routes.get('/financial/dashboard', financial_controller_1.FinancialController.getDashboardStats);
routes.get('/financial/approved-quotes', financial_controller_1.FinancialController.getApprovedQuotes);
routes.get('/financial/payables', financial_controller_1.FinancialController.listPayables);
routes.post('/financial/payables', financial_controller_1.FinancialController.createPayable);
routes.put('/financial/payables/:id', financial_controller_1.FinancialController.updatePayable);
routes.delete('/financial/payables/:id', financial_controller_1.FinancialController.deletePayable);
routes.get('/financial/receivables', financial_controller_1.FinancialController.listReceivables);
routes.post('/financial/receivables', financial_controller_1.FinancialController.createReceivable);
routes.put('/financial/receivables/:id', financial_controller_1.FinancialController.updateReceivable);
routes.delete('/financial/receivables/:id', financial_controller_1.FinancialController.deleteReceivable);
routes.post('/financial/approve/:id', financial_controller_1.FinancialController.approveTransaction);
routes.get('/financial/audits', financial_controller_1.FinancialController.getAuditHistory);
routes.get('/financial/recurrences', financial_controller_1.FinancialController.getRecurrentHistory);
// Categorias Financeiras
routes.get('/financial/categories', financial_category_controller_1.FinancialCategoryController.list);
routes.post('/financial/categories', financial_category_controller_1.FinancialCategoryController.create);
routes.put('/financial/categories/:id', financial_category_controller_1.FinancialCategoryController.update);
routes.delete('/financial/categories/:id', financial_category_controller_1.FinancialCategoryController.delete);
// Gestão de Frotas (Suporta tanto /fleet quanto /api/fleet para compatibilidade com cache de navegadores)
const registerFleetRoutes = (prefix) => {
    routes.use(prefix, authMiddleware);
    routes.get(`${prefix}/dashboard/stats`, fleet_controller_1.fleetController.getDashboardStats);
    routes.get(`${prefix}/reports`, fleet_controller_1.fleetController.getReportData);
    routes.get(`${prefix}/clients`, fleet_controller_1.fleetController.listClients);
    routes.get(`${prefix}/tree/clients`, fleet_controller_1.fleetController.listClientsTree);
    routes.get(`${prefix}/tree/clients/:clientId/vehicles`, fleet_controller_1.fleetController.getClientFleet);
    routes.get(`${prefix}/tree/vehicles/:vehicleId/details`, fleet_controller_1.fleetController.getVehicleDetails);
    routes.put(`${prefix}/clients/:id/status`, fleet_controller_1.fleetController.updateClientStatus);
    routes.get(`${prefix}/vehicles`, fleet_controller_1.fleetController.listVehicles);
    routes.get(`${prefix}/vehicles/:id`, fleet_controller_1.fleetController.getVehicle);
    routes.post(`${prefix}/vehicles`, fleet_controller_1.fleetController.createVehicle);
    routes.put(`${prefix}/vehicles/:id`, fleet_controller_1.fleetController.updateVehicle);
    routes.delete(`${prefix}/vehicles/:id`, fleet_controller_1.fleetController.deleteVehicle);
    routes.get(`${prefix}/vehicles/lookup/:placa`, fleet_controller_1.fleetController.lookupPlate);
    routes.get(`${prefix}/workshops`, fleet_controller_1.fleetController.listWorkshops);
    routes.post(`${prefix}/workshops`, fleet_controller_1.fleetController.createWorkshop);
    routes.put(`${prefix}/workshops/:id`, fleet_controller_1.fleetController.updateWorkshop);
    routes.delete(`${prefix}/workshops/:id`, fleet_controller_1.fleetController.deleteWorkshop);
    routes.get(`${prefix}/preventive/motor`, fleet_controller_1.fleetController.listMotorOilChanges);
    routes.post(`${prefix}/preventive/motor`, fleet_controller_1.fleetController.createMotorOilChange);
    routes.get(`${prefix}/preventive/gear`, fleet_controller_1.fleetController.listGearOilChanges);
    routes.post(`${prefix}/preventive/gear`, fleet_controller_1.fleetController.createGearOilChange);
    routes.post(`${prefix}/events`, fleet_controller_1.fleetController.createVehicleEvent);
};
registerFleetRoutes('/fleet');
registerFleetRoutes('/api/fleet');
// Módulo Fiscal / Documentos Fiscais
routes.use('/fiscal', authMiddleware);
routes.get('/fiscal/documents', fiscal_controller_1.FiscalController.listDocuments);
routes.get('/fiscal/documents/dashboard-full', fiscal_controller_1.FiscalController.getFullDashboard);
routes.get('/fiscal/documents/month/:ano/:mes/details', fiscal_controller_1.FiscalController.getMonthlyDetails);
routes.get('/fiscal/documents/clients/search', fiscal_controller_1.FiscalController.autocompleteClients);
routes.get('/fiscal/documents/suppliers/search', fiscal_controller_1.FiscalController.autocompleteSuppliers);
routes.get('/fiscal/documents/accounting/summary', fiscal_controller_1.FiscalController.getAccountingSummary);
routes.get('/fiscal/documents/export/xml-pack', fiscal_controller_1.FiscalController.exportAccountingXmlPack);
routes.get('/fiscal/documents/export/csv', fiscal_controller_1.FiscalController.exportCsv);
routes.get('/fiscal/documents/export/excel', fiscal_controller_1.FiscalController.exportExcel);
routes.post('/fiscal/documents/upload', fiscal_controller_1.FiscalController.uploadDocuments);
routes.put('/fiscal/documents/:id', fiscal_controller_1.FiscalController.updateDocument);
routes.delete('/fiscal/documents/:id', fiscal_controller_1.FiscalController.deleteDocument);
routes.get('/fiscal/documents/:id/download', fiscal_controller_1.FiscalController.downloadIndividual);
routes.post('/fiscal/documents/download-batch', fiscal_controller_1.FiscalController.downloadBatch);
routes.get('/fiscal/audits', fiscal_controller_1.FiscalController.listAudits);
routes.get('/fiscal/dashboard', fiscal_controller_1.FiscalController.getDashboard);
// Módulo Contabilidade - Regras de Tributação
routes.get('/fiscal/tributacao', tax_controller_1.TaxController.list);
routes.post('/fiscal/tributacao', tax_controller_1.TaxController.create);
routes.put('/fiscal/tributacao/:id', tax_controller_1.TaxController.update);
routes.delete('/fiscal/tributacao/:id', tax_controller_1.TaxController.delete);
// Módulo Contabilidade - Importação de Notas Fiscais de Entrada
routes.get('/fiscal/nfe', nfe_controller_1.NfeController.list);
routes.get('/fiscal/nfe/:id/xml', nfe_controller_1.NfeController.downloadXml);
routes.get('/fiscal/nfe/:id', nfe_controller_1.NfeController.getOne);
routes.post('/fiscal/nfe/upload', nfe_controller_1.NfeController.upload);
routes.post('/fiscal/nfe/confirm', nfe_controller_1.NfeController.confirm);
routes.post('/fiscal/nfe/:id/cancel', nfe_controller_1.NfeController.cancel);
routes.delete('/fiscal/nfe/:id', nfe_controller_1.NfeController.delete);
// Módulo de Cadastro de Produtos
routes.use('/products', authMiddleware);
routes.get('/products', product_controller_1.ProductController.list);
routes.get('/products/:id', product_controller_1.ProductController.getOne);
routes.post('/products', product_controller_1.ProductController.create);
routes.put('/products/:id', product_controller_1.ProductController.update);
routes.delete('/products/:id', product_controller_1.ProductController.delete);
// Módulo SaaS Administrador
routes.use('/saas', authMiddleware, saas_admin_middleware_1.saasAdminMiddleware);
routes.get('/saas/stats', saas_controller_1.SaaSController.getAdminStats);
routes.get('/saas/companies', saas_controller_1.SaaSController.listCompanies);
routes.put('/saas/subscriptions', saas_controller_1.SaaSController.updateSubscription);
routes.post('/saas/licenses/toggle', saas_controller_1.SaaSController.toggleModuleLicense);
routes.get('/saas/plans', saas_controller_1.SaaSController.listPlans);
routes.get('/saas/modules', saas_controller_1.SaaSController.listModules);
// Rotas de Empresas SaaS (/api/empresas)
routes.use('/api/empresas', authMiddleware, saas_admin_middleware_1.saasAdminMiddleware);
routes.post('/api/empresas', saas_controller_1.SaaSController.createCompany);
routes.get('/api/empresas', saas_controller_1.SaaSController.listCompanies);
routes.get('/api/empresas/:id', saas_controller_1.SaaSController.getCompany);
routes.put('/api/empresas/:id', saas_controller_1.SaaSController.updateCompany);
routes.post('/api/empresas/buscar-cnpj', saas_controller_1.SaaSController.buscarCnpj);
routes.post('/api/empresas/alterar-plano', saas_controller_1.SaaSController.updateSubscription);
// Novo Módulo de Administração SaaS Independente (/api/admin/*)
routes.use('/api/admin', authMiddleware, super_admin_middleware_1.superAdminMiddleware);
// Dashboard
routes.get('/api/admin/dashboard', admin_saas_controller_1.AdminSaaSController.getDashboardStats);
// Empresas
routes.get('/api/admin/empresas', admin_saas_controller_1.AdminSaaSController.listEmpresas);
routes.get('/api/admin/empresas/:id', admin_saas_controller_1.AdminSaaSController.getEmpresa);
routes.post('/api/admin/empresas', admin_saas_controller_1.AdminSaaSController.createEmpresa);
routes.put('/api/admin/empresas/:id', admin_saas_controller_1.AdminSaaSController.updateEmpresa);
routes.delete('/api/admin/empresas/:id', admin_saas_controller_1.AdminSaaSController.deleteEmpresa);
routes.post('/api/admin/empresas/suspender', admin_saas_controller_1.AdminSaaSController.suspenderEmpresa);
routes.post('/api/admin/empresas/reativar', admin_saas_controller_1.AdminSaaSController.reativarEmpresa);
routes.post('/api/admin/empresas/reset-senha-admin', admin_saas_controller_1.AdminSaaSController.resetSenhaAdmin);
routes.post('/api/admin/empresas/acessar-tenant', admin_saas_controller_1.AdminSaaSController.acessarTenant);
routes.get('/api/admin/empresas/:id/historico', admin_saas_controller_1.AdminSaaSController.getHistoricoEmpresa);
// Planos
routes.get('/api/admin/planos', admin_saas_controller_1.AdminSaaSController.listPlanos);
routes.get('/api/admin/planos/:id', admin_saas_controller_1.AdminSaaSController.getPlano);
routes.post('/api/admin/planos', admin_saas_controller_1.AdminSaaSController.createPlano);
routes.put('/api/admin/planos/:id', admin_saas_controller_1.AdminSaaSController.updatePlano);
routes.post('/api/admin/planos/duplicar', admin_saas_controller_1.AdminSaaSController.duplicatePlano);
// Assinaturas
routes.get('/api/admin/assinaturas', admin_saas_controller_1.AdminSaaSController.listAssinaturas);
routes.post('/api/admin/assinaturas/renovar', admin_saas_controller_1.AdminSaaSController.renovarAssinatura);
routes.post('/api/admin/assinaturas/cancelar', admin_saas_controller_1.AdminSaaSController.cancelarAssinatura);
routes.post('/api/admin/assinaturas/suspender', admin_saas_controller_1.AdminSaaSController.suspenderAssinatura);
routes.post('/api/admin/assinaturas/reativar', admin_saas_controller_1.AdminSaaSController.reativarAssinatura);
routes.post('/api/admin/assinaturas/gerar-cobranca', admin_saas_controller_1.AdminSaaSController.gerarCobranca);
// Usuários
routes.get('/api/admin/usuarios', admin_saas_controller_1.AdminSaaSController.listUsuarios);
routes.post('/api/admin/usuarios/bloquear', admin_saas_controller_1.AdminSaaSController.bloquearUsuario);
routes.post('/api/admin/usuarios/desbloquear', admin_saas_controller_1.AdminSaaSController.desbloquearUsuario);
routes.post('/api/admin/usuarios/redefinir-senha', admin_saas_controller_1.AdminSaaSController.redefinirSenhaUsuario);
routes.post('/api/admin/usuarios/alterar-perfil', admin_saas_controller_1.AdminSaaSController.alterarPerfilUsuario);
routes.get('/api/admin/usuarios/:email/auditoria', admin_saas_controller_1.AdminSaaSController.getAuditoriaUsuario);
// Faturamento
routes.get('/api/admin/faturamento', admin_saas_controller_1.AdminSaaSController.listFaturamentos);
routes.post('/api/admin/faturamento/alterar-status', admin_saas_controller_1.AdminSaaSController.alterarStatusFaturamento);
// Configurações
routes.get('/api/admin/configuracoes', admin_saas_controller_1.AdminSaaSController.getConfiguracoes);
routes.post('/api/admin/configuracoes', admin_saas_controller_1.AdminSaaSController.salvarConfiguracoes);
// ==================================================================
// NOVAS ROTAS SAAS TOTALMENTE INDEPENDENTES
// ==================================================================
// Autenticação Pública do SaaS Admin Portal
routes.post('/api/saas/auth/login', saas_auth_controller_1.SaaSAuthController.login);
routes.get('/api/saas/auth/me', saas_auth_middleware_1.saasAuthMiddleware, saas_auth_controller_1.SaaSAuthController.me);
// Rotas Administrativas Privadas Protegidas por RBAC
routes.get('/api/saas/admin/dashboard', saas_auth_middleware_1.saasAuthMiddleware, saas_portal_controller_1.SaaSPortalController.getDashboard);
// CRUD Tenants (Empresas)
routes.get('/api/saas/admin/tenants', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.listTenants);
routes.get('/api/saas/admin/tenants/:id', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.getTenant);
routes.post('/api/saas/admin/tenants', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.createTenant);
routes.put('/api/saas/admin/tenants/:id', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.updateTenant);
routes.post('/api/saas/admin/tenants/block', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.blockTenant);
routes.post('/api/saas/admin/tenants/suspend', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.suspendTenant);
routes.post('/api/saas/admin/tenants/reactivate', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.reactivateTenant);
routes.post('/api/saas/admin/tenants/reset-password', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.resetTenantAdminPassword);
routes.get('/api/saas/admin/tenants/:id/history', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.getTenantHistory);
routes.post('/api/saas/admin/tenants/acessar', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.acessarTenant);
routes.get('/api/saas/admin/cnpj/:cnpj', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('empresas'), saas_portal_controller_1.SaaSPortalController.consultarCnpj);
// CRUD Planos
routes.get('/api/saas/admin/plans', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('planos'), saas_portal_controller_1.SaaSPortalController.listPlans);
routes.post('/api/saas/admin/plans', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('planos'), saas_portal_controller_1.SaaSPortalController.createPlan);
routes.put('/api/saas/admin/plans/:id', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('planos'), saas_portal_controller_1.SaaSPortalController.updatePlan);
routes.post('/api/saas/admin/plans/duplicate', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('planos'), saas_portal_controller_1.SaaSPortalController.duplicatePlan);
// Assinaturas & Gateway
routes.get('/api/saas/admin/subscriptions', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('assinaturas'), saas_portal_controller_1.SaaSPortalController.listSubscriptions);
routes.post('/api/saas/admin/subscriptions/renovate', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('assinaturas'), saas_portal_controller_1.SaaSPortalController.renovateSubscription);
routes.post('/api/saas/admin/subscriptions/cancel', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('assinaturas'), saas_portal_controller_1.SaaSPortalController.cancelSubscription);
routes.get('/api/saas/admin/gateway-logs', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('assinaturas'), saas_portal_controller_1.SaaSPortalController.getGatewayLogs);
// Módulos
routes.get('/api/saas/admin/modules', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('modulos'), saas_portal_controller_1.SaaSPortalController.listModules);
routes.post('/api/saas/admin/modules/toggle', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('modulos'), saas_portal_controller_1.SaaSPortalController.toggleTenantModule);
// Usuários do Portal SaaS & Perfis
routes.get('/api/saas/admin/users', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('usuarios'), saas_portal_controller_1.SaaSPortalController.listUsers);
routes.post('/api/saas/admin/users', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('usuarios'), saas_portal_controller_1.SaaSPortalController.createUser);
routes.put('/api/saas/admin/users/:id', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('usuarios'), saas_portal_controller_1.SaaSPortalController.updateUser);
routes.post('/api/saas/admin/users/reset-password', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('usuarios'), saas_portal_controller_1.SaaSPortalController.resetUserPassword);
routes.get('/api/saas/admin/roles', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('usuarios'), saas_portal_controller_1.SaaSPortalController.listRoles);
// Financeiro
routes.get('/api/saas/admin/financial-stats', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('financeiro'), saas_portal_controller_1.SaaSPortalController.getFinancialStats);
// Auditoria (paginação server-side: ?page=0&size=20&sort=dataHora,desc)
routes.get('/api/saas/admin/audit-logs', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('auditoria'), saas_portal_controller_1.SaaSPortalController.listAuditLogs);
routes.get('/api/auditoria', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('auditoria'), saas_portal_controller_1.SaaSPortalController.listAuditLogs);
// Monitoramento & Configurações
routes.get('/api/saas/admin/telemetry', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('configuracoes'), saas_portal_controller_1.SaaSPortalController.getTelemetry);
routes.get('/api/saas/admin/settings', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('configuracoes'), saas_portal_controller_1.SaaSPortalController.getSettings);
routes.post('/api/saas/admin/settings', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('configuracoes'), saas_portal_controller_1.SaaSPortalController.saveSettings);
// Notificações
routes.get('/api/saas/admin/notifications', saas_auth_middleware_1.saasAuthMiddleware, saas_portal_controller_1.SaaSPortalController.listNotifications);
routes.post('/api/saas/admin/notifications', saas_auth_middleware_1.saasAuthMiddleware, (0, saas_auth_middleware_1.saasPermissionGuard)('configuracoes'), saas_portal_controller_1.SaaSPortalController.createNotification);
routes.post('/api/saas/admin/notifications/:id/read', saas_auth_middleware_1.saasAuthMiddleware, saas_portal_controller_1.SaaSPortalController.markAsRead);
// Alertas e Comunicados exibidos no Dashboard da Oficina (por empresa logada)
routes.get('/notifications/active', authMiddleware, saas_portal_controller_1.SaaSPortalController.listActiveNotificationsForCompany);
routes.post('/notifications/:id/read', authMiddleware, saas_portal_controller_1.SaaSPortalController.markNotificationReadForCompany);
