import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from './controllers/auth.controller';
import { CompanyController } from './controllers/company.controller';
import { QuoteController } from './controllers/quote.controller';
import { EmailController } from './controllers/email.controller';
import { FinancialController } from './controllers/financial.controller';
import { RegistryController } from './controllers/registry.controller';
import { PlatformController } from './controllers/platform.controller';
import { fleetController } from './controllers/fleet.controller';
import { AdvanceController } from './controllers/advance.controller';
import { AbsenceController } from './controllers/absence.controller';
import { FinancialCategoryController } from './controllers/financial-category.controller';
import { FiscalController } from './controllers/fiscal.controller';
import { SaaSController } from './controllers/saas.controller';
import { ProductController } from './controllers/product.controller';
import { TaxController } from './controllers/tax.controller';
import { NfeController } from './controllers/nfe.controller';
import { TowingQuoteController } from './controllers/towing-quote.controller';
import { TowingFleetController } from './controllers/towing-fleet.controller';
import { TowingRateController } from './controllers/towing-rate.controller';

import { saasAdminMiddleware } from './middlewares/saas-admin.middleware';
import { AdminSaaSController } from './controllers/admin-saas.controller';
import { superAdminMiddleware } from './middlewares/super-admin.middleware';
import { SaaSAuthController } from './controllers/saas-auth.controller';
import { SaaSPortalController } from './controllers/saas-portal.controller';
import { saasAuthMiddleware, saasPermissionGuard } from './middlewares/saas-auth.middleware';
import jwt from 'jsonwebtoken';

const routes = Router();

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    (req as any).userId = decoded.id;
    (req as any).role = decoded.role;

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

    let effectiveCompanyId = user.companyId;
    if (user.roleAdmin && req.query.tenantId) {
      effectiveCompanyId = req.query.tenantId as string;
    }
    
    (req as any).companyId = effectiveCompanyId;
    const { tenantContext } = require('./lib/tenant-context');
    return tenantContext.run({ companyId: effectiveCompanyId, userId: decoded.id }, () => {
      return next();
    });
  } catch (error: any) {
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
routes.get('/debug/run-migrate', async (req: Request, res: Response) => {
  const { exec } = require('child_process');
  exec('npx prisma db push', (err: any, stdout: any, stderr: any) => {
    return res.json({
      error: err?.message || null,
      stdout: stdout || '',
      stderr: stderr || ''
    });
  });
});

// Auth
routes.post('/auth/register', AuthController.register);
routes.post('/auth/login', AuthController.login);
routes.get('/auth/me', authMiddleware, AuthController.me);

// --- SaaS Client App Routes ---

// TOWING MODULE
routes.get('/towing/quotes', authMiddleware, TowingQuoteController.list);
routes.get('/towing/quotes/:id', authMiddleware, TowingQuoteController.show);
routes.post('/towing/quotes', authMiddleware, TowingQuoteController.create);
routes.put('/towing/quotes/:id', authMiddleware, TowingQuoteController.update);
routes.delete('/towing/quotes/:id', authMiddleware, TowingQuoteController.delete);
routes.get('/towing/dashboard', authMiddleware, TowingQuoteController.getDashboardStats);

routes.get('/towing/drivers', authMiddleware, TowingFleetController.listDrivers);
routes.post('/towing/drivers', authMiddleware, TowingFleetController.createDriver);

routes.get('/towing/vehicles', authMiddleware, TowingFleetController.listVehicles);
routes.post('/towing/vehicles', authMiddleware, TowingFleetController.createVehicle);
routes.put('/towing/vehicles/:id', authMiddleware, TowingFleetController.updateVehicle);
routes.delete('/towing/vehicles/:id', authMiddleware, TowingFleetController.deleteVehicle);

routes.get('/towing/types', authMiddleware, TowingFleetController.listTypes);

routes.get('/towing/rates', authMiddleware, TowingRateController.list);
routes.post('/towing/rates', authMiddleware, TowingRateController.save);
routes.get('/towing/rates/:id/history', authMiddleware, TowingRateController.getHistory);

routes.get('/nfe/imports', authMiddleware, NfeController.list);
routes.post('/auth/forgot-password', AuthController.forgotPassword);
routes.post('/auth/reset-password', AuthController.resetPassword);
routes.post('/api/auth/login', AuthController.login);
routes.post('/api/auth/forgot-password', AuthController.forgotPassword);
routes.post('/api/auth/reset-password', AuthController.resetPassword);

// Proxy ReceitaWS (Bypass CORS)
routes.get('/api/cnpj/:cnpj', async (req: Request, res: Response) => {
  try {
    const { cnpj } = req.params;
    const response = await fetch(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`);
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao consultar CNPJ' });
  }
});

// Usuários
routes.use('/users', authMiddleware);
routes.get('/users', AuthController.listUsers);
routes.post('/users', AuthController.createUser);
routes.put('/users/:id', AuthController.updateUser);
routes.delete('/users/:id', AuthController.deleteUser);

// Empresas
routes.use('/companies', authMiddleware);
routes.get('/companies', CompanyController.list);
routes.post('/companies', CompanyController.create);

// Cadastros de Clientes e Fornecedores
routes.use('/registry', authMiddleware);
routes.get('/registry/clients', RegistryController.listClients);
routes.post('/registry/clients', RegistryController.createClient);
routes.put('/registry/clients/:id', RegistryController.updateClient);
routes.delete('/registry/clients/:id', RegistryController.deleteClient);

routes.get('/registry/suppliers', RegistryController.listSuppliers);
routes.post('/registry/suppliers', RegistryController.createSupplier);
routes.put('/registry/suppliers/:id', RegistryController.updateSupplier);
routes.delete('/registry/suppliers/:id', RegistryController.deleteSupplier);

routes.get('/registry/collaborators', RegistryController.listCollaborators);
routes.post('/registry/collaborators', RegistryController.createCollaborator);
routes.put('/registry/collaborators/:id', RegistryController.updateCollaborator);
routes.delete('/registry/collaborators/:id', RegistryController.deleteCollaborator);

routes.get('/registry/collaborators/:id/advances', AdvanceController.listAdvances);
routes.post('/registry/collaborators/:id/advances', AdvanceController.createAdvance);
routes.put('/registry/collaborators/advances/:advanceId', AdvanceController.updateAdvanceStatus);
routes.delete('/registry/collaborators/advances/:advanceId', AdvanceController.deleteAdvance);
routes.post('/registry/collaborators/advances/:advanceId/pdf', AdvanceController.logPdfGeneration);

routes.get('/registry/platforms', PlatformController.list);
routes.post('/registry/platforms', PlatformController.create);
routes.put('/registry/platforms/:id', PlatformController.update);
routes.delete('/registry/platforms/:id', PlatformController.delete);

// RH - Gestão de Faltas e Fechamento
routes.use('/rh', authMiddleware);
routes.get('/rh/absences', AbsenceController.listAbsences);
routes.post('/rh/absences', AbsenceController.createAbsence);
routes.put('/rh/absences/:id', AbsenceController.updateAbsence);
routes.delete('/rh/absences/:id', AbsenceController.deleteAbsence);
routes.get('/rh/closing', AbsenceController.getMonthlyClosing);
routes.post('/rh/closing', AbsenceController.closeMonth);
routes.get('/rh/dashboard', AbsenceController.getDashboardStats);
routes.get('/rh/audit-logs', AbsenceController.listAuditLogs);


// Dashboard
routes.use('/dashboard', authMiddleware);
routes.get('/dashboard', QuoteController.getDashboardStats);

// Orçamentos
routes.use('/quotes', authMiddleware);
routes.get('/quotes', QuoteController.list);
routes.post('/quotes', QuoteController.create);
routes.get('/quotes/:id', QuoteController.show);
routes.get('/quotes/:id/history', QuoteController.getHistory);
routes.put('/quotes/:id', QuoteController.update);
routes.delete('/quotes/:id', QuoteController.delete);
routes.post('/quotes/:id/send-email', EmailController.sendQuote);

// Configurações
routes.use('/settings', authMiddleware);
routes.get('/settings/email', EmailController.getConfig);
routes.post('/settings/email', EmailController.saveConfig);

// Módulo de Gestão Financeira
routes.use('/financial', authMiddleware);
routes.get('/financial/dashboard', FinancialController.getDashboardStats);
routes.get('/financial/approved-quotes', FinancialController.getApprovedQuotes);

routes.get('/financial/payables', FinancialController.listPayables);
routes.post('/financial/payables', FinancialController.createPayable);
routes.put('/financial/payables/:id', FinancialController.updatePayable);
routes.delete('/financial/payables/:id', FinancialController.deletePayable);

routes.get('/financial/receivables', FinancialController.listReceivables);
routes.post('/financial/receivables', FinancialController.createReceivable);
routes.put('/financial/receivables/:id', FinancialController.updateReceivable);
routes.delete('/financial/receivables/:id', FinancialController.deleteReceivable);

routes.post('/financial/approve/:id', FinancialController.approveTransaction);
routes.get('/financial/audits', FinancialController.getAuditHistory);
routes.get('/financial/recurrences', FinancialController.getRecurrentHistory);

// Categorias Financeiras
routes.get('/financial/categories', FinancialCategoryController.list);
routes.post('/financial/categories', FinancialCategoryController.create);
routes.put('/financial/categories/:id', FinancialCategoryController.update);
routes.delete('/financial/categories/:id', FinancialCategoryController.delete);

// Gestão de Frotas (Suporta tanto /fleet quanto /api/fleet para compatibilidade com cache de navegadores)
const registerFleetRoutes = (prefix: string) => {
  routes.use(prefix, authMiddleware);
  routes.get(`${prefix}/dashboard/stats`, fleetController.getDashboardStats);
  routes.get(`${prefix}/reports`, fleetController.getReportData);
  routes.get(`${prefix}/clients`, fleetController.listClients);
  routes.get(`${prefix}/tree/clients`, fleetController.listClientsTree);
  routes.get(`${prefix}/tree/clients/:clientId/vehicles`, fleetController.getClientFleet);
  routes.get(`${prefix}/tree/vehicles/:vehicleId/details`, fleetController.getVehicleDetails);
  routes.put(`${prefix}/clients/:id/status`, fleetController.updateClientStatus);
  routes.get(`${prefix}/vehicles`, fleetController.listVehicles);
  routes.get(`${prefix}/vehicles/:id`, fleetController.getVehicle);
  routes.post(`${prefix}/vehicles`, fleetController.createVehicle);
  routes.put(`${prefix}/vehicles/:id`, fleetController.updateVehicle);
  routes.delete(`${prefix}/vehicles/:id`, fleetController.deleteVehicle);
  routes.get(`${prefix}/vehicles/lookup/:placa`, fleetController.lookupPlate);
  routes.get(`${prefix}/workshops`, fleetController.listWorkshops);
  routes.post(`${prefix}/workshops`, fleetController.createWorkshop);
  routes.put(`${prefix}/workshops/:id`, fleetController.updateWorkshop);
  routes.delete(`${prefix}/workshops/:id`, fleetController.deleteWorkshop);
  routes.get(`${prefix}/preventive/motor`, fleetController.listMotorOilChanges);
  routes.post(`${prefix}/preventive/motor`, fleetController.createMotorOilChange);
  routes.get(`${prefix}/preventive/gear`, fleetController.listGearOilChanges);
  routes.post(`${prefix}/preventive/gear`, fleetController.createGearOilChange);
  routes.post(`${prefix}/events`, fleetController.createVehicleEvent);
};

registerFleetRoutes('/fleet');
registerFleetRoutes('/api/fleet');

// Módulo Fiscal / Documentos Fiscais
routes.use('/fiscal', authMiddleware);
routes.get('/fiscal/documents', FiscalController.listDocuments);
routes.get('/fiscal/documents/dashboard-full', FiscalController.getFullDashboard);
routes.get('/fiscal/documents/month/:ano/:mes/details', FiscalController.getMonthlyDetails);
routes.get('/fiscal/documents/clients/search', FiscalController.autocompleteClients);
routes.get('/fiscal/documents/suppliers/search', FiscalController.autocompleteSuppliers);
routes.get('/fiscal/documents/accounting/summary', FiscalController.getAccountingSummary);
routes.get('/fiscal/documents/export/xml-pack', FiscalController.exportAccountingXmlPack);
routes.get('/fiscal/documents/export/csv', FiscalController.exportCsv);
routes.get('/fiscal/documents/export/excel', FiscalController.exportExcel);
routes.post('/fiscal/documents/upload', FiscalController.uploadDocuments);
routes.put('/fiscal/documents/:id', FiscalController.updateDocument);
routes.delete('/fiscal/documents/:id', FiscalController.deleteDocument);
routes.get('/fiscal/documents/:id/download', FiscalController.downloadIndividual);
routes.post('/fiscal/documents/download-batch', FiscalController.downloadBatch);
routes.get('/fiscal/audits', FiscalController.listAudits);
routes.get('/fiscal/dashboard', FiscalController.getDashboard);

// Módulo Contabilidade - Regras de Tributação
routes.get('/fiscal/tributacao', TaxController.list);
routes.post('/fiscal/tributacao', TaxController.create);
routes.put('/fiscal/tributacao/:id', TaxController.update);
routes.delete('/fiscal/tributacao/:id', TaxController.delete);

// Módulo Contabilidade - Importação de Notas Fiscais de Entrada
routes.get('/fiscal/nfe', NfeController.list);
routes.get('/fiscal/nfe/:id/xml', NfeController.downloadXml);
routes.get('/fiscal/nfe/:id', NfeController.getOne);
routes.post('/fiscal/nfe/upload', NfeController.upload);
routes.post('/fiscal/nfe/confirm', NfeController.confirm);
routes.post('/fiscal/nfe/:id/cancel', NfeController.cancel);
routes.delete('/fiscal/nfe/:id', NfeController.delete);

// Módulo de Cadastro de Produtos
routes.use('/products', authMiddleware);
routes.get('/products', ProductController.list);
routes.get('/products/:id', ProductController.getOne);
routes.post('/products', ProductController.create);
routes.put('/products/:id', ProductController.update);
routes.delete('/products/:id', ProductController.delete);


// Módulo SaaS Administrador
routes.use('/saas', authMiddleware, saasAdminMiddleware);
routes.get('/saas/stats', SaaSController.getAdminStats);
routes.get('/saas/companies', SaaSController.listCompanies);
routes.put('/saas/subscriptions', SaaSController.updateSubscription);
routes.post('/saas/licenses/toggle', SaaSController.toggleModuleLicense);
routes.get('/saas/plans', SaaSController.listPlans);
routes.get('/saas/modules', SaaSController.listModules);

// Rotas de Empresas SaaS (/api/empresas)
routes.use('/api/empresas', authMiddleware, saasAdminMiddleware);
routes.post('/api/empresas', SaaSController.createCompany);
routes.get('/api/empresas', SaaSController.listCompanies);
routes.get('/api/empresas/:id', SaaSController.getCompany);
routes.put('/api/empresas/:id', SaaSController.updateCompany);
routes.post('/api/empresas/buscar-cnpj', SaaSController.buscarCnpj);
routes.post('/api/empresas/alterar-plano', SaaSController.updateSubscription);
// Novo Módulo de Administração SaaS Independente (/api/admin/*)
routes.use('/api/admin', authMiddleware, superAdminMiddleware);

// Dashboard
routes.get('/api/admin/dashboard', AdminSaaSController.getDashboardStats);

// Empresas
routes.get('/api/admin/empresas', AdminSaaSController.listEmpresas);
routes.get('/api/admin/empresas/:id', AdminSaaSController.getEmpresa);
routes.post('/api/admin/empresas', AdminSaaSController.createEmpresa);
routes.put('/api/admin/empresas/:id', AdminSaaSController.updateEmpresa);
routes.delete('/api/admin/empresas/:id', AdminSaaSController.deleteEmpresa);
routes.post('/api/admin/empresas/suspender', AdminSaaSController.suspenderEmpresa);
routes.post('/api/admin/empresas/reativar', AdminSaaSController.reativarEmpresa);
routes.post('/api/admin/empresas/reset-senha-admin', AdminSaaSController.resetSenhaAdmin);
routes.post('/api/admin/empresas/acessar-tenant', AdminSaaSController.acessarTenant);
routes.get('/api/admin/empresas/:id/historico', AdminSaaSController.getHistoricoEmpresa);

// Planos
routes.get('/api/admin/planos', AdminSaaSController.listPlanos);
routes.get('/api/admin/planos/:id', AdminSaaSController.getPlano);
routes.post('/api/admin/planos', AdminSaaSController.createPlano);
routes.put('/api/admin/planos/:id', AdminSaaSController.updatePlano);
routes.post('/api/admin/planos/duplicar', AdminSaaSController.duplicatePlano);

// Assinaturas
routes.get('/api/admin/assinaturas', AdminSaaSController.listAssinaturas);
routes.post('/api/admin/assinaturas/renovar', AdminSaaSController.renovarAssinatura);
routes.post('/api/admin/assinaturas/cancelar', AdminSaaSController.cancelarAssinatura);
routes.post('/api/admin/assinaturas/suspender', AdminSaaSController.suspenderAssinatura);
routes.post('/api/admin/assinaturas/reativar', AdminSaaSController.reativarAssinatura);
routes.post('/api/admin/assinaturas/gerar-cobranca', AdminSaaSController.gerarCobranca);

// Usuários
routes.get('/api/admin/usuarios', AdminSaaSController.listUsuarios);
routes.post('/api/admin/usuarios/bloquear', AdminSaaSController.bloquearUsuario);
routes.post('/api/admin/usuarios/desbloquear', AdminSaaSController.desbloquearUsuario);
routes.post('/api/admin/usuarios/redefinir-senha', AdminSaaSController.redefinirSenhaUsuario);
routes.post('/api/admin/usuarios/alterar-perfil', AdminSaaSController.alterarPerfilUsuario);
routes.get('/api/admin/usuarios/:email/auditoria', AdminSaaSController.getAuditoriaUsuario);

// Faturamento
routes.get('/api/admin/faturamento', AdminSaaSController.listFaturamentos);
routes.post('/api/admin/faturamento/alterar-status', AdminSaaSController.alterarStatusFaturamento);

// Configurações
routes.get('/api/admin/configuracoes', AdminSaaSController.getConfiguracoes);
routes.post('/api/admin/configuracoes', AdminSaaSController.salvarConfiguracoes);

// ==================================================================
// NOVAS ROTAS SAAS TOTALMENTE INDEPENDENTES
// ==================================================================

// Autenticação Pública do SaaS Admin Portal
routes.post('/api/saas/auth/login', SaaSAuthController.login);
routes.get('/api/saas/auth/me', saasAuthMiddleware, SaaSAuthController.me);

// Rotas Administrativas Privadas Protegidas por RBAC
routes.get('/api/saas/admin/dashboard', saasAuthMiddleware, SaaSPortalController.getDashboard);

// CRUD Tenants (Empresas)
routes.get('/api/saas/admin/tenants', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.listTenants);
routes.get('/api/saas/admin/tenants/:id', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.getTenant);
routes.post('/api/saas/admin/tenants', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.createTenant);
routes.put('/api/saas/admin/tenants/:id', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.updateTenant);
routes.post('/api/saas/admin/tenants/block', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.blockTenant);
routes.post('/api/saas/admin/tenants/suspend', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.suspendTenant);
routes.post('/api/saas/admin/tenants/reactivate', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.reactivateTenant);
routes.post('/api/saas/admin/tenants/reset-password', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.resetTenantAdminPassword);
routes.get('/api/saas/admin/tenants/:id/history', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.getTenantHistory);
routes.post('/api/saas/admin/tenants/acessar', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.acessarTenant);
routes.get('/api/saas/admin/cnpj/:cnpj', saasAuthMiddleware, saasPermissionGuard('empresas'), SaaSPortalController.consultarCnpj);


// CRUD Planos
routes.get('/api/saas/admin/plans', saasAuthMiddleware, saasPermissionGuard('planos'), SaaSPortalController.listPlans);
routes.post('/api/saas/admin/plans', saasAuthMiddleware, saasPermissionGuard('planos'), SaaSPortalController.createPlan);
routes.put('/api/saas/admin/plans/:id', saasAuthMiddleware, saasPermissionGuard('planos'), SaaSPortalController.updatePlan);
routes.post('/api/saas/admin/plans/duplicate', saasAuthMiddleware, saasPermissionGuard('planos'), SaaSPortalController.duplicatePlan);

// Assinaturas & Gateway
routes.get('/api/saas/admin/subscriptions', saasAuthMiddleware, saasPermissionGuard('assinaturas'), SaaSPortalController.listSubscriptions);
routes.post('/api/saas/admin/subscriptions/renovate', saasAuthMiddleware, saasPermissionGuard('assinaturas'), SaaSPortalController.renovateSubscription);
routes.post('/api/saas/admin/subscriptions/cancel', saasAuthMiddleware, saasPermissionGuard('assinaturas'), SaaSPortalController.cancelSubscription);
routes.get('/api/saas/admin/gateway-logs', saasAuthMiddleware, saasPermissionGuard('assinaturas'), SaaSPortalController.getGatewayLogs);

// Módulos
routes.get('/api/saas/admin/modules', saasAuthMiddleware, saasPermissionGuard('modulos'), SaaSPortalController.listModules);
routes.post('/api/saas/admin/modules/toggle', saasAuthMiddleware, saasPermissionGuard('modulos'), SaaSPortalController.toggleTenantModule);

// Usuários do Portal SaaS & Perfis
routes.get('/api/saas/admin/users', saasAuthMiddleware, saasPermissionGuard('usuarios'), SaaSPortalController.listUsers);
routes.post('/api/saas/admin/users', saasAuthMiddleware, saasPermissionGuard('usuarios'), SaaSPortalController.createUser);
routes.put('/api/saas/admin/users/:id', saasAuthMiddleware, saasPermissionGuard('usuarios'), SaaSPortalController.updateUser);
routes.post('/api/saas/admin/users/reset-password', saasAuthMiddleware, saasPermissionGuard('usuarios'), SaaSPortalController.resetUserPassword);
routes.get('/api/saas/admin/roles', saasAuthMiddleware, saasPermissionGuard('usuarios'), SaaSPortalController.listRoles);

// Financeiro
routes.get('/api/saas/admin/financial-stats', saasAuthMiddleware, saasPermissionGuard('financeiro'), SaaSPortalController.getFinancialStats);

// Auditoria (paginação server-side: ?page=0&size=20&sort=dataHora,desc)
routes.get('/api/saas/admin/audit-logs', saasAuthMiddleware, saasPermissionGuard('auditoria'), SaaSPortalController.listAuditLogs);
routes.get('/api/auditoria', saasAuthMiddleware, saasPermissionGuard('auditoria'), SaaSPortalController.listAuditLogs);

// Monitoramento & Configurações
routes.get('/api/saas/admin/telemetry', saasAuthMiddleware, saasPermissionGuard('configuracoes'), SaaSPortalController.getTelemetry);
routes.get('/api/saas/admin/settings', saasAuthMiddleware, saasPermissionGuard('configuracoes'), SaaSPortalController.getSettings);
routes.post('/api/saas/admin/settings', saasAuthMiddleware, saasPermissionGuard('configuracoes'), SaaSPortalController.saveSettings);

// Notificações
routes.get('/api/saas/admin/notifications', saasAuthMiddleware, SaaSPortalController.listNotifications);
routes.post('/api/saas/admin/notifications', saasAuthMiddleware, saasPermissionGuard('configuracoes'), SaaSPortalController.createNotification);
routes.post('/api/saas/admin/notifications/:id/read', saasAuthMiddleware, SaaSPortalController.markAsRead);

// Alertas e Comunicados exibidos no Dashboard da Oficina (por empresa logada)
routes.get('/notifications/active', authMiddleware, SaaSPortalController.listActiveNotificationsForCompany);
routes.post('/notifications/:id/read', authMiddleware, SaaSPortalController.markNotificationReadForCompany);

export { routes };
