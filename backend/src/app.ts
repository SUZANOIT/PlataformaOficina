import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { installLogRedaction } from './lib/security/logRedaction';
import path from 'path';
import { routes } from './routes';
import { spaNavigationMiddleware } from './middlewares/spa-navigation.middleware';

installLogRedaction();

const app = express();

// Railway: 1 proxy na frente; req.ip passa a ser o IP real do cliente (limite de tentativas)
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Cabeçalhos de segurança (HSTS, nosniff, frameguard, referrer-policy).
// CSP desativada por enquanto: o frontend usa scripts/estilos de terceiros (mapas, PDF).
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'same-site' } }));

// CORS restrito: o frontend é servido pelo mesmo domínio. Outras origens só via CORS_ORIGINS (separadas por vírgula).
const allowedOrigins = new Set(
  [
    'https://suzanoit-orcamentos.up.railway.app',
    'http://localhost:5173',
    'http://localhost:3000',
    ...(process.env.CORS_ORIGINS || '').split(','),
  ].map(o => o.trim()).filter(Boolean),
);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.has(origin)),
}));

// Rotas de autenticação não precisam de corpo grande
app.use(['/auth', '/api/auth', '/api/saas/auth'], express.json({ limit: '20kb' }));
// XML em base64 no upload fiscal excedem o limite padrão (~100kb) do express.json
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve frontend static files from the built dist directory
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

// Navegação direta / F5 em rotas do frontend que compartilham prefixo com a API
app.use(spaNavigationMiddleware(path.join(frontendDist, 'index.html')));

app.use(routes);

// SPA fallback: serve index.html for any unmatched route
app.use((_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

export { app };
