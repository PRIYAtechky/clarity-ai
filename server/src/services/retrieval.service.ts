import { DocumentChunk, DocumentRecord } from '../db/database.js';
import { ParsedSection } from './parser.service.js';

export interface ScoredChunk {
  chunk: DocumentChunk;
  score: number;
  documentTitle: string;
}

export class RetrievalService {
  /**
   * Split parsed sections into indexed chunks with page and section metadata
   */
  public static createChunks(
    documentId: string,
    conversationId: string | null,
    sections: ParsedSection[],
    targetWords: number = 400,
    overlapWords: number = 60
  ): Array<{
    document_id: string;
    conversation_id?: string | null;
    chunk_index: number;
    page_number?: number | null;
    section_title?: string | null;
    content: string;
    token_count: number;
  }> {
    const chunks: Array<{
      document_id: string;
      conversation_id?: string | null;
      chunk_index: number;
      page_number?: number | null;
      section_title?: string | null;
      content: string;
      token_count: number;
    }> = [];

    let chunkIndex = 0;

    for (const section of sections) {
      const words = section.text.split(/\s+/).filter(Boolean);
      if (words.length <= targetWords + overlapWords) {
        if (words.length > 0) {
          chunks.push({
            document_id: documentId,
            conversation_id: conversationId,
            chunk_index: chunkIndex++,
            page_number: section.pageNumber || null,
            section_title: section.sectionTitle || null,
            content: section.text.trim(),
            token_count: Math.ceil(words.length * 1.3),
          });
        }
        continue;
      }

      // Split large section with overlap
      let start = 0;
      while (start < words.length) {
        const end = Math.min(start + targetWords, words.length);
        const chunkWords = words.slice(start, end);
        const chunkText = chunkWords.join(' ').trim();

        if (chunkText.length > 0) {
          chunks.push({
            document_id: documentId,
            conversation_id: conversationId,
            chunk_index: chunkIndex++,
            page_number: section.pageNumber || null,
            section_title: section.sectionTitle || null,
            content: chunkText,
            token_count: Math.ceil(chunkWords.length * 1.3),
          });
        }

        if (end >= words.length) break;
        start += targetWords - overlapWords;
      }
    }

    return chunks;
  }

  /**
   * Rank chunks against a query using TF-IDF style lexical and structural scoring
   */
  public static retrieveRelevantChunks(
    query: string,
    allChunks: DocumentChunk[],
    documents: DocumentRecord[],
    options: {
      maxChunks?: number;
      isComparison?: boolean;
      targetDocIds?: string[];
    } = {}
  ): ScoredChunk[] {
    const { maxChunks = 8, isComparison = false, targetDocIds } = options;

    const docMap = new Map<string, DocumentRecord>();
    for (const d of documents) {
      docMap.set(d.id, d);
    }

    // Filter by target doc IDs if specified
    const filteredChunks = targetDocIds && targetDocIds.length > 0
      ? allChunks.filter(c => targetDocIds.includes(c.document_id))
      : allChunks;

    if (filteredChunks.length === 0) return [];

    // Tokenize query
    const queryTokens = this.tokenize(query);

    const scored: ScoredChunk[] = filteredChunks.map(chunk => {
      const doc = docMap.get(chunk.document_id);
      const docTitle = doc ? doc.filename : 'Document';
      const chunkTokens = this.tokenize(chunk.content);
      const titleTokens = this.tokenize(chunk.section_title || '');
      const docTokens = this.tokenize(docTitle);

      let score = 0;

      // Token overlap scoring
      for (const token of queryTokens) {
        // Content occurrences
        const count = chunkTokens.filter(t => t === token).length;
        if (count > 0) {
          score += 1 + Math.log(count);
        }

        // Boost for section header matches
        if (titleTokens.includes(token)) {
          score += 3.0;
        }

        // Boost for document filename matches
        if (docTokens.includes(token)) {
          score += 2.0;
        }
      }

      // Exact phrase match bonus
      const lowerQuery = query.toLowerCase().trim();
      if (lowerQuery.length > 4 && chunk.content.toLowerCase().includes(lowerQuery)) {
        score += 5.0;
      }

      // Baseline position score (prefer earlier introductory chunks slightly if query is broad)
      if (chunk.chunk_index < 3 && queryTokens.length <= 3) {
        score += 0.5;
      }

      return {
        chunk,
        score,
        documentTitle: docTitle,
      };
    });

    if (isComparison && targetDocIds && targetDocIds.length > 1) {
      // Balance chunks across all documents being compared
      const perDocLimit = Math.max(2, Math.floor(maxChunks / targetDocIds.length));
      const balanced: ScoredChunk[] = [];

      for (const docId of targetDocIds) {
        const docChunks = scored
          .filter(s => s.chunk.document_id === docId)
          .sort((a, b) => b.score - a.score);

        // Take top chunks from each document
        balanced.push(...docChunks.slice(0, perDocLimit));
      }

      return balanced.slice(0, maxChunks);
    }

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // If query has no keyword matches (e.g. "summarize everything"), return initial top chunks
    if (scored.length > 0 && scored[0].score === 0) {
      return scored.slice(0, maxChunks);
    }

    return scored.filter(s => s.score > 0).slice(0, maxChunks);
  }

  /**
   * Format retrieved chunks into clean markdown context for Gemini prompt
   */
  public static formatContextForPrompt(scoredChunks: ScoredChunk[]): string {
    if (scoredChunks.length === 0) {
      return 'No document context available.';
    }

    const lines: string[] = ['### SOURCE DOCUMENT PASSAGES:\n'];

    scoredChunks.forEach((sc, index) => {
      const pageInfo = sc.chunk.page_number ? `Page ${sc.chunk.page_number}` : 'N/A';
      const sectionInfo = sc.chunk.section_title ? ` | Section: "${sc.chunk.section_title}"` : '';

      lines.push(
        `--- [SOURCE ${index + 1}] ---`,
        `DOCUMENT: "${sc.documentTitle}"`,
        `LOCATION: ${pageInfo}${sectionInfo}`,
        `CONTENT:`,
        sc.chunk.content,
        ''
      );
    });

    return lines.join('\n');
  }

  private static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2);
  }
}
