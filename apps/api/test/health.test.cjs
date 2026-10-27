const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApplication } = require('../dist/application');
const { readEnvironment } = require('../dist/config/environment');
let app;
let base;
before(async () => {
  app = await createApplication(readEnvironment({ NODE_ENV: 'test', CORS_ORIGINS: 'http://localhost:3000' }), false);
  await app.listen(0, '127.0.0.1');
  base = await app.getUrl();
});
after(async () => { await app?.close(); });
test('health is public, versioned and sends security headers', async () => {
  const response = await fetch(`${base}/api/v1/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { data: { status: 'ok', service: 'valunium-api', version: 'v1' } });
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/);
});
test('unknown routes return sanitized errors without reflecting secrets', async () => {
  const response = await fetch(`${base}/api/v1/absent?token=SYNTHETIC_SECRET`);
  const body = await response.json();
  assert.equal(response.status, 404);
  assert.equal(body.error.code, 'HTTP_404');
  assert.equal(body.requestId, response.headers.get('x-request-id'));
  assert.ok(!JSON.stringify(body).includes('SYNTHETIC_SECRET'));
});
test('unversioned routes and write methods are absent', async () => {
  for (const path of ['/health', '/api/health', '/api/v2/health']) {
    assert.equal((await fetch(base + path)).status, 404);
  }
  assert.equal((await fetch(`${base}/api/v1/health`, { method: 'POST' })).status, 404);
});
test('CORS grants only the explicitly configured origin', async () => {
  for (const [origin, expected] of [['http://localhost:3000', 'http://localhost:3000'], ['https://untrusted.example', null]]) {
    const response = await fetch(`${base}/api/v1/health`, { headers: { Origin: origin } });
    assert.equal(response.headers.get('access-control-allow-origin'), expected);
    assert.equal(response.headers.get('access-control-allow-credentials'), null);
  }
});
test('environment fails closed on invalid configuration', () => {
  for (const env of [{PORT:'0'}, {PORT:'1e3'}, {NODE_ENV:'invalid'}, {CORS_ORIGINS:'*'}, {CORS_ORIGINS:'https://user:secret@example.org'}]) {
    assert.throws(() => readEnvironment(env));
  }
  assert.deepEqual(readEnvironment({NODE_ENV:'production'}).corsOrigins, []);
});
test('unexpected errors redact exception messages from responses and logs', () => {
  const { HttpExceptionFilter } = require('../dist/common/http-exception.filter');
  const { Logger } = require('@nestjs/common');
  const logs = [];
  const original = Logger.prototype.error;
  let status;
  let body;
  const response = {
    locals: { requestId: 'synthetic-request-id' },
    status(value) { status = value; return this; },
    json(value) { body = value; },
  };
  try {
    Logger.prototype.error = (value) => logs.push(value);
    new HttpExceptionFilter().catch(new Error('SYNTHETIC_PRIVATE_VALUE'), {
      switchToHttp: () => ({ getResponse: () => response }),
    });
    assert.equal(status, 500);
    assert.equal(body.error.code, 'INTERNAL_ERROR');
    assert.equal(body.requestId, 'synthetic-request-id');
    assert.equal(logs.length, 1);
    assert.ok(!JSON.stringify({ body, logs }).includes('SYNTHETIC_PRIVATE_VALUE'));
  } finally {
    Logger.prototype.error = original;
  }
});
