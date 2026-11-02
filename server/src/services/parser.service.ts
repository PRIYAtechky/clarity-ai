import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export interface ParsedSection {
  pageNumber?: number;
  sectionTitle?: string;
  text: string;
}

export interface ParseResult {
  fullText: string;
  pageCount: number;
  sections: ParsedSection[];
}

export class ParserService {
  /**
   * Parse uploaded document according to file extension and MIME type
   */
  public static async parseDocument(filePath: string, originalFilename: string, mimeType: string): Promise<ParseResult> {
    const ext = path.extname(originalFilename).toLowerCase();

    // Check file exists and is not empty
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      throw new Error(`File "${originalFilename}" is empty (0 bytes).`);
    }

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      return this.parsePdf(filePath, originalFilename);
    } else if (
      ext === '.docx' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return this.parseDocx(filePath, originalFilename);
    } else if (ext === '.txt' || ext === '.md' || mimeType.startsWith('text/')) {
      return this.parseTextOrMarkdown(filePath, originalFilename);
    } else {
      throw new Error(
        `Unsupported file format "${ext}". Supported formats are PDF, DOCX, TXT, and MD.`
      );
    }
  }

  private static async parsePdf(filePath: string, filename: string): Promise<ParseResult> {
    const dataBuffer = await fs.readFile(filePath);

    const pages: ParsedSection[] = [];
    let pageCounter = 0;

    // Custom pagerender to capture exact page numbers
    const pagerender = async (pageData: any) => {
      pageCounter++;
      const textContent = await pageData.getTextContent();
      let lastY: number | null = null;
      let text = '';

      for (const item of textContent.items) {
        if (lastY === item.transform[5] || !lastY) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }

      pages.push({
        pageNumber: pageCounter,
        sectionTitle: `Page ${pageCounter}`,
        text: text.trim(),
      });

      return text;
    };

    try {
      const data = await pdf(dataBuffer, { pagerender });
      const fullText = (data.text || '').trim();
      const pageCount = data.numpages || pages.length || 1;

      if (!fullText && pages.every(p => !p.text)) {
        throw new Error(
          `Document "${filename}" was parsed, but contains no extractable text (it may be a scanned image or protected).`
        );
      }

      // If pagerender didn't populate for some reason, create a single section
      const sections =
        pages.length > 0
          ? pages.filter(p => p.text.length > 0)
          : [{ pageNumber: 1, sectionTitle: 'Page 1', text: fullText }];

      return {
        fullText,
        pageCount,
        sections,
      };
    } catch (err: any) {
      if (err.message && err.message.includes('extractable text')) {
        throw err;
      }
      throw new Error(`Failed to parse PDF "${filename}": ${err.message || 'Corrupt or encrypted PDF file.'}`);
    }
  }

  private static async parseDocx(filePath: string, filename: string): Promise<ParseResult> {
    try {
      const result = await mammoth.extractRawText({ path: filePath });
      const fullText = (result.value || '').trim();

      if (!fullText) {
        throw new Error(`Document "${filename}" contains no extractable text.`);
      }

      // Break into sections by headings or double newlines
      const rawParagraphs = fullText.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
      const sections: ParsedSection[] = [];
      let currentSectionTitle = 'Introduction';
      let currentSectionText: string[] = [];
      let sectionIndex = 1;

      for (const para of rawParagraphs) {
        // If short line looks like a title/heading
        if (para.length < 80 && !para.endsWith('.') && /^[A-Z0-9]/.test(para)) {
          if (currentSectionText.length > 0) {
            sections.push({
              pageNumber: sectionIndex,
              sectionTitle: currentSectionTitle,
              text: currentSectionText.join('\n\n'),
            });
            sectionIndex++;
            currentSectionText = [];
          }
          currentSectionTitle = para;
        } else {
          currentSectionText.push(para);
        }
      }

      if (currentSectionText.length > 0) {
        sections.push({
          pageNumber: sectionIndex,
          sectionTitle: currentSectionTitle,
          text: currentSectionText.join('\n\n'),
        });
      }

      const estimatedPages = Math.max(1, Math.ceil(fullText.split(/\s+/).length / 400));

      return {
        fullText,
        pageCount: estimatedPages,
        sections: sections.length > 0 ? sections : [{ pageNumber: 1, sectionTitle: 'Document Content', text: fullText }],
      };
    } catch (err: any) {
      throw new Error(`Failed to parse Word document "${filename}": ${err.message}`);
    }
  }

  private static async parseTextOrMarkdown(filePath: string, filename: string): Promise<ParseResult> {
    try {
      const fullText = await fs.readFile(filePath, 'utf-8');
      const trimmed = fullText.trim();

      if (!trimmed) {
        throw new Error(`Text file "${filename}" is empty.`);
      }

      const lines = trimmed.split('\n');
      const sections: ParsedSection[] = [];
      let currentTitle = 'Overview';
      let currentBuffer: string[] = [];
      let approxPage = 1;
      let lineCounter = 0;

      for (const line of lines) {
        lineCounter++;
        const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
        if (headerMatch) {
          if (currentBuffer.length > 0) {
            sections.push({
              pageNumber: approxPage,
              sectionTitle: currentTitle,
              text: currentBuffer.join('\n').trim(),
            });
            currentBuffer = [];
            approxPage = Math.max(approxPage + 1, Math.ceil(lineCounter / 50));
          }
          currentTitle = headerMatch[1].trim();
        } else {
          currentBuffer.push(line);
        }
      }

      if (currentBuffer.length > 0) {
        sections.push({
          pageNumber: approxPage,
          sectionTitle: currentTitle,
          text: currentBuffer.join('\n').trim(),
        });
      }

      const totalWords = trimmed.split(/\s+/).length;
      const pageCount = Math.max(1, Math.ceil(totalWords / 400));

      return {
        fullText: trimmed,
        pageCount,
        sections: sections.length > 0 ? sections : [{ pageNumber: 1, sectionTitle: 'Document Text', text: trimmed }],
      };
    } catch (err: any) {
      throw new Error(`Failed to parse text file "${filename}": ${err.message}`);
    }
  }
}
