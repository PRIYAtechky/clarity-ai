import { spawn } from 'child_process';
import os from 'os';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const modeArg = args.find(a => a.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : (process.env.LAN_MODE === 'true' ? 'lan' : 'local');
const isLan = mode === 'lan';

// Detect primary private IPv4 address
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        if (
          (name.toLowerCase().includes('wi-fi') ||
            name.toLowerCase().includes('wireless') ||
            name.toLowerCase().includes('ethernet')) &&
          (addr.address.startsWith('192.168.') || addr.address.startsWith('10.'))
        ) {
          return addr.address;
        }
      }
    }
  }

  // Fallback to any non-internal IPv4
  for (const addrs of Object.values(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        return addr.address;
      }
    }
  }

  return '127.0.0.1';
}

const lanIp = getLanIp();
const backendPort = process.env.PORT || '3000';
const frontendPort = '5173';

const divider = '═'.repeat(72);
const line = '─'.repeat(72);

console.log(`\n${divider}`);
if (isLan) {
  console.log(`  🌟 CLARITY AI — DOCUMENT RESEARCH ASSISTANT [LAN BROADCAST MODE]`);
  console.log(divider);
  console.log(`  📱 Local Network URL:    http://${lanIp}:${frontendPort}`);
  console.log(`  💻 Host Localhost URL:   http://localhost:${frontendPort}`);
  console.log(`  ⚡ Backend Health Check: http://${lanIp}:${backendPort}/api/health`);
  console.log(`  🔒 Security:             Gemini API key is isolated on host PC`);
  console.log(line);
  console.log(`  WINDOWS FIREWALL & MULTI-DEVICE INSTRUCTIONS:`);
  console.log(`  1. Ensure your phone or tablet is on the SAME Wi-Fi network.`);
  console.log(`  2. In your mobile browser, navigate to: http://${lanIp}:${frontendPort}`);
  console.log(`  3. If connection fails or times out, allow ports in Windows Firewall:`);
  console.log(`     Run PowerShell as Administrator:`);
  console.log(`     New-NetFirewallRule -DisplayName "Clarity AI Dev Ports" -Direction Inbound -LocalPort 3000,5173 -Protocol TCP -Action Allow -Profile Private`);
} else {
  console.log(`  🚀 CLARITY AI — DOCUMENT RESEARCH ASSISTANT [LOCALHOST MODE]`);
  console.log(divider);
  console.log(`  💻 Web Application:      http://localhost:${frontendPort}`);
  console.log(`  ⚡ Backend Health Check: http://localhost:${backendPort}/api/health`);
  console.log(`  🔒 Security:             Gemini API key is isolated on host PC`);
  console.log(line);
  console.log(`  💡 Tip: To access from your phone on Wi-Fi, run: npm run dev:lan`);
}
console.log(`${divider}\n`);

// Environment variables for child processes
const serverEnv = {
  ...process.env,
  PORT: backendPort,
  HOST: isLan ? '0.0.0.0' : '127.0.0.1',
  LAN_MODE: isLan ? 'true' : 'false',
  CLIENT_ORIGIN: isLan
    ? `http://localhost:${frontendPort},http://${lanIp}:${frontendPort},http://127.0.0.1:${frontendPort}`
    : `http://localhost:${frontendPort},http://127.0.0.1:${frontendPort}`,
};

const clientEnv = {
  ...process.env,
  VITE_BACKEND_URL: isLan ? `http://${lanIp}:${backendPort}` : `http://127.0.0.1:${backendPort}`,
};

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Spawn backend server
const serverProcess = spawn(npmCmd, ['run', 'dev', '--workspace=server'], {
  stdio: 'inherit',
  shell: true,
  env: serverEnv,
});

// Spawn client frontend
const clientProcess = spawn(npmCmd, ['run', 'dev', '--workspace=client'], {
  stdio: 'inherit',
  shell: true,
  env: clientEnv,
});

function cleanup() {
  console.log('\nShutting down Clarity AI services...');
  serverProcess.kill('SIGINT');
  clientProcess.kill('SIGINT');
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
