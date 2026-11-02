import { describe, it, expect } from 'vitest';
import { RetrievalService } from '../src/services/retrieval.service.js';
import { DocumentChunk, DocumentRecord } from '../src/db/database.js';

describe('RetrievalService', () => {
  it('should split sections into coherent chunks with page and section metadata', () => {
    const sections = [
      {
        pageNumber: 1,
        sectionTitle: 'Executive Summary',
        text: 'This is the executive summary of the Clarity AI research initiative. It focuses on precision, verified citations, and local network accessibility.',
      },
      {
        pageNumber: 2,
        sectionTitle: 'Architecture',
        text: 'The architecture uses React for the frontend and Node Express for the backend. SQLite is used for persistent metadata and chunk indexing.',
      },
    ];

    const chunks = RetrievalService.createChunks('doc-1', 'conv-1', sections);

    expect(chunks.length).toBe(2);
    expect(chunks[0].document_id).toBe('doc-1');
    expect(chunks[0].page_number).toBe(1);
    expect(chunks[0].section_title).toBe('Executive Summary');
    expect(chunks[1].page_number).toBe(2);
    expect(chunks[1].section_title).toBe('Architecture');
  });

  it('should accurately score and rank chunks relevant to a user query', () => {
    const documents: DocumentRecord[] = [
      {
        id: 'doc-1',
        filename: 'Project_Alpha.pdf',
        storage_path: '/tmp/test.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        status: 'ready',
        page_count: 5,
        created_at: new Date().toISOString(),
      },
    ];

    const allChunks: DocumentChunk[] = [
      {
        id: 'c1',
        document_id: 'doc-1',
        chunk_index: 0,
        page_number: 1,
        section_title: 'Budget and Financials',
        content: 'Total project revenue reached $4.2 million with a 38% gross margin.',
        token_count: 20,
        created_at: new Date().toISOString(),
      },
      {
        id: 'c2',
        document_id: 'doc-1',
        chunk_index: 1,
        page_number: 2,
        section_title: 'Engineering Stack',
        content: 'The application uses TypeScript and React with a Node Express microservice.',
        token_count: 20,
        created_at: new Date().toISOString(),
      },
    ];

    const scored = RetrievalService.retrieveRelevantChunks('what was the revenue and gross margin?', allChunks, documents);

    expect(scored.length).toBeGreaterThan(0);
    expect(scored[0].chunk.id).toBe('c1');
    expect(scored[0].documentTitle).toBe('Project_Alpha.pdf');
  });

  it('should balance chunks across multiple documents during comparison', () => {
    const documents: DocumentRecord[] = [
      {
        id: 'doc-a',
        filename: 'Report_A.pdf',
        storage_path: '/tmp/a.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        status: 'ready',
        page_count: 2,
        created_at: new Date().toISOString(),
      },
      {
        id: 'doc-b',
        filename: 'Report_B.pdf',
        storage_path: '/tmp/b.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        status: 'ready',
        page_count: 2,
        created_at: new Date().toISOString(),
      },
    ];

    const allChunks: DocumentChunk[] = [
      {
        id: 'ca1',
        document_id: 'doc-a',
        chunk_index: 0,
        page_number: 1,
        section_title: 'Metrics',
        content: 'Methodology A yields 94% accuracy.',
        token_count: 10,
        created_at: new Date().toISOString(),
      },
      {
        id: 'cb1',
        document_id: 'doc-b',
        chunk_index: 0,
        page_number: 1,
        section_title: 'Metrics',
        content: 'Methodology B yields 97% accuracy with lower latency.',
        token_count: 10,
        created_at: new Date().toISOString(),
      },
    ];

    const retrieved = RetrievalService.retrieveRelevantChunks(
      'compare accuracy and methodology',
      allChunks,
      documents,
      { isComparison: true, targetDocIds: ['doc-a', 'doc-b'] }
    );

    const docAFound = retrieved.some(r => r.chunk.document_id === 'doc-a');
    const docBFound = retrieved.some(r => r.chunk.document_id === 'doc-b');
    expect(docAFound).toBe(true);
    expect(docBFound).toBe(true);
  });
});
