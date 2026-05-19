import express from 'express';
import cors from 'cors';
import path from 'path';
import { routes } from './routes';

const app = express();

app.use(cors());
app.use(express.json());

// Serve frontend static files from the built dist directory
const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.use(routes);

// SPA fallback: serve index.html for any unmatched route
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

export { app };
