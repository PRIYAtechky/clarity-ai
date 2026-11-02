export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  pageNumber?: number;
  sectionTitle?: string;
  snippet: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: Citation[];
  created_at: string;
  isStreaming?: boolean;
}

export interface DocumentItem {
  id: string;
  conversation_id?: string | null;
  filename: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  status: 'processing' | 'ready' | 'error';
  error_message?: string | null;
  page_count: number;
  summary?: string | null;
  created_at: string;
}

export interface LanInfo {
  isLanMode: boolean;
  host: string;
  backendPort: number;
  frontendPort: number;
  primaryIp: string;
  localhostUrl: string;
  lanClientUrl: string;
  backendHealthUrl: string;
  interfaces: Array<{
    name: string;
    ip: string;
    family: string;
    isInternal: boolean;
  }>;
  firewallGuidance: {
    powershellCommand: string;
    troubleshootingSteps: string[];
  };
}

export interface HealthStatus {
  status: string;
  name: string;
  version: string;
  gemini: {
    configured: boolean;
    model: string;
  };
  lanMode: boolean;
  lanIp: string;
  lanAccessUrl: string;
}
