import os from 'os';

export interface NetworkInterfaceInfo {
  name: string;
  ip: string;
  family: string;
  isInternal: boolean;
}

export class LanService {
  /**
   * Get all non-internal IPv4 network interfaces
   */
  public static getLanInterfaces(): NetworkInterfaceInfo[] {
    const interfaces = os.networkInterfaces();
    const results: NetworkInterfaceInfo[] = [];

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (!addrs) continue;
      for (const addr of addrs) {
        if (addr.family === 'IPv4' && !addr.internal) {
          results.push({
            name,
            ip: addr.address,
            family: addr.family,
            isInternal: addr.internal,
          });
        }
      }
    }

    return results;
  }

  /**
   * Detect the most likely primary private IPv4 address
   */
  public static getPrimaryLanIp(overrideIp?: string): string {
    if (overrideIp && overrideIp.trim()) {
      return overrideIp.trim();
    }

    const interfaces = this.getLanInterfaces();
    if (interfaces.length === 0) {
      return '127.0.0.1';
    }

    // Prefer Wi-Fi or Ethernet on 192.168.* or 10.*
    const preferred = interfaces.find(
      i =>
        (i.name.toLowerCase().includes('wi-fi') ||
          i.name.toLowerCase().includes('wireless') ||
          i.name.toLowerCase().includes('ethernet')) &&
        (i.ip.startsWith('192.168.') || i.ip.startsWith('10.'))
    );

    if (preferred) return preferred.ip;

    const privateRange = interfaces.find(
      i =>
        i.ip.startsWith('192.168.') ||
        i.ip.startsWith('10.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(i.ip)
    );

    if (privateRange) return privateRange.ip;

    return interfaces[0].ip;
  }

  /**
   * Generates step-by-step Windows Firewall and LAN connectivity guide
   */
  public static getFirewallGuidance(port: number, frontendPort: number = 5173): {
    powershellCommand: string;
    troubleshootingSteps: string[];
  } {
    return {
      powershellCommand: `New-NetFirewallRule -DisplayName "Clarity AI Dev Ports" -Direction Inbound -LocalPort ${port},${frontendPort} -Protocol TCP -Action Allow -Profile Private`,
      troubleshootingSteps: [
        'Ensure both your Windows host and your mobile phone / secondary laptop are on the EXACT SAME Wi-Fi network.',
        'Windows Network Profile: Set your Wi-Fi network profile to "Private Network" in Windows Settings -> Network & internet -> Wi-Fi -> Properties.',
        `Windows Firewall: If the connection is blocked, allow TCP ports ${port} and ${frontendPort} or run the PowerShell command with Administrator privileges.`,
        'Verify host IP address: Run `ipconfig` in Command Prompt / PowerShell on the host PC and look for "IPv4 Address" under your active Wi-Fi adapter.',
        'AP Isolation: Some guest Wi-Fi networks (e.g. coffee shops or hotels) enable Client Isolation preventing LAN communication.',
      ],
    };
  }
}
