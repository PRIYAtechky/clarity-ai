import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { app } from '../src/index.js';
import { config } from '../src/config.js';

async function runLiveE2ETest() {
  console.log('\n======================================================');
  console.log('   CLARITY AI — COMPREHENSIVE LIVE WORKFLOW TEST');
  console.log('======================================================\n');

  const tmpDir = path.resolve(process.cwd(), './data/e2e-test-docs');
  await fs.mkdir(tmpDir, { recursive: true });

  const doc1Path = path.join(tmpDir, 'Project_Helios_Report.md');
  const doc2Path = path.join(tmpDir, 'Project_Valkyrie_Report.md');
  const invalidPath = path.join(tmpDir, 'corrupt.xyz');

  // Create real test documents
  await fs.writeFile(
    doc1Path,
    `# Project Helios: Autonomous Energy Harvesting
## Executive Summary
Project Helios is an advanced photovoltaic research initiative initiated in Q1 2024.
The primary breakthrough is a triple-junction perovskite cell achieving 34.2% laboratory power conversion efficiency.

## Financial Performance & Budget
Total capital expenditure was $14.5 million USD, representing a 12% savings under the original $16.5M budget.
Operational expenditures are projected at $1.2 million annually.

## Technical Specifications & Architecture
- Operating temperature range: -40°C to +85°C.
- Degradation rate: 0.35% per 1,000 operational hours.
- Peak power output: 450 Watts per square meter.

## Conclusions & Recommendations
Project Helios is recommended for Phase II industrial deployment in arid high-irradiance zones.`,
    'utf-8'
  );

  await fs.writeFile(
    doc2Path,
    `# Project Valkyrie: Concentrated Solar Thermal Initiative
## Executive Summary
Project Valkyrie investigates concentrated solar thermal power (CSP) using molten salt storage tanks.
Tested in Q3 2024, the plant achieved 28.6% thermal-to-electric conversion efficiency.

## Capital and Operational Costs
Total capital expenditure reached $28.0 million USD, which was 8% over the allocated budget.
Operational expenditures are $2.8 million annually due to salt pump maintenance.

## Technical Comparison Points
- Operating temperature range: 250°C to 565°C.
- Energy storage capability: 14 hours of continuous nighttime dispatch.
- Efficiency: 28.6% efficiency.

## Strategic Conclusion
Valkyrie offers superior grid stabilization over photovoltaics despite higher upfront capital requirements.`,
    'utf-8'
  );

  await fs.writeFile(invalidPath, 'This file has an unsupported extension.', 'utf-8');

  try {
    // 1. Health check & security validation
    console.log('[Step 1] Testing Health Endpoint & Secret Isolation...');
    const healthRes = await request(app).get('/api/health');
    if (healthRes.status !== 200 || !healthRes.body.gemini.configured) {
      throw new Error(`Health check failed: ${JSON.stringify(healthRes.body)}`);
    }
    // Verify API key is NOT leaked anywhere in health response
    const rawHealthStr = JSON.stringify(healthRes.body);
    if (config.geminiApiKey && rawHealthStr.includes(config.geminiApiKey)) {
      throw new Error('SECURITY VIOLATION: Gemini API key leaked in health check response!');
    }
    console.log('✓ Health check passed. Model:', healthRes.body.gemini.model, '| API key securely isolated.');

    // 2. Create a research conversation
    console.log('\n[Step 2] Creating Research Conversation...');
    const convRes = await request(app)
      .post('/api/conversations')
      .send({ title: 'Solar Energy Comparative Research' });
    const conversationId = convRes.body.conversation.id;
    console.log('✓ Conversation created with ID:', conversationId);

    // 3. Upload Document 1 (Project Helios)
    console.log('\n[Step 3] Uploading & Parsing Document 1 (Helios)...');
    const upload1Res = await request(app)
      .post('/api/documents/upload')
      .field('conversationId', conversationId)
      .attach('file', doc1Path);

    if (upload1Res.status !== 201) {
      throw new Error(`Upload 1 failed: ${JSON.stringify(upload1Res.body)}`);
    }
    const doc1Id = upload1Res.body.document.id;
    console.log('✓ Document 1 parsed & indexed with', upload1Res.body.chunkCount, 'research chunks.');

    // 4. Upload Document 2 (Project Valkyrie)
    console.log('\n[Step 4] Uploading & Parsing Document 2 (Valkyrie)...');
    const upload2Res = await request(app)
      .post('/api/documents/upload')
      .field('conversationId', conversationId)
      .attach('file', doc2Path);

    if (upload2Res.status !== 201) {
      throw new Error(`Upload 2 failed: ${JSON.stringify(upload2Res.body)}`);
    }
    const doc2Id = upload2Res.body.document.id;
    console.log('✓ Document 2 parsed & indexed with', upload2Res.body.chunkCount, 'research chunks.');

    // 5. Ask a question and receive real Gemini response with citations
    console.log('\n[Step 5] Asking Question with Real Gemini AI Generation...');
    const question1 = 'What is the power conversion efficiency and capital expenditure of Project Helios?';
    console.log('Question:', question1);

    const chat1Res = await request(app)
      .post('/api/chat')
      .send({
        conversationId,
        message: question1,
      });

    if (chat1Res.status !== 200) {
      throw new Error(`Chat 1 failed: ${JSON.stringify(chat1Res.body)}`);
    }

    const answer1 = chat1Res.body.assistantMessage.content;
    const citations1 = chat1Res.body.citations;

    console.log('\n--- Gemini AI Response ---');
    console.log(answer1.trim());
    console.log('--------------------------');
    console.log('✓ Citations returned:', citations1.length);
    citations1.forEach((c: any, i: number) => {
      console.log(`  [Citation ${i + 1}] Doc: "${c.documentTitle}" | Page/Section: ${c.pageNumber || c.sectionTitle}`);
    });

    if (!answer1.includes('34.2') && !answer1.includes('14.5')) {
      throw new Error('AI answer did not contain expected factual metrics (34.2% / $14.5M).');
    }

    // 6. Ask a follow-up question using conversation history
    console.log('\n[Step 6] Asking Follow-up Question...');
    const question2 = 'How does that capital cost compare to Project Valkyrie?';
    console.log('Question:', question2);

    const chat2Res = await request(app)
      .post('/api/chat')
      .send({
        conversationId,
        message: question2,
      });

    const answer2 = chat2Res.body.assistantMessage.content;
    console.log('\n--- Gemini AI Follow-up Response ---');
    console.log(answer2.trim());
    console.log('------------------------------------');

    if (!answer2.includes('28') && !answer2.toLowerCase().includes('valkyrie')) {
      throw new Error('Follow-up did not integrate Valkyrie cost details.');
    }
    console.log('✓ Follow-up successfully answered using multi-turn conversation context.');

    // 7. Verify persistence by reopening conversation
    console.log('\n[Step 7] Reopening Conversation from SQLite Database...');
    const reopenRes = await request(app).get(`/api/conversations/${conversationId}`);
    if (reopenRes.status !== 200 || reopenRes.body.messages.length < 4) {
      throw new Error('Failed to retrieve full persisted conversation history from database.');
    }
    console.log('✓ Persisted conversation retrieved. Total messages:', reopenRes.body.messages.length);

    // 8. Test Document Summarization Endpoint
    console.log('\n[Step 8] Testing Document Executive Summary Generation...');
    const sumRes = await request(app).post(`/api/documents/${doc1Id}/summarize`);
    if (sumRes.status !== 200 || !sumRes.body.summary) {
      throw new Error('Summarization failed.');
    }
    console.log('✓ Executive Summary generated successfully (Length:', sumRes.body.summary.length, 'chars).');

    // 9. Test Multi-Document Comparison Endpoint
    console.log('\n[Step 9] Testing Multi-Document Comparative Matrix...');
    const compRes = await request(app)
      .post('/api/documents/compare')
      .send({ documentIds: [doc1Id, doc2Id] });

    if (compRes.status !== 200 || !compRes.body.comparison) {
      throw new Error('Comparison failed.');
    }
    console.log('✓ Multi-Document Comparison generated with', compRes.body.comparedDocuments.length, 'documents.');

    // 10. Test Invalid File Handling & Error State
    console.log('\n[Step 10] Testing Invalid File Format Handling...');
    const invalidUpload = await request(app)
      .post('/api/documents/upload')
      .field('conversationId', conversationId)
      .attach('file', invalidPath);

    if (invalidUpload.status === 200 || invalidUpload.status === 201) {
      throw new Error('Expected invalid file upload to be rejected, but it succeeded!');
    }
    console.log('✓ Unsupported file correctly rejected with error:', invalidUpload.body.error);

    // 11. Security Check: verify API key is never in responses
    const allResponsesStr = JSON.stringify([chat1Res.body, chat2Res.body, sumRes.body, compRes.body]);
    if (config.geminiApiKey && allResponsesStr.includes(config.geminiApiKey)) {
      throw new Error('SECURITY VIOLATION: Gemini API key was exposed in response body!');
    }
    console.log('✓ Security Verified: Gemini API key was never exposed to any client.');

    console.log('\n======================================================');
    console.log('   🎉 ALL 11 E2E WORKFLOW TESTS PASSED PERFECTLY!');
    console.log('======================================================\n');
    process.exit(0);
  } finally {
    // Cleanup temporary test files
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (_) {}
  }
}

runLiveE2ETest().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});
