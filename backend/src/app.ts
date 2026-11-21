import express from 'express';
import cors from 'cors';
import path from 'path';
import { routes } from './routes';
import { spaNavigationMiddleware } from './middlewares/spa-navigation.middleware';

const app = express();

app.use(cors());
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
