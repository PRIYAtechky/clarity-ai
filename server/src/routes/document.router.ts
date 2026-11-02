import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { db } from '../db/database.js';
import { ParserService } from '../services/parser.service.js';
import { RetrievalService } from '../services/retrieval.service.js';
import { GeminiService } from '../services/gemini.service.js';

export const documentRouter = Router();

// Configure Multer storage
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeExt = path.extname(file.originalname).toLowerCase();
    cb(null, `doc-${uniqueSuffix}${safeExt}`);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: config.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      (req as any).fileValidationError = `Invalid file format "${ext}". Supported formats are: PDF (.pdf), Word (.docx), Markdown (.md), and Text (.txt).`;
      cb(null, false);
    }
  },
});

const handleUploadMiddleware = (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            error: `File is too large. Maximum supported size is ${config.maxFileSizeMb} MB.`,
          });
        }
        return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
      }
      return res.status(400).json({ success: false, error: err.message || 'File upload error' });
    }

    if ((req as any).fileValidationError) {
      return res.status(400).json({
        success: false,
        error: (req as any).fileValidationError,
      });
    }

    next();
  });
};

// POST /api/documents/upload
documentRouter.post(
  '/upload',
  handleUploadMiddleware,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded.' });
        return;
      }

      const { conversationId } = req.body;
      const originalFilename = req.file.originalname;
      const storagePath = req.file.path;
      const mimeType = req.file.mimetype;
      const fileSize = req.file.size;

      // Ensure conversation exists if provided
      let validConversationId = conversationId ? String(conversationId) : null;
      if (validConversationId) {
        const conv = db.getConversationById(validConversationId);
        if (!conv) {
          validConversationId = null;
        }
      }

      // 1. Create document record in processing state
      const docRecord = db.createDocument({
        conversation_id: validConversationId,
        filename: originalFilename,
        storage_path: storagePath,
        mime_type: mimeType,
        file_size: fileSize,
        status: 'processing',
      });

      // 2. Parse document text and sections
      try {
        const parseResult = await ParserService.parseDocument(
          storagePath,
          originalFilename,
          mimeType
        );

        // 3. Create searchable chunks
        const chunks = RetrievalService.createChunks(
          docRecord.id,
          validConversationId,
          parseResult.sections
        );

        // 4. Store chunks in database
        db.insertChunks(chunks);

        // 5. Update document status to ready
        db.updateDocumentStatus(
          docRecord.id,
          'ready',
          undefined,
          `Document parsed successfully with ${parseResult.pageCount} page(s) and ${chunks.length} indexed research chunk(s).`,
          parseResult.pageCount
        );

        const updatedDoc = db.getDocumentById(docRecord.id);

        res.status(201).json({
          success: true,
          document: updatedDoc,
          chunkCount: chunks.length,
        });
      } catch (parseError: any) {
        // Update document status to error
        db.updateDocumentStatus(
          docRecord.id,
          'error',
          parseError.message || 'Failed to process document text.'
        );

        res.status(422).json({
          success: false,
          error: parseError.message || 'Failed to parse document.',
          document: db.getDocumentById(docRecord.id),
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/documents
documentRouter.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversationId = req.query.conversationId ? String(req.query.conversationId) : undefined;
    const documents = db.getDocuments(conversationId);
    res.json({ success: true, documents });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id
documentRouter.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const document = db.getDocumentById(id);
    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found.' });
      return;
    }

    const chunks = db.getChunksByDocumentId(id);
    res.json({
      success: true,
      document,
      chunkCount: chunks.length,
      chunksPreview: chunks.slice(0, 3),
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/documents/:id
documentRouter.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const document = db.getDocumentById(id);
    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found.' });
      return;
    }

    db.deleteDocument(id);
    res.json({ success: true, message: 'Document and its research chunks removed successfully.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/:id/summarize
documentRouter.post('/:id/summarize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const document = db.getDocumentById(id);
    if (!document) {
      res.status(404).json({ success: false, error: 'Document not found.' });
      return;
    }

    const chunks = db.getChunksByDocumentId(id);
    if (chunks.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Document contains no processed chunks to summarize.',
      });
      return;
    }

    // Prepare context
    const scoredChunks = chunks.map(c => ({
      chunk: c,
      score: 1,
      documentTitle: document.filename,
    }));

    const context = RetrievalService.formatContextForPrompt(scoredChunks.slice(0, 12));
    const summaryMarkdown = await GeminiService.generateDocumentSummary(
      document.filename,
      context
    );

    const citations = GeminiService.extractCitations(summaryMarkdown, scoredChunks);

    // Save summary in document metadata
    db.updateDocumentStatus(id, 'ready', undefined, summaryMarkdown);

    res.json({
      success: true,
      documentId: id,
      summary: summaryMarkdown,
      citations,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/compare
documentRouter.post('/compare', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { documentIds } = req.body;
    if (!Array.isArray(documentIds) || documentIds.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Please provide at least 2 document IDs to compare.',
      });
      return;
    }

    const docIdStrings = documentIds.map(d => String(d));
    const docs = docIdStrings
      .map(id => db.getDocumentById(id))
      .filter((d): d is NonNullable<typeof d> => d !== null);

    if (docs.length < 2) {
      res.status(404).json({
        success: false,
        error: 'Could not find all requested documents for comparison.',
      });
      return;
    }

    // Collect chunks from each document
    const allChunks = docs.flatMap(d => db.getChunksByDocumentId(d.id));

    // Retrieve balanced representative chunks from each
    const scoredChunks = RetrievalService.retrieveRelevantChunks(
      'overview core findings statistics methodology conclusion differences',
      allChunks,
      docs,
      {
        maxChunks: 12,
        isComparison: true,
        targetDocIds: docIdStrings,
      }
    );

    const context = RetrievalService.formatContextForPrompt(scoredChunks);
    const comparisonMarkdown = await GeminiService.generateDocumentComparison(
      docs.map(d => d.filename),
      context
    );

    const citations = GeminiService.extractCitations(comparisonMarkdown, scoredChunks);

    res.json({
      success: true,
      comparedDocuments: docs.map(d => ({ id: d.id, filename: d.filename })),
      comparison: comparisonMarkdown,
      citations,
    });
  } catch (err) {
    next(err);
  }
});
