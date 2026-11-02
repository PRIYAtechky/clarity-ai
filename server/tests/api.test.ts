import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/index.js';

describe('Server API Endpoints', () => {
  it('GET /api/health should return 200 with system diagnostics', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.name).toBe('Clarity AI Server');
    expect(res.body.gemini.configured).toBe(true);
    expect(res.body.gemini.model).toBeDefined();
    expect(res.body.port).toBeDefined();
  });

  it('GET /api/lan/info should return network interface and firewall guidance', async () => {
    const res = await request(app).get('/api/lan/info');

    expect(res.status).toBe(200);
    expect(res.body.primaryIp).toBeDefined();
    expect(res.body.localhostUrl).toContain('5173');
    expect(res.body.firewallGuidance).toBeDefined();
    expect(res.body.firewallGuidance.powershellCommand).toContain('New-NetFirewallRule');
  });

  it('POST & GET /api/conversations lifecycle', async () => {
    // 1. Create conversation
    const createRes = await request(app)
      .post('/api/conversations')
      .send({ title: 'Integration Test Research' });

    expect(createRes.status).toBe(201);
    expect(createRes.body.conversation.title).toBe('Integration Test Research');
    const convId = createRes.body.conversation.id;

    // 2. Fetch by ID
    const getRes = await request(app).get(`/api/conversations/${convId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.conversation.id).toBe(convId);

    // 3. Rename
    const patchRes = await request(app)
      .patch(`/api/conversations/${convId}`)
      .send({ title: 'Updated Test Title' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.conversation.title).toBe('Updated Test Title');

    // 4. Delete
    const delRes = await request(app).delete(`/api/conversations/${convId}`);
    expect(delRes.status).toBe(200);

    // 5. Confirm 404
    const notFoundRes = await request(app).get(`/api/conversations/${convId}`);
    expect(notFoundRes.status).toBe(404);
  });
});
