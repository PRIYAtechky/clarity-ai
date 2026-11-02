import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { MessageItem } from './components/MessageItem.js';
import { Composer } from './components/Composer.js';
import { InsightsPanel } from './components/InsightsPanel.js';
import { SettingsModal } from './components/SettingsModal.js';
import { DocumentUploadModal } from './components/DocumentUploadModal.js';
import { api } from './api/client.js';
import {
  Conversation,
  Message,
  DocumentItem,
  Citation,
  LanInfo,
  HealthStatus,
} from './types/index.js';
import { AlertCircle, Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [lanInfo, setLanInfo] = useState<LanInfo | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);

  // Initial load
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [convList, lanData, healthData] = await Promise.allSettled([
        api.getConversations(),
        api.getLanInfo(),
        api.getHealth(),
      ]);

      if (convList.status === 'fulfilled') {
        setConversations(convList.value);
        if (convList.value.length > 0 && !activeId) {
          selectConversation(convList.value[0].id);
        }
      }

      if (lanData.status === 'fulfilled') {
        setLanInfo(lanData.value);
      }

      if (healthData.status === 'fulfilled') {
        setHealth(healthData.value);
      }
    } catch (err: any) {
      setErrorBanner('Failed to initialize connection to Clarity AI backend.');
    }
  };

  const selectConversation = async (id: string) => {
    setActiveId(id);
    try {
      const data = await api.getConversation(id);
      setMessages(data.messages || []);
      setDocuments(data.documents || []);
    } catch (err: any) {
      setErrorBanner('Unable to load conversation details.');
    }
  };

  const handleNewResearch = async () => {
    try {
      const newConv = await api.createConversation('New Research');
      setConversations(prev => [newConv, ...prev]);
      setActiveId(newConv.id);
      setMessages([]);
      setDocuments([]);
    } catch (err: any) {
      setErrorBanner('Could not create a new research session.');
    }
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const updated = await api.renameConversation(id, newTitle);
      setConversations(prev => prev.map(c => (c.id === id ? updated : c)));
    } catch (err: any) {
      setErrorBanner('Failed to rename conversation.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteConversation(id);
      const remaining = conversations.filter(c => c.id !== id);
      setConversations(remaining);
      if (activeId === id) {
        if (remaining.length > 0) {
          selectConversation(remaining[0].id);
        } else {
          setActiveId(null);
          setMessages([]);
          setDocuments([]);
        }
      }
    } catch (err: any) {
      setErrorBanner('Failed to delete conversation.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  // Sending message with live streaming and automatic fallback
  const handleSendMessage = async (text: string, targetDocIds?: string[]) => {
    if (!text.trim() || isStreaming) return;

    // Resolve or generate conversation ID immediately for 0ms optimistic UI
    const convId = activeId || crypto.randomUUID();
    if (!activeId) {
      const optimisticConv: Conversation = {
        id: convId,
        title: text.slice(0, 35),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setConversations(prev => [optimisticConv, ...prev]);
      setActiveId(convId);
    }

    const tempUserMsg: Message = {
      id: `temp-u-${Date.now()}`,
      conversation_id: convId,
      role: 'user',
      content: text,
      citations: [],
      created_at: new Date().toISOString(),
    };

    const tempAssistantMsg: Message = {
      id: `temp-a-${Date.now()}`,
      conversation_id: convId,
      role: 'assistant',
      content: '',
      citations: [],
      created_at: new Date().toISOString(),
      isStreaming: true,
    };

    // Immediately show messages on screen and trigger auto-scroll
    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsStreaming(true);

    const abortFn = api.streamChat(convId, text, targetDocIds, {
      onUserMessage: (serverUserMsg) => {
        setMessages(prev =>
          prev.map(m => (m.id === tempUserMsg.id ? serverUserMsg : m))
        );
      },
      onChunk: (chunk) => {
        setMessages(prev =>
          prev.map(m => {
            if (m.id === tempAssistantMsg.id) {
              return { ...m, content: m.content + chunk };
            }
            return m;
          })
        );
      },
      onDone: (finalAssistantMsg, citations) => {
        setIsStreaming(false);
        stopStreamRef.current = null;
        setMessages(prev =>
          prev.map(m => (m.id === tempAssistantMsg.id ? finalAssistantMsg : m))
        );

        // Refresh conversation list to update title / timestamp
        api.getConversations().then(setConversations).catch(() => {});
      },
      onError: async (errMsg) => {
        // Fallback: try standard HTTP POST if SSE streaming encountered network block
        try {
          const fallbackRes = await api.sendMessage(convId, text, targetDocIds);
          setIsStreaming(false);
          stopStreamRef.current = null;
          setMessages(prev =>
            prev.map(m => (m.id === tempAssistantMsg.id ? fallbackRes.assistantMessage : m))
          );
          api.getConversations().then(setConversations).catch(() => {});
        } catch (postErr: any) {
          setIsStreaming(false);
          stopStreamRef.current = null;
          const displayErr = errMsg || postErr.message || 'Error communicating with Clarity AI backend.';
          setErrorBanner(displayErr);
          setMessages(prev =>
            prev.map(m => {
              if (m.id === tempAssistantMsg.id) {
                return {
                  ...m,
                  content: `Error: ${displayErr}`,
                  isStreaming: false,
                };
              }
              return m;
            })
          );
        }
      },
    });

    stopStreamRef.current = abortFn;
  };

  const handleStopStream = () => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleDocumentUploaded = (newDoc: DocumentItem) => {
    setDocuments(prev => [newDoc, ...prev]);
    setIsInsightsOpen(true);
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      if (activeCitation?.documentId === docId) {
        setActiveCitation(null);
      }
    } catch (err: any) {
      setErrorBanner('Failed to delete document.');
    }
  };

  const handleSummarizeDocument = async (docId: string) => {
    setIsSummarizing(true);
    try {
      const res = await api.summarizeDocument(docId);
      const doc = documents.find(d => d.id === docId);

      // Append summary as an assistant message in chat
      if (activeId) {
        const summaryMsg: Message = {
          id: `summary-${Date.now()}`,
          conversation_id: activeId,
          role: 'assistant',
          content: `### Executive Briefing: "${doc?.filename || 'Document'}"\n\n${res.summary}`,
          citations: res.citations || [],
          created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, summaryMsg]);
      }
    } catch (err: any) {
      setErrorBanner(err.message || 'Summarization failed.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const activeConversation =
    conversations.find(c => c.id === activeId) || null;

  return (
    <div className="flex h-screen bg-[#FAF9F6] text-[#292B29] overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={handleNewResearch}
        onRename={handleRename}
        onDelete={handleDelete}
        onOpenSettings={() => setIsSettingsOpen(true)}
        lanInfo={lanInfo}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Error notification banner if any */}
        {errorBanner && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between text-xs text-red-700 z-40">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorBanner}</span>
            </div>
            <button
              onClick={() => setErrorBanner(null)}
              className="font-medium underline hover:text-red-900 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Header */}
        <Header
          conversation={activeConversation}
          documents={documents}
          lanInfo={lanInfo}
          onToggleSidebar={() => setIsSidebarCollapsed(prev => !prev)}
          onToggleInsights={() => setIsInsightsOpen(prev => !prev)}
          isInsightsOpen={isInsightsOpen}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        {/* Chat / Welcome view */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {messages.length === 0 ? (
            <WelcomeScreen
              conversationId={activeId || undefined}
              documents={documents}
              onUploadSuccess={handleDocumentUploaded}
              onSelectPrompt={p => handleSendMessage(p)}
            />
          ) : (
            <div className="flex-1 overflow-y-auto py-2">
              {messages.map(msg => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onSelectCitation={cit => {
                    setActiveCitation(cit);
                    setIsInsightsOpen(true);
                  }}
                />
              ))}

              {isStreaming && (
                <div className="px-6 py-2 flex items-center space-x-2 text-xs text-[#777973]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#879783]" />
                  <span>Clarity AI is analyzing verified passages...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Composer */}
        <Composer
          onSend={handleSendMessage}
          onStop={handleStopStream}
          onAttachClick={() => setIsUploadModalOpen(true)}
          isStreaming={isStreaming}
          documents={documents}
        />
      </div>

      {/* Collapsible Document Insights Drawer */}
      <InsightsPanel
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        documents={documents}
        onDeleteDocument={handleDeleteDocument}
        activeCitation={activeCitation}
        onClearActiveCitation={() => setActiveCitation(null)}
        onSummarizeDocument={handleSummarizeDocument}
        isSummarizing={isSummarizing}
      />

      {/* Settings & LAN Access Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        lanInfo={lanInfo}
        health={health}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        conversationId={activeId || undefined}
        onUploadSuccess={handleDocumentUploaded}
      />
    </div>
  );
};

export default App;
