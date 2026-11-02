import React, { useState } from 'react';
import {
  X,
  Shield,
  Wifi,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Info,
  Server,
  Smartphone,
  Cpu,
} from 'lucide-react';
import { LanInfo, HealthStatus } from '../types/index.js';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lanInfo: LanInfo | null;
  health: HealthStatus | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  lanInfo,
  health,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const copyLanUrl = () => {
    if (lanInfo?.lanClientUrl) {
      navigator.clipboard.writeText(lanInfo.lanClientUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const copyFirewallCmd = () => {
    if (lanInfo?.firewallGuidance?.powershellCommand) {
      navigator.clipboard.writeText(lanInfo.firewallGuidance.powershellCommand);
      setCopiedCmd(true);
      setTimeout(() => setCopiedCmd(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl border border-[#E9E8E2] shadow-panel w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#E9E8E2] flex items-center justify-between bg-[#FAF9F6]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0F3ED] border border-[#E9E8E2] flex items-center justify-center text-[#879783]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#292B29]">System & Network Settings</h3>
              <p className="text-[11px] text-[#777973]">Localhost & Local Area Network (LAN) Access</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-5 text-xs">
          {/* Gemini AI Status */}
          <div className="p-3.5 rounded-xl border border-[#E9E8E2] bg-[#FAF9F6] space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-medium text-[#292B29]">
                <Cpu className="w-4 h-4 text-[#879783]" />
                <span>Google Gemini Engine</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                ACTIVE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-[#777973]">Configured Model:</span>
                <p className="font-mono font-medium text-[#292B29] mt-0.5">
                  {health?.gemini?.model || 'gemini-3-flash-preview'}
                </p>
              </div>
              <div>
                <span className="text-[#777973]">API Key Security:</span>
                <p className="text-[#292B29] font-medium mt-0.5 flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-green-600 inline" />
                  <span>Backend Secured</span>
                </p>
              </div>
            </div>
          </div>

          {/* Local Area Network (LAN) Configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 font-semibold text-[#292B29]">
                <Smartphone className="w-4 h-4 text-[#879783]" />
                <span>Mobile & Multi-Device Access (LAN)</span>
              </div>
              {lanInfo?.isLanMode ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                  LAN MODE ACTIVE
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  LOCALHOST
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#777973] leading-relaxed">
              Open Clarity AI from your smartphone, tablet, or another computer on the same Wi-Fi network without transmitting your Gemini API key to other devices.
            </p>

            {/* URL Cards */}
            <div className="space-y-2">
              <div className="p-3 rounded-xl border border-[#E9E8E2] bg-white flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#777973] uppercase font-semibold">Local Access (This PC)</span>
                  <p className="font-mono text-xs font-medium text-[#292B29] mt-0.5">
                    {lanInfo?.localhostUrl || 'http://localhost:5173'}
                  </p>
                </div>
                <a
                  href={lanInfo?.localhostUrl || 'http://localhost:5173'}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-[#777973] hover:text-[#292B29] rounded"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-3 rounded-xl border border-[#879783]/60 bg-[#F0F3ED] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#879783] uppercase font-semibold flex items-center space-x-1">
                    <Wifi className="w-3 h-3" />
                    <span>LAN Access (Mobile / Secondary Laptop)</span>
                  </span>
                  <p className="font-mono text-xs font-semibold text-[#292B29] mt-0.5">
                    {lanInfo?.lanClientUrl || `http://${lanInfo?.primaryIp}:5173`}
                  </p>
                </div>

                <button
                  onClick={copyLanUrl}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-[#E9E8E2] text-[11px] font-medium text-[#292B29] hover:bg-[#FAF9F6] transition-colors"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-green-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Windows Firewall Guide */}
          <div className="space-y-2 pt-2 border-t border-[#E9E8E2]">
            <div className="flex items-center space-x-2 font-semibold text-[#292B29]">
              <Terminal className="w-4 h-4 text-[#879783]" />
              <span>Windows Firewall Guidance</span>
            </div>

            <p className="text-[11px] text-[#777973] leading-relaxed">
              If other devices on your Wi-Fi cannot open the page, Windows Defender Firewall may be blocking inbound traffic on dev ports 3000 and 5173.
            </p>

            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E9E8E2] space-y-1.5 font-mono text-[10px]">
              <div className="flex items-center justify-between text-[#777973]">
                <span>PowerShell (Run as Administrator):</span>
                <button
                  onClick={copyFirewallCmd}
                  className="flex items-center space-x-1 hover:text-[#292B29]"
                >
                  {copiedCmd ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
              <div className="p-2 bg-white rounded border border-[#E9E8E2] text-[#292B29] break-all select-all">
                {lanInfo?.firewallGuidance?.powershellCommand ||
                  'New-NetFirewallRule -DisplayName "Clarity AI Dev Ports" -Direction Inbound -LocalPort 3000,5173 -Protocol TCP -Action Allow -Profile Private'}
              </div>
            </div>

            <ul className="list-disc list-inside text-[11px] text-[#777973] space-y-1 pt-1">
              <li>Both devices must be on the <strong>same Wi-Fi network</strong>.</li>
              <li>Network profile in Windows should be set to <strong>Private</strong>.</li>
              <li>Check your private IPv4 anytime by running <code className="bg-[#F0F3ED] px-1 py-0.5 rounded text-[#292B29]">ipconfig</code> in Command Prompt.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#E9E8E2] bg-[#FAF9F6] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#879783] text-white text-xs font-medium hover:bg-[#748570] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
