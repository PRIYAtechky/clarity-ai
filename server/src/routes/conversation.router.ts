import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../db/database.js';

export const conversationRouter = Router();

// GET all conversations
conversationRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = db.getConversations();
    res.json({ success: true, conversations: list });
  } catch (err) {
    next(err);
  }
});

// POST create conversation
conversationRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body;
    const conversation = db.createConversation(title || 'New Research');
    res.status(201).json({ success: true, conversation });
  } catch (err) {
    next(err);
  }
});

// GET conversation by ID with messages and documents
conversationRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const conversation = db.getConversationById(id);
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found.' });
      return;
    }

    const messages = db.getMessages(id);
    const documents = db.getDocuments(id);

    res.json({
      success: true,
      conversation,
      messages,
      documents,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH rename conversation
conversationRouter.patch('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { title } = req.body;

    if (!title || !title.trim()) {
      res.status(400).json({ success: false, error: 'Title cannot be empty.' });
      return;
    }

    const existing = db.getConversationById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Conversation not found.' });
      return;
    }

    db.updateConversationTitle(id, title.trim());
    const updated = db.getConversationById(id);
    res.json({ success: true, conversation: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE conversation
conversationRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const existing = db.getConversationById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Conversation not found.' });
      return;
    }

    db.deleteConversation(id);
    res.json({ success: true, message: 'Conversation deleted successfully.' });
  } catch (err) {
    next(err);
  }
});
