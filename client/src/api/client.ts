import {
  Conversation,
  Message,
  DocumentItem,
  LanInfo,
  HealthStatus,
  Citation,
} from '../types/index.js';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const api = {
  async getHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/api/health`);
    if (!res.ok) throw new Error(`Health check failed with status ${res.status}`);
    return res.json();
  },

  async getLanInfo(): Promise<LanInfo> {
    const res = await fetch(`${API_BASE}/api/lan/info`);
    if (!res.ok) throw new Error('Failed to fetch LAN info');
    return res.json();
  },

  async getConversations(): Promise<Conversation[]> {
    const res = await fetch(`${API_BASE}/api/conversations`);
    const data = await res.json();
    return data.conversations || [];
  },

  async createConversation(title?: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    return data.conversation;
  },

  async getConversation(id: string): Promise<{
    conversation: Conversation;
    messages: Message[];
    documents: DocumentItem[];
  }> {
    const res = await fetch(`${API_BASE}/api/conversations/${id}`);
    if (!res.ok) throw new Error('Conversation not found');
    return res.json();
  },

  async renameConversation(id: string, title: string): Promise<Conversation> {
    const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    return data.conversation;
  },

  async deleteConversation(id: string): Promise<void> {
    await fetch(`${API_BASE}/api/conversations/${id}`, {
      method: 'DELETE',
    });
  },

  async uploadDocument(
    file: File,
    conversationId?: string,
    onProgress?: (percent: number) => void
  ): Promise<{ document: DocumentItem; chunkCount: number }> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversationId', conversationId);
      }

      xhr.open('POST', `${API_BASE}/api/documents/upload`);

      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && res.success) {
            resolve(res);
          } else {
            reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error during file upload. Check your connection or Windows Firewall.'));
      };

      xhr.send(formData);
    });
  },

  async getDocuments(conversationId?: string): Promise<DocumentItem[]> {
    const url = conversationId
      ? `${API_BASE}/api/documents?conversationId=${encodeURIComponent(conversationId)}`
      : `${API_BASE}/api/documents`;
    const res = await fetch(url);
    const data = await res.json();
    return data.documents || [];
  },

  async deleteDocument(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/documents/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete document');
    }
  },

  async summarizeDocument(id: string): Promise<{
    summary: string;
    citations: Citation[];
  }> {
    const res = await fetch(`${API_BASE}/api/documents/${id}/summarize`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to generate document summary');
    return data;
  },

  async compareDocuments(documentIds: string[]): Promise<{
    comparedDocuments: Array<{ id: string; filename: string }>;
    comparison: string;
    citations: Citation[];
  }> {
    const res = await fetch(`${API_BASE}/api/documents/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentIds }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to compare documents');
    return data;
  },

  async sendMessage(
    conversationId: string,
    message: string,
    targetDocIds?: string[]
  ): Promise<{
    userMessage: Message;
    assistantMessage: Message;
    citations: Citation[];
  }> {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, message, targetDocIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Server responded with status ${res.status}`);
    }
    return data;
  },

  streamChat(
    conversationId: string,
    message: string,
    targetDocIds: string[] | undefined,
    callbacks: {
      onUserMessage?: (msg: Message) => void;
      onChunk: (chunk: string) => void;
      onDone: (msg: Message, citations: Citation[]) => void;
      onError: (err: string) => void;
    }
  ): () => void {
    const controller = new AbortController();

    (async () => {
      try {
        const response = await fetch(`${API_BASE}/api/chat/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId, message, targetDocIds }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error || `Server responded with ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Readable stream not supported by browser.');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              try {
                const data = JSON.parse(trimmed.slice(6));
                if (data.type === 'user_message' && callbacks.onUserMessage) {
                  callbacks.onUserMessage(data.message);
                } else if (data.type === 'chunk') {
                  callbacks.onChunk(data.text);
                } else if (data.type === 'done') {
                  callbacks.onDone(data.message, data.citations || []);
                } else if (data.type === 'error') {
                  callbacks.onError(data.error);
                }
              } catch (_) {}
            }
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          callbacks.onError(err.message || 'Error communicating with Clarity AI backend.');
        }
      }
    })();

    return () => {
      controller.abort();
    };
  },
};
