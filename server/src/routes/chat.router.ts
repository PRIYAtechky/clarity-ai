import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';
import { RetrievalService } from '../services/retrieval.service.js';
import { GeminiService } from '../services/gemini.service.js';

export const chatRouter = Router();

// POST /api/chat (Standard non-streaming)
chatRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { conversationId, message, targetDocIds } = req.body;

    if (!conversationId) {
      res.status(400).json({ success: false, error: 'conversationId is required.' });
      return;
    }

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: 'message cannot be empty.' });
      return;
    }

    // Ensure conversation exists
    let conv = db.getConversationById(conversationId);
    if (!conv) {
      conv = db.createConversation(message.trim().slice(0, 35), conversationId);
    }

    // 1. Save user message
    const userMsg = db.createMessage(conv.id, 'user', message.trim());

    // 2. Retrieve document chunks
    const allChunks = db.getChunksByConversationId(conv.id);
    const documents = db.getDocuments(conv.id);

    const scoredChunks = RetrievalService.retrieveRelevantChunks(
      message,
      allChunks,
      documents,
      { maxChunks: 8, targetDocIds }
    );

    const contextString = RetrievalService.formatContextForPrompt(scoredChunks);

    // 3. Retrieve recent history for conversational continuity
    const history = db.getMessages(conv.id).map(m => ({
      role: m.role,
      content: m.content,
    }));

    // 4. Generate answer
    const answerText = await GeminiService.generateAnswer(
      message,
      contextString,
      history.slice(0, -1) // Exclude current question just appended
    );

    // 5. Extract citations
    const citations = GeminiService.extractCitations(answerText, scoredChunks);

    // 6. Save assistant message
    const assistantMsg = db.createMessage(conv.id, 'assistant', answerText, citations);

    // If first exchange in conversation, update title dynamically
    if (history.length <= 1) {
      const summaryTitle = message.trim().slice(0, 40);
      db.updateConversationTitle(conv.id, summaryTitle);
    }

    res.json({
      success: true,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
      citations,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/chat/stream (SSE streaming)
chatRouter.post('/stream', async (req: Request, res: Response) => {
  const { conversationId, message, targetDocIds } = req.body;

  if (!conversationId || !message || !message.trim()) {
    res.status(400).json({ success: false, error: 'conversationId and message are required.' });
    return;
  }

  let conv = db.getConversationById(conversationId);
  if (!conv) {
    conv = db.createConversation(message.trim().slice(0, 35), conversationId);
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // 1. Save user message
  const userMsg = db.createMessage(conv.id, 'user', message.trim());
  res.write(`data: ${JSON.stringify({ type: 'user_message', message: userMsg })}\n\n`);

  try {
    // 2. Retrieve document chunks
    const allChunks = db.getChunksByConversationId(conv.id);
    const documents = db.getDocuments(conv.id);

    const scoredChunks = RetrievalService.retrieveRelevantChunks(
      message,
      allChunks,
      documents,
      { maxChunks: 8, targetDocIds }
    );

    const contextString = RetrievalService.formatContextForPrompt(scoredChunks);

    const history = db.getMessages(conv.id).map(m => ({
      role: m.role,
      content: m.content,
    }));

    let fullAnswer = '';

    // 3. Stream from Gemini
    for await (const token of GeminiService.streamAnswer(
      message,
      contextString,
      history.slice(0, -1)
    )) {
      fullAnswer += token;
      res.write(`data: ${JSON.stringify({ type: 'chunk', text: token })}\n\n`);
    }

    // 4. Extract citations
    const citations = GeminiService.extractCitations(fullAnswer, scoredChunks);

    // 5. Save assistant message
    const assistantMsg = db.createMessage(conv.id, 'assistant', fullAnswer, citations);

    // Dynamic title if first exchange
    if (history.length <= 1) {
      const summaryTitle = message.trim().slice(0, 40);
      db.updateConversationTitle(conv.id, summaryTitle);
    }

    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        message: assistantMsg,
        citations,
      })}\n\n`
    );

    res.end();
  } catch (err: any) {
    res.write(
      `data: ${JSON.stringify({
        type: 'error',
        error: err.message || 'Error occurred while streaming AI response.',
      })}\n\n`
    );
    res.end();
  }
});
