import express from 'express';
import cors from 'cors';
import path from 'path';
import { routes } from './routes';

const app = express();

app.use(cors());
// PDFs/XML em base64 no upload fiscal excedem o limite padrão (~100kb) do express.json
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve frontend static files from the built dist directory
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.use(routes);

// SPA fallback: serve index.html for any unmatched route
app.use((_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

export { app };
