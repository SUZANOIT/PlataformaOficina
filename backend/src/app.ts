import express from 'express';
import cors from 'cors';
import path from 'path';
import { routes } from './routes';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use(routes);

// Serve frontend static files
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendBuildPath));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
});

export { app };
