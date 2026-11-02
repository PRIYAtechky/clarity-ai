import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { ParserService } from '../src/services/parser.service.js';

describe('ParserService', () => {
  const tmpDir = path.resolve(process.cwd(), './data/test-tmp');
  const txtPath = path.join(tmpDir, 'test-doc.txt');
  const mdPath = path.join(tmpDir, 'test-research.md');
  const emptyPath = path.join(tmpDir, 'empty.txt');

  beforeAll(async () => {
    await fs.mkdir(tmpDir, { recursive: true });

    // Sample Markdown
    await fs.writeFile(
      mdPath,
      `# Clarity AI System Overview\n\nClarity AI provides verified document question answering.\n\n## Core Capabilities\n- PDF parsing\n- Verifiable page citations\n- Multi-document comparison\n\n## Performance\nAchieves sub-second local retrieval.`,
      'utf-8'
    );

    // Sample Plain Text
    await fs.writeFile(
      txtPath,
      `Clinical trial data summary.\nTotal participants: 1,420.\nEfficacy rate: 91.4%.\nAdverse events reported in 2.1% of cohort.`,
      'utf-8'
    );

    // Empty file
    await fs.writeFile(emptyPath, '', 'utf-8');
  });

  afterAll(async () => {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  });

  it('should parse markdown files into sections with heading metadata', async () => {
    const res = await ParserService.parseDocument(mdPath, 'test-research.md', 'text/markdown');
    expect(res.pageCount).toBeGreaterThanOrEqual(1);
    expect(res.sections.length).toBeGreaterThanOrEqual(2);
    expect(res.sections.some(s => s.sectionTitle?.includes('Core Capabilities'))).toBe(true);
    expect(res.fullText).toContain('Clarity AI System Overview');
  });

  it('should parse plain text files accurately', async () => {
    const res = await ParserService.parseDocument(txtPath, 'test-doc.txt', 'text/plain');
    expect(res.pageCount).toBeGreaterThanOrEqual(1);
    expect(res.fullText).toContain('Total participants: 1,420');
  });

  it('should reject empty files with a descriptive error', async () => {
    await expect(
      ParserService.parseDocument(emptyPath, 'empty.txt', 'text/plain')
    ).rejects.toThrow('is empty (0 bytes)');
  });

  it('should reject unsupported file extensions', async () => {
    const unsupportedPath = path.join(tmpDir, 'invalid.exe');
    await fs.writeFile(unsupportedPath, 'dummy binary content');
    await expect(
      ParserService.parseDocument(unsupportedPath, 'invalid.exe', 'application/x-msdownload')
    ).rejects.toThrow('Unsupported file format');
  });
});
