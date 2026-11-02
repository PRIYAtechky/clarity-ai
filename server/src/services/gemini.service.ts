import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { Citation } from '../db/database.js';
import { ScoredChunk } from './retrieval.service.js';

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class GeminiService {
  private static instance: GoogleGenAI | null = null;

  public static getClient(): GoogleGenAI {
    if (!this.instance) {
      if (!config.geminiApiKey) {
        throw new Error(
          'Gemini API key is not configured. Please add GEMINI_API_KEY to your server .env file.'
        );
      }
      this.instance = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
    return this.instance;
  }

  public static isConfigured(): boolean {
    return Boolean(config.geminiApiKey && config.geminiApiKey.trim().length > 0);
  }

  public static getModelName(): string {
    return config.geminiModel || 'gemini-3-flash-preview';
  }

  /**
   * System instruction enforcing strict document grounding, markdown formatting, and citations
   */
  private static getSystemInstruction(): string {
    return `You are Clarity AI, a precise, intellectual, and professional document research assistant.

Core Principles:
1. DOCUMENT GROUNDING: Base your answers ONLY on the verified document passages provided in the prompt.
2. VERIFIABLE CITATIONS: Whenever stating a fact, figure, finding, or conclusion from the documents, you MUST append a citation using the exact format:
   [[Doc: <Document Title>, Page: <Page Number or Section Title>]]
   Example: [[Doc: Annual_Report_2024.pdf, Page: 12]] or [[Doc: Architecture.md, Page: Overview]]
   Never make up page numbers or cite documents that are not in the provided passages.
3. ADMITTING GAPS: If the provided documents do not contain enough information to answer a question or follow-up, state explicitly: "Based on the provided documents, this information is not mentioned."
4. ELEGANT FORMATTING: Structure your answers using clean GitHub-flavored Markdown:
   - Use bold for emphasis and key metrics.
   - Use structured bullet points and numbered lists for readability.
   - Use Markdown tables when comparing numbers, dates, or specifications.
   - Use code blocks with language tags when showing code or syntax.
5. TONE: Calm, objective, concise, and academic.`;
  }

  /**
   * Parse citation markup [[Doc: ..., Page: ...]] and link with retrieved chunks
   */
  public static extractCitations(text: string, contextChunks: ScoredChunk[]): Citation[] {
    const citations: Citation[] = [];
    const citationRegex = /\[\[Doc:\s*([^,\]]+)(?:,\s*Page:\s*([^\]]+))?\]\]/g;
    const seen = new Set<string>();

    let match;
    while ((match = citationRegex.exec(text)) !== null) {
      const docName = match[1].trim();
      const pageOrSection = match[2]?.trim();
      const key = `${docName}::${pageOrSection || ''}`;

      if (seen.has(key)) continue;
      seen.add(key);

      // Find best matching chunk
      const matchingChunk = contextChunks.find(sc => {
        const titleMatches = sc.documentTitle.toLowerCase().includes(docName.toLowerCase()) ||
          docName.toLowerCase().includes(sc.documentTitle.toLowerCase());
        if (!titleMatches) return false;

        if (pageOrSection) {
          const pageNum = parseInt(pageOrSection.replace(/\D/g, ''), 10);
          if (!isNaN(pageNum) && sc.chunk.page_number === pageNum) {
            return true;
          }
          if (sc.chunk.section_title?.toLowerCase().includes(pageOrSection.toLowerCase())) {
            return true;
          }
        }
        return true;
      });

      if (matchingChunk) {
        citations.push({
          documentId: matchingChunk.chunk.document_id,
          documentTitle: matchingChunk.documentTitle,
          pageNumber: matchingChunk.chunk.page_number || undefined,
          sectionTitle: matchingChunk.chunk.section_title || undefined,
          snippet: matchingChunk.chunk.content.slice(0, 240) + '...',
        });
      } else {
        citations.push({
          documentId: 'unknown',
          documentTitle: docName,
          pageNumber: pageOrSection && !isNaN(parseInt(pageOrSection, 10)) ? parseInt(pageOrSection, 10) : undefined,
          sectionTitle: pageOrSection,
          snippet: `Referenced document: ${docName}`,
        });
      }
    }

    return citations;
  }

  /**
   * Generate an answer with conversation history and document context
   */
  public static async generateAnswer(
    query: string,
    contextString: string,
    history: ChatMessageInput[] = []
  ): Promise<string> {
    const ai = this.getClient();
    const model = this.getModelName();

    const formattedHistory = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const prompt = `${this.getSystemInstruction()}

${contextString}

${formattedHistory ? `CONVERSATION HISTORY:\n${formattedHistory}\n\n` : ''}CURRENT USER QUESTION:
${query}

Please provide a well-structured, thoroughly cited answer based on the provided document passages.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      return response.text || 'No response generated.';
    } catch (err: any) {
      // Fallback check if model 404
      if (err.message && err.message.includes('404')) {
        const fallback = 'gemini-3.1-flash-lite-preview';
        const response = await ai.models.generateContent({
          model: fallback,
          contents: prompt,
        });
        return response.text || 'No response generated.';
      }
      throw err;
    }
  }

  /**
   * Stream answer for real-time UI display
   */
  public static async *streamAnswer(
    query: string,
    contextString: string,
    history: ChatMessageInput[] = []
  ): AsyncGenerator<string, void, unknown> {
    const ai = this.getClient();
    const model = this.getModelName();

    const formattedHistory = history.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');

    const prompt = `${this.getSystemInstruction()}

${contextString}

${formattedHistory ? `CONVERSATION HISTORY:\n${formattedHistory}\n\n` : ''}CURRENT USER QUESTION:
${query}

Please provide a well-structured, thoroughly cited answer based on the provided document passages.`;

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: prompt,
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          yield chunk.text;
        }
      }
    } catch (err: any) {
      // If 404 fallback
      if (err.message && err.message.includes('404')) {
        const fallback = 'gemini-3.1-flash-lite-preview';
        const stream = await ai.models.generateContentStream({
          model: fallback,
          contents: prompt,
        });
        for await (const chunk of stream) {
          if (chunk.text) {
            yield chunk.text;
          }
        }
        return;
      }
      throw err;
    }
  }

  /**
   * Generate short summary, detailed summary, key findings, definitions, stats, and conclusions
   */
  public static async generateDocumentSummary(documentTitle: string, contextString: string): Promise<string> {
    const ai = this.getClient();
    const model = this.getModelName();

    const prompt = `${this.getSystemInstruction()}

You are analyzing the document: "${documentTitle}".

${contextString}

Provide a comprehensive, highly structured research briefing for this document with the following sections:

## 1. Executive Summary
(A concise, high-level summary of the document's primary thesis and scope in 2-3 paragraphs)

## 2. Key Findings & Insights
(Detailed bullet points with exact citations [[Doc: ${documentTitle}, Page: ...]] for each critical finding)

## 3. Core Terminology & Definitions
(Any key technical or domain terms defined in the document with explanations)

## 4. Key Statistics, Data & Metrics
(A Markdown table of key numbers, dates, benchmarks, or metrics stated in the text)

## 5. Strategic Conclusions & Recommendations
(The overarching conclusions and practical takeaways)`;

    const res = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return res.text || 'Unable to generate summary.';
  }

  /**
   * Compare multiple documents side-by-side
   */
  public static async generateDocumentComparison(
    docTitles: string[],
    contextString: string
  ): Promise<string> {
    const ai = this.getClient();
    const model = this.getModelName();

    const prompt = `${this.getSystemInstruction()}

You are conducting a comparative research analysis between the following documents:
${docTitles.map(t => `- "${t}"`).join('\n')}

${contextString}

Please produce a comprehensive comparative analysis with:

## 1. Comparative Overview
(High-level scope and purpose of each document)

## 2. Shared Themes & Agreements
(Where the documents align, citing both)

## 3. Key Contrasts & Discrepancies
(Where the documents differ in assumptions, numbers, conclusions, or methodology)

## 4. Side-by-Side Comparison Matrix
(A Markdown table comparing core attributes, metrics, findings, and dates)

## 5. Synthesis & Integrated Conclusion
(Overall takeaway from analyzing both sources together)`;

    const res = await ai.models.generateContent({
      model,
      contents: prompt,
    });

    return res.text || 'Unable to generate comparison.';
  }
}
