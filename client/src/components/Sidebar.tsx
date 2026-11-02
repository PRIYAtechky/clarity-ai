import React, { useState } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Settings,
  Wifi,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Conversation, LanInfo } from '../types/index.js';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  lanInfo: LanInfo | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onOpenSettings,
  lanInfo,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  // Group conversations by date
  const groupConversations = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filtered.forEach(c => {
      const d = new Date(c.updated_at || c.created_at);
      if (d >= today) {
        groups.Today.push(c);
      } else if (d >= yesterday) {
        groups.Yesterday.push(c);
      } else if (d >= lastWeek) {
        groups['Previous 7 Days'].push(c);
      } else {
        groups.Older.push(c);
      }
    });

    return groups;
  };

  const grouped = groupConversations();

  if (isCollapsed) {
    return (
      <aside className="w-16 h-screen border-r border-[#E9E8E2] bg-[#FFFFFF] flex flex-col items-center py-4 justify-between transition-all duration-200 z-20">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] transition-colors"
            title="Expand sidebar"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={onNew}
            className="p-2.5 rounded-xl bg-[#879783] text-white hover:bg-[#748570] transition-colors shadow-subtle"
            title="New Research"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-3">
          <button
            onClick={onOpenSettings}
            className="p-2 text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 h-screen border-r border-[#E9E8E2] bg-[#FFFFFF] flex flex-col justify-between transition-all duration-200 z-20 select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-[#E9E8E2] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F0F3ED] border border-[#E9E8E2] flex items-center justify-center text-[#879783]">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#292B29] tracking-tight">Clarity AI</h1>
            <p className="text-[11px] text-[#777973] font-medium">Research Assistant</p>
          </div>
        </div>

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons & Search */}
      <div className="p-3 space-y-2.5">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[#879783] text-white text-xs font-medium hover:bg-[#748570] transition-all shadow-subtle active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" />
          <span>New Research</span>
        </button>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#777973]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF9F6] border border-[#E9E8E2] rounded-lg text-[#292B29] placeholder-[#777973] focus:outline-none focus:border-[#879783] transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        {conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <MessageSquare className="w-6 h-6 mx-auto text-[#777973] opacity-40 mb-2" />
            <p className="text-xs text-[#777973]">No research history yet.</p>
            <p className="text-[11px] text-[#777973] mt-1">Start a conversation or upload a document.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([groupTitle, list]) => {
            if (list.length === 0) return null;
            return (
              <div key={groupTitle} className="space-y-1">
                <div className="px-2.5 text-[10px] font-semibold tracking-wider uppercase text-[#777973]">
                  {groupTitle}
                </div>
                {list.map(conv => {
                  const isActive = conv.id === activeId;
                  const isEditing = editingId === conv.id;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => !isEditing && onSelect(conv.id)}
                      className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                        isActive
                          ? 'bg-[#F0F3ED] text-[#292B29] font-medium border border-[#E9E8E2]'
                          : 'text-[#292B29] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate flex-1 pr-2">
                        <MessageSquare
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isActive ? 'text-[#879783]' : 'text-[#777973]'
                          }`}
                        />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTitle}
                            autoFocus
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveRename(conv.id, e);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="w-full text-xs bg-white border border-[#879783] rounded px-1.5 py-0.5 focus:outline-none"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <span className="truncate">{conv.title}</span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <button
                              onClick={e => saveRename(conv.id, e)}
                              className="p-1 hover:text-[#879783] rounded"
                              title="Save"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={cancelRename}
                              className="p-1 hover:text-red-500 rounded"
                              title="Cancel"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={e => startRename(conv, e)}
                              className="p-1 text-[#777973] hover:text-[#292B29] rounded"
                              title="Rename"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                if (confirm(`Delete "${conv.title}" and its messages?`)) {
                                  onDelete(conv.id);
                                }
                              }}
                              className="p-1 text-[#777973] hover:text-red-500 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Footer: LAN Status & Settings */}
      <div className="p-3 border-t border-[#E9E8E2] space-y-2 bg-[#FAF9F6]">
        {lanInfo && (
          <div className="flex items-center justify-between text-[11px] px-2 py-1.5 rounded-lg bg-white border border-[#E9E8E2]">
            <div className="flex items-center space-x-1.5 text-[#777973]">
              <Wifi className={`w-3.5 h-3.5 ${lanInfo.isLanMode ? 'text-green-600' : 'text-[#879783]'}`} />
              <span>{lanInfo.isLanMode ? 'LAN Active' : 'Localhost'}</span>
            </div>
            <span className="font-mono text-[10px] text-[#292B29] font-medium truncate max-w-[100px]">
              {lanInfo.primaryIp}
            </span>
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 rounded-lg border border-[#E9E8E2] bg-white text-xs text-[#292B29] hover:bg-[#F0F3ED] transition-colors"
        >
          <Settings className="w-3.5 h-3.5 text-[#777973]" />
          <span>System & Network</span>
        </button>
      </div>
    </aside>
  );
};
