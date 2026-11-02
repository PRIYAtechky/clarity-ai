import { Router } from 'express';
import { config } from '../config.js';
import { GeminiService } from '../services/gemini.service.js';
import { LanService } from '../services/lan.service.js';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const primaryLanIp = LanService.getPrimaryLanIp(config.lanHostIp);

  res.json({
    status: 'healthy',
    name: 'Clarity AI Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    gemini: {
      configured: GeminiService.isConfigured(),
      model: GeminiService.getModelName(),
    },
    lanMode: config.isLanMode,
    host: config.host,
    port: config.port,
    lanIp: primaryLanIp,
    lanAccessUrl: `http://${primaryLanIp}:${config.port}`,
  });
});
