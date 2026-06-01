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
import { FinancialCategoryController } from './controllers/financial-category.controller';
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
      select: { companyId: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    (req as any).companyId = user.companyId;
    return next();
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


// Dashboard
routes.use('/dashboard', authMiddleware);
routes.get('/dashboard', QuoteController.getDashboardStats);

// Orçamentos
routes.use('/quotes', authMiddleware);
routes.get('/quotes', QuoteController.list);
routes.post('/quotes', QuoteController.create);
routes.get('/quotes/:id', QuoteController.show);
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

export { routes };
