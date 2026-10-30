import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { productsRouter } from './server/routes/productsRouter.js';
import { analyticsRouter } from './server/routes/analyticsRouter.js';
import { chatRouter } from './server/routes/chatRouter.js';
import { mcpRouter } from './server/mcp/mcpRouter.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '10mb' }));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api')) {
        console.log(`[${req.method}] ${req.path} -> ${res.statusCode} (${duration}ms)`);
      }
    });
    next();
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'NexusStock AI Inventory Agent',
      uptime: process.uptime(),
      database: 'SQLite (Relational 4-Table Schema)',
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API modules
  app.use('/api/products', productsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/mcp', mcpRouter);
  app.use('/api', analyticsRouter);

  // Vite integration
  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('⚡ Vite dev middleware attached');
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NexusStock Server listening on http://0.0.0.0:${PORT}`);
    console.log(`🤖 Gemini API Key attached: ${!!process.env.GEMINI_API_KEY}`);
    console.log(`🔌 MCP JSON-RPC Endpoint: http://0.0.0.0:${PORT}/api/mcp`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
