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
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const routes = (0, express_1.Router)();
exports.routes = routes;
// Middleware de autenticação
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Token not provided' });
    }
    const [, token] = authHeader.split(' ');
    try {
        jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
        return next();
    }
    catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};
// Auth
routes.post('/auth/register', auth_controller_1.AuthController.register);
routes.post('/auth/login', auth_controller_1.AuthController.login);
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
