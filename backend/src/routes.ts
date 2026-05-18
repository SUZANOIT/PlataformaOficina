import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from './controllers/auth.controller';
import { CompanyController } from './controllers/company.controller';
import { QuoteController } from './controllers/quote.controller';
import { EmailController } from './controllers/email.controller';
import jwt from 'jsonwebtoken';

const routes = Router();

// Middleware de autenticação
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const [, token] = authHeader.split(' ');

  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Auth
routes.post('/auth/register', AuthController.register);
routes.post('/auth/login', AuthController.login);

// Rotas protegidas
routes.use(authMiddleware);

// Usuários
routes.get('/users', AuthController.listUsers);
routes.put('/users/:id', AuthController.updateUser);
routes.delete('/users/:id', AuthController.deleteUser);

// Empresas
routes.get('/companies', CompanyController.list);
routes.post('/companies', CompanyController.create);

// Dashboard
routes.get('/dashboard', QuoteController.getDashboardStats);

// Orçamentos
routes.get('/quotes', QuoteController.list);
routes.post('/quotes', QuoteController.create);
routes.get('/quotes/:id', QuoteController.show);
routes.put('/quotes/:id', QuoteController.update);
routes.delete('/quotes/:id', QuoteController.delete);
routes.post('/quotes/:id/send-email', EmailController.sendQuote);

// Configurações
routes.get('/settings/email', EmailController.getConfig);
routes.post('/settings/email', EmailController.saveConfig);

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

export { routes };
