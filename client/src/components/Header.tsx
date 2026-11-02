import React from 'react';
import { Menu, BookOpen, Wifi, Settings } from 'lucide-react';
import { Conversation, DocumentItem, LanInfo } from '../types/index.js';

interface HeaderProps {
  conversation: Conversation | null;
  documents: DocumentItem[];
  lanInfo: LanInfo | null;
  onToggleSidebar: () => void;
  onToggleInsights: () => void;
  isInsightsOpen: boolean;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  conversation,
  documents,
  lanInfo,
  onToggleSidebar,
  onToggleInsights,
  isInsightsOpen,
  onOpenSettings,
}) => {
  return (
    <header className="h-14 border-b border-[#E9E8E2] bg-[#FAF9F6] px-4 flex items-center justify-between z-10 select-none">
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] transition-colors md:hidden"
          title="Toggle Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold text-[#292B29] truncate max-w-[200px] sm:max-w-xs md:max-w-md">
            {conversation ? conversation.title : 'New Research'}
          </h2>
          {documents.length > 0 && (
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F0F3ED] text-[#879783] border border-[#E9E8E2]">
              {documents.length} doc{documents.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {lanInfo && (
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded-full bg-white border border-[#E9E8E2] text-[#777973] hover:border-[#879783] transition-colors"
            title="Click to view LAN configuration & Wi-Fi IP"
          >
            <Wifi className={`w-3.5 h-3.5 ${lanInfo.isLanMode ? 'text-green-600' : 'text-[#879783]'}`} />
            <span className="text-[11px] font-medium">
              {lanInfo.isLanMode ? `LAN: ${lanInfo.primaryIp}` : 'Localhost'}
            </span>
          </button>
        )}

        <button
          onClick={onToggleInsights}
          className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
            isInsightsOpen
              ? 'bg-[#F0F3ED] border-[#879783] text-[#292B29]'
              : 'bg-white border-[#E9E8E2] text-[#777973] hover:text-[#292B29] hover:bg-[#FAF9F6]'
          }`}
          title="Toggle Document Insights Panel"
        >
          <BookOpen className="w-3.5 h-3.5 text-[#879783]" />
          <span className="hidden sm:inline">Insights</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] transition-colors"
          title="Settings & Network"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
