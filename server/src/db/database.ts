import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config.js';

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite');

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
}

export interface DocumentRecord {
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

export interface DocumentChunk {
  id: string;
  document_id: string;
  conversation_id?: string | null;
  chunk_index: number;
  page_number?: number | null;
  section_title?: string | null;
  content: string;
  token_count: number;
  created_at: string;
}

export class AppDatabase {
  private db: any;

  constructor(dbPath: string = config.databasePath) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        citations TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        conversation_id TEXT,
        filename TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        page_count INTEGER NOT NULL DEFAULT 1,
        summary TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        conversation_id TEXT,
        chunk_index INTEGER NOT NULL,
        page_number INTEGER,
        section_title TEXT,
        content TEXT NOT NULL,
        token_count INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_documents_conversation ON documents(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_document ON document_chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_conversation ON document_chunks(conversation_id);
    `);
  }

  // --- Conversations ---
  public createConversation(title: string = 'New Research', customId?: string): Conversation {
    const id = customId || crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, title, now, now);
    return { id, title, created_at: now, updated_at: now };
  }

  public getConversations(): Conversation[] {
    const stmt = this.db.prepare(`
      SELECT * FROM conversations ORDER BY updated_at DESC
    `);
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      id: String(r.id),
      title: String(r.title),
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    }));
  }

  public getConversationById(id: string): Conversation | null {
    const stmt = this.db.prepare(`SELECT * FROM conversations WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: String(row.id),
      title: String(row.title),
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
    };
  }

  public updateConversationTitle(id: string, title: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(title, now, id);
  }

  public touchConversation(id: string): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      UPDATE conversations SET updated_at = ? WHERE id = ?
    `);
    stmt.run(now, id);
  }

  public deleteConversation(id: string): void {
    const delMsg = this.db.prepare(`DELETE FROM messages WHERE conversation_id = ?`);
    delMsg.run(id);

    // Get documents to remove files
    const docs = this.getDocuments(id);
    for (const doc of docs) {
      if (fs.existsSync(doc.storage_path)) {
        try {
          fs.unlinkSync(doc.storage_path);
        } catch (_) {}
      }
    }

    const delChunks = this.db.prepare(`DELETE FROM document_chunks WHERE conversation_id = ?`);
    delChunks.run(id);

    const delDocs = this.db.prepare(`DELETE FROM documents WHERE conversation_id = ?`);
    delDocs.run(id);

    const delConv = this.db.prepare(`DELETE FROM conversations WHERE id = ?`);
    delConv.run(id);
  }

  // --- Messages ---
  public createMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    citations: Citation[] = []
  ): Message {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, citations, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, conversationId, role, content, JSON.stringify(citations), now);
    this.touchConversation(conversationId);
    return {
      id,
      conversation_id: conversationId,
      role,
      content,
      citations,
      created_at: now,
    };
  }

  public getMessages(conversationId: string): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
    `);
    const rows = stmt.all(conversationId) as any[];
    return rows.map(r => ({
      id: String(r.id),
      conversation_id: String(r.conversation_id),
      role: r.role as 'user' | 'assistant' | 'system',
      content: String(r.content),
      citations: r.citations ? JSON.parse(String(r.citations)) : [],
      created_at: String(r.created_at),
    }));
  }

  // --- Documents ---
  public createDocument(doc: {
    conversation_id?: string | null;
    filename: string;
    storage_path: string;
    mime_type: string;
    file_size: number;
    status: 'processing' | 'ready' | 'error';
    error_message?: string | null;
    page_count?: number;
    summary?: string | null;
  }): DocumentRecord {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const pageCount = doc.page_count || 1;
    const stmt = this.db.prepare(`
      INSERT INTO documents (
        id, conversation_id, filename, storage_path, mime_type, file_size,
        status, error_message, page_count, summary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      doc.conversation_id || null,
      doc.filename,
      doc.storage_path,
      doc.mime_type,
      doc.file_size,
      doc.status,
      doc.error_message || null,
      pageCount,
      doc.summary || null,
      now
    );

    return {
      id,
      conversation_id: doc.conversation_id || null,
      filename: doc.filename,
      storage_path: doc.storage_path,
      mime_type: doc.mime_type,
      file_size: doc.file_size,
      status: doc.status,
      error_message: doc.error_message || null,
      page_count: pageCount,
      summary: doc.summary || null,
      created_at: now,
    };
  }

  public getDocuments(conversationId?: string): DocumentRecord[] {
    let stmt;
    let rows: any[];
    if (conversationId) {
      stmt = this.db.prepare(`
        SELECT * FROM documents WHERE conversation_id = ? OR conversation_id IS NULL ORDER BY created_at DESC
      `);
      rows = stmt.all(conversationId) as any[];
    } else {
      stmt = this.db.prepare(`SELECT * FROM documents ORDER BY created_at DESC`);
      rows = stmt.all() as any[];
    }

    return rows.map(r => ({
      id: String(r.id),
      conversation_id: r.conversation_id ? String(r.conversation_id) : null,
      filename: String(r.filename),
      storage_path: String(r.storage_path),
      mime_type: String(r.mime_type),
      file_size: Number(r.file_size),
      status: r.status,
      error_message: r.error_message ? String(r.error_message) : null,
      page_count: Number(r.page_count || 1),
      summary: r.summary ? String(r.summary) : null,
      created_at: String(r.created_at),
    }));
  }

  public getDocumentById(id: string): DocumentRecord | null {
    const stmt = this.db.prepare(`SELECT * FROM documents WHERE id = ?`);
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      id: String(row.id),
      conversation_id: row.conversation_id ? String(row.conversation_id) : null,
      filename: String(row.filename),
      storage_path: String(row.storage_path),
      mime_type: String(row.mime_type),
      file_size: Number(row.file_size),
      status: row.status,
      error_message: row.error_message ? String(row.error_message) : null,
      page_count: Number(row.page_count || 1),
      summary: row.summary ? String(row.summary) : null,
      created_at: String(row.created_at),
    };
  }

  public updateDocumentStatus(
    id: string,
    status: 'processing' | 'ready' | 'error',
    errorMessage?: string,
    summary?: string,
    pageCount?: number
  ): void {
    const current = this.getDocumentById(id);
    const updatedPageCount = pageCount !== undefined ? pageCount : (current?.page_count || 1);
    const updatedSummary = summary !== undefined ? summary : (current?.summary || null);
    const updatedErr = errorMessage !== undefined ? errorMessage : (current?.error_message || null);

    const stmt = this.db.prepare(`
      UPDATE documents
      SET status = ?, error_message = ?, summary = ?, page_count = ?
      WHERE id = ?
    `);
    stmt.run(status, updatedErr, updatedSummary, updatedPageCount, id);
  }

  public deleteDocument(id: string): void {
    const doc = this.getDocumentById(id);
    if (doc && fs.existsSync(doc.storage_path)) {
      try {
        fs.unlinkSync(doc.storage_path);
      } catch (_) {}
    }

    const delChunks = this.db.prepare(`DELETE FROM document_chunks WHERE document_id = ?`);
    delChunks.run(id);

    const delDoc = this.db.prepare(`DELETE FROM documents WHERE id = ?`);
    delDoc.run(id);
  }

  // --- Chunks ---
  public insertChunks(
    chunks: Array<{
      document_id: string;
      conversation_id?: string | null;
      chunk_index: number;
      page_number?: number | null;
      section_title?: string | null;
      content: string;
      token_count?: number;
    }>
  ): void {
    const now = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO document_chunks (
        id, document_id, conversation_id, chunk_index, page_number,
        section_title, content, token_count, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const chunk of chunks) {
      const id = crypto.randomUUID();
      stmt.run(
        id,
        chunk.document_id,
        chunk.conversation_id || null,
        chunk.chunk_index,
        chunk.page_number || null,
        chunk.section_title || null,
        chunk.content,
        chunk.token_count || 0,
        now
      );
    }
  }

  public getChunksByDocumentId(documentId: string): DocumentChunk[] {
    const stmt = this.db.prepare(`
      SELECT * FROM document_chunks WHERE document_id = ? ORDER BY chunk_index ASC
    `);
    const rows = stmt.all(documentId) as any[];
    return rows.map(r => ({
      id: String(r.id),
      document_id: String(r.document_id),
      conversation_id: r.conversation_id ? String(r.conversation_id) : null,
      chunk_index: Number(r.chunk_index),
      page_number: r.page_number ? Number(r.page_number) : null,
      section_title: r.section_title ? String(r.section_title) : null,
      content: String(r.content),
      token_count: Number(r.token_count),
      created_at: String(r.created_at),
    }));
  }

  public getChunksByConversationId(conversationId: string): DocumentChunk[] {
    const stmt = this.db.prepare(`
      SELECT * FROM document_chunks WHERE conversation_id = ? OR conversation_id IS NULL ORDER BY chunk_index ASC
    `);
    const rows = stmt.all(conversationId) as any[];
    return rows.map(r => ({
      id: String(r.id),
      document_id: String(r.document_id),
      conversation_id: r.conversation_id ? String(r.conversation_id) : null,
      chunk_index: Number(r.chunk_index),
      page_number: r.page_number ? Number(r.page_number) : null,
      section_title: r.section_title ? String(r.section_title) : null,
      content: String(r.content),
      token_count: Number(r.token_count),
      created_at: String(r.created_at),
    }));
  }

  public close(): void {
    this.db.close();
  }
}

export const db = new AppDatabase();
