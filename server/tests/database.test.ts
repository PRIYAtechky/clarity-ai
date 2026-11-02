import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { AppDatabase } from '../src/db/database.js';

describe('AppDatabase', () => {
  const testDbPath = path.resolve(process.cwd(), './data/test-clarity.sqlite');
  let testDb: AppDatabase;

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (_) {}
    }
    testDb = new AppDatabase(testDbPath);
  });

  afterEach(() => {
    testDb.close();
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch (_) {}
    }
  });

  it('should create and retrieve conversations', () => {
    const conv = testDb.createConversation('Quantum Computing Research');
    expect(conv.id).toBeDefined();
    expect(conv.title).toBe('Quantum Computing Research');

    const all = testDb.getConversations();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(conv.id);

    testDb.updateConversationTitle(conv.id, 'Renamed Quantum Paper');
    const updated = testDb.getConversationById(conv.id);
    expect(updated?.title).toBe('Renamed Quantum Paper');
  });

  it('should create messages with structured citations', () => {
    const conv = testDb.createConversation('Doc Q&A');
    const citations = [
      {
        documentId: 'd-1',
        documentTitle: 'AI_Ethics.pdf',
        pageNumber: 4,
        snippet: 'Ethical considerations must be enforced at inference time.',
      },
    ];

    const msg = testDb.createMessage(
      conv.id,
      'assistant',
      'Here is the verified answer [[Doc: AI_Ethics.pdf, Page: 4]]',
      citations
    );

    expect(msg.role).toBe('assistant');
    expect(msg.citations.length).toBe(1);
    expect(msg.citations[0].documentTitle).toBe('AI_Ethics.pdf');

    const history = testDb.getMessages(conv.id);
    expect(history.length).toBe(1);
    expect(history[0].citations[0].pageNumber).toBe(4);
  });

  it('should cascade delete messages and document chunks when a conversation is deleted', () => {
    const conv = testDb.createConversation('Temporary Conv');
    testDb.createMessage(conv.id, 'user', 'Hello world');

    const doc = testDb.createDocument({
      conversation_id: conv.id,
      filename: 'Sample.txt',
      storage_path: './data/uploads/sample.txt',
      mime_type: 'text/plain',
      file_size: 100,
      status: 'ready',
    });

    testDb.insertChunks([
      {
        document_id: doc.id,
        conversation_id: conv.id,
        chunk_index: 0,
        content: 'Sample text chunk',
      },
    ]);

    expect(testDb.getMessages(conv.id).length).toBe(1);
    expect(testDb.getDocuments(conv.id).length).toBe(1);

    testDb.deleteConversation(conv.id);

    expect(testDb.getConversationById(conv.id)).toBeNull();
    expect(testDb.getMessages(conv.id).length).toBe(0);
    expect(testDb.getDocuments(conv.id).length).toBe(0);
  });
});
