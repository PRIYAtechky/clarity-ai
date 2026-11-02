import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Try loading server/.env or root .env
const serverEnvPath = path.resolve(process.cwd(), '.env');
const rootEnvPath = path.resolve(process.cwd(), '../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

export interface AppConfig {
  port: number;
  host: string;
  isLanMode: boolean;
  lanHostIp?: string;
  clientOrigin: string[];
  geminiApiKey: string;
  geminiModel: string;
  databasePath: string;
  uploadDir: string;
  maxFileSizeMb: number;
}

const parseOrigins = (rawOrigin?: string): string[] => {
  if (!rawOrigin) return ['http://localhost:5173'];
  return rawOrigin
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);
};

// Helper to resolve safe host binding (prevents IPv6 ::1 conflicts on Windows)
const resolveHost = (rawHost?: string, isLan?: boolean): string => {
  if (isLan) return '0.0.0.0';
  if (!rawHost || rawHost === 'localhost') return '127.0.0.1';
  return rawHost;
};

export const config: AppConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: resolveHost(process.env.HOST, process.env.LAN_MODE === 'true'),
  isLanMode: process.env.LAN_MODE === 'true',
  lanHostIp: process.env.LAN_HOST_IP,
  clientOrigin: parseOrigins(process.env.CLIENT_ORIGIN),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/clarity.sqlite'),
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR || './data/uploads'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
};

export const maskApiKey = (key: string): string => {
  if (!key) return '(not configured)';
  if (key.length <= 8) return '****';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
};
