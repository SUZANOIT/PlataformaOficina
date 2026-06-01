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
const financial_category_controller_1 = require("./controllers/financial-category.controller");
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
            select: { companyId: true }
        });
        if (!user) {
            return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }
        req.companyId = user.companyId;
        return next();
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
