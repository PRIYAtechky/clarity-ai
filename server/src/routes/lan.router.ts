import { Router } from 'express';
import { config } from '../config.js';
import { LanService } from '../services/lan.service.js';

export const lanRouter = Router();

lanRouter.get('/info', (req, res) => {
  const interfaces = LanService.getLanInterfaces();
  const primaryIp = LanService.getPrimaryLanIp(config.lanHostIp);
  const frontendPort = 5173;
  const firewallGuidance = LanService.getFirewallGuidance(config.port, frontendPort);

  res.json({
    isLanMode: config.isLanMode,
    host: config.host,
    backendPort: config.port,
    frontendPort,
    primaryIp,
    localhostUrl: `http://localhost:${frontendPort}`,
    lanClientUrl: `http://${primaryIp}:${frontendPort}`,
    backendHealthUrl: `http://${primaryIp}:${config.port}/api/health`,
    interfaces,
    firewallGuidance,
  });
});
