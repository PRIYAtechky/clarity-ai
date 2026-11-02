
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

import { config, maskApiKey } from './config.js';
import { healthRouter } from './routes/health.router.js';
import { conversationRouter } from './routes/conversation.router.js';
import { documentRouter } from './routes/document.router.js';
import { chatRouter } from './routes/chat.router.js';
import { lanRouter } from './routes/lan.router.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { LanService } from './services/lan.service.js';

export const app = express();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Dynamic CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Check configured origins
      if (config.clientOrigin.includes(origin)) {
        return callback(null, true);
      }

      // Allow localhost and 127.0.0.1
      if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // In LAN mode, allow private network origins
      if (config.isLanMode) {
        if (
          /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin)
        ) {
          return callback(null, true);
        }
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Apply rate limiting to all API routes
app.use('/api', rateLimiter(120, 60 * 1000));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/conversations', conversationRouter);
app.use('/api/documents', documentRouter);
app.use('/api/chat', chatRouter);
app.use('/api/lan', lanRouter);

// Serve React frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientDistPath = path.resolve(process.cwd(), 'client', 'dist');

  app.use(express.static(clientDistPath));

  // React application fallback
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Central error handler
app.use(errorHandler);

// Start server if not imported as a module in tests
if (process.env.NODE_ENV !== 'test') {
  const host = config.host;
  const port = config.port;

  const server = app.listen(port, host, () => {
    const addr = server.address();
    const primaryIp = LanService.getPrimaryLanIp(config.lanHostIp);

    const boundStr =
      typeof addr === 'object' && addr
        ? `${addr.address}:${addr.port}`
        : `${host}:${port}`;

    const divider = '─'.repeat(54);

    console.log(`\n┌${divider}┐`);
    console.log(`│               CLARITY AI BACKEND SERVER              │`);
    console.log(`├${divider}┤`);
    console.log(`│ Status:        Online & Bound Successfully           │`);
    console.log(
      `│ Mode:          ${(config.isLanMode ? 'LAN Mode (Broadcasting)' : 'Localhost Mode').padEnd(38)}│`
    );
    console.log(`│ Bound Address: ${boundStr.padEnd(38)}│`);
    console.log(
      `│ Health Check:  ${(`http://127.0.0.1:${port}/api/health`).padEnd(38)}│`
    );

    if (config.isLanMode || host === '0.0.0.0') {
      console.log(
        `│ LAN Access:    ${(`http://${primaryIp}:${port}/api/health`).padEnd(38)}│`
      );
    }

    console.log(`│ Gemini Model:  ${config.geminiModel.padEnd(38)}│`);
    console.log(`│ Gemini Key:    ${maskApiKey(config.geminiApiKey).padEnd(38)}│`);
    console.log(`└${divider}┘\n`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\n[ERROR] Port ${port} is already in use by another process.`
      );
      console.error(
        `Please stop the conflicting process or set PORT=<new-port> in your .env file.\n`
      );
      process.exit(1);
    } else {
      console.error('[ERROR] Server startup error:', err);
    }
  });
}
