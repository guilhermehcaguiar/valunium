const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFile, readdir, stat } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const { createApplication } = require('../../dist/application');
const { readEnvironment } = require('../../dist/config/environment');
const { Database } = require('../../dist/core/database');
const { MailDelivery } = require('../../dist/core/mail');
let app, base, db;
const password = 'Synthetic password 02!';
const newer = 'New synthetic password 03!';
const origin = 'http://localhost:3000';
function client(cookie = '') {
  return {
    cookie, token: '',
    async request(path, method = 'GET', body, extra = {}) {
      const headers = { Origin: origin, 'Content-Type': 'application/json', ...extra };
      if (this.cookie) headers.Cookie = this.cookie;
      if (method !== 'GET' && this.token && !Object.hasOwn(extra, 'X-CSRF-Token')) headers['X-CSRF-Token'] = this.token;
      const res = await fetch(base + '/api/v1/' + path, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      for (const value of res.headers.getSetCookie()) if (value.startsWith('valunium.sid=')) this.cookie = value.split(';')[0];
      const json = await res.json(); return { status: res.status, body: json, res };
    },
    async csrf() { const result = await this.request('auth/csrf'); assert.equal(result.status, 200); this.token = result.body.data.csrfToken; },
    async login(email, pass = password) { await this.csrf(); const result = await this.request('auth/login', 'POST', { email, password: pass }); if (result.status === 200) await this.csrf(); return result; },
  };
}
const a = client(), b = client();
let aId, portfolioId;
before(async () => {
  assert.match(process.env.INTEGRATION_DATABASE_URL ?? '', /valunium_stage02_disposable/);
  assert.equal(process.env.DATABASE_URL, process.env.INTEGRATION_DATABASE_URL);
  app = await createApplication(readEnvironment(process.env), false);
  await app.listen(0, '127.0.0.1'); base = await app.getUrl(); db = app.get(Database).client;
});
after(async () => { await app?.close(); });
test('anonymous clients cannot read profile or portfolios', async () => {
  for (const path of ['auth/me', 'users/me', 'portfolios']) assert.equal((await client().request(path)).status, 401);
});
test('CSRF requires both a session token and an explicitly trusted origin', async () => {
  const c = client();
  assert.equal((await c.request('auth/register', 'POST', { email: 'csrf@example.test', name: 'Synthetic', password })).status, 403);
  await c.csrf();
  assert.equal((await c.request('auth/register', 'POST', { email: 'csrf@example.test', name: 'Synthetic', password }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await c.request('auth/register', 'POST', { email: 'csrf@example.test', name: 'Synthetic', password }, { 'X-CSRF-Token': '0'.repeat(64) })).status, 403);
  const cookie = (await c.request('auth/csrf')).res.headers.getSetCookie().join(';');
  assert.equal(await db.user.count(), 0); assert.equal(cookie.includes('Synthetic'), false);
});
test('registration normalizes email; duplicate response is indistinguishable and never overwrites the account', async () => {
  await a.csrf(); await b.csrf();
  const first = await a.request('auth/register', 'POST', { name: '  Synthetic A  ', email: ' A@EXAMPLE.TEST ', password });
  const duplicate = await a.request('auth/register', 'POST', { name: 'Overwrite attempt', email: 'a@example.test', password: newer });
  assert.equal(first.status, 202); assert.equal(duplicate.status, 202); assert.deepEqual(first.body, duplicate.body);
  assert.equal((await b.request('auth/register', 'POST', { name: 'Synthetic B', email: 'b@example.test', password })).status, 202);
  const stored = await db.user.findUnique({ where: { email: 'a@example.test' } });
  aId = stored.id; assert.equal(stored.name, 'Synthetic A'); assert.match(stored.passwordHash, /^\$argon2id\$/); assert.ok(!JSON.stringify(first.body).includes('passwordHash'));
});
test('login rejects bad credentials uniformly, regenerates the session and sets HttpOnly SameSite cookies', async () => {
  const invalid = await a.login('a@example.test', 'Wrong synthetic password');
  const nonexistent = await a.login('absent@example.test', 'Wrong synthetic password');
  assert.equal(invalid.status, 401); assert.equal(nonexistent.status, 401); assert.deepEqual(invalid.body.error, nonexistent.body.error);
  const oldCookie = a.cookie;
  const login = await a.login('A@example.test'); assert.equal(login.status, 200); assert.notEqual(a.cookie, oldCookie);
  const header = login.res.headers.getSetCookie().join(';');
  assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=Lax/i); assert.match(header, /Expires=/i);
  assert.deepEqual(Object.keys(login.body.data).sort(), ['email', 'id', 'locale', 'name', 'timeZone']);
  assert.equal((await b.login('b@example.test')).status, 200);
});
test('two real users create/list/edit their own portfolios and cannot inject an ownerId', async () => {
  const createA = await a.request('portfolios', 'POST', { name: 'Carteira A', description: 'Synthetic A', baseCurrency: 'BRL' });
  const createB = await b.request('portfolios', 'POST', { name: 'Carteira B' });
  assert.equal(createA.status, 201); assert.equal(createB.status, 201); portfolioId = createA.body.data.id;
  assert.equal(createA.body.data.isPrimary, true); assert.equal(createB.body.data.isPrimary, true);
  assert.equal((await a.request('portfolios')).body.data.length, 1); assert.equal((await b.request('portfolios')).body.data.length, 1);
  assert.equal((await a.request('portfolios/' + portfolioId)).body.data.name, 'Carteira A');
  assert.equal((await a.request('portfolios/' + portfolioId, 'PATCH', { name: 'Carteira A editada', description: 'Updated' })).status, 200);
  assert.equal((await b.request('portfolios', 'POST', { name: 'Injected', ownerId: aId })).status, 400);
  assert.equal((await b.request('portfolios', 'POST', { name: 'Invalid currency', baseCurrency: 'USD' })).status, 400);
  assert.equal((await a.request('portfolios/' + portfolioId, 'PATCH', { name: null })).status, 400);
});
test('cross-user detail, update, archive, restore and primary operations all return 404', async () => {
  assert.equal((await b.request('portfolios/' + portfolioId)).status, 404);
  assert.equal((await b.request('portfolios/' + portfolioId, 'PATCH', { name: 'ATTACK' })).status, 404);
  for (const action of ['archive', 'restore', 'primary']) assert.equal((await b.request(`portfolios/${portfolioId}/${action}`, 'POST')).status, 404);
  const record = await db.portfolio.findUnique({ where: { id: portfolioId } });
  assert.equal(record.name, 'Carteira A editada'); assert.equal(record.archivedAt, null); assert.equal(record.ownerId, aId);
});
test('primary selection, archival replacement, reactivation and concurrent primary changes preserve database invariants', async () => {
  const second = (await a.request('portfolios', 'POST', { name: 'Segunda A' })).body.data;
  assert.equal(second.isPrimary, false);
  assert.equal((await a.request(`portfolios/${second.id}/primary`, 'POST')).body.data.isPrimary, true);
  assert.equal((await a.request(`portfolios/${second.id}/archive`, 'POST')).body.data.isPrimary, false);
  assert.equal((await a.request('portfolios/' + portfolioId)).body.data.isPrimary, true);
  assert.equal((await a.request(`portfolios/${second.id}/primary`, 'POST')).status, 400);
  assert.equal((await a.request(`portfolios/${second.id}/restore`, 'POST')).body.data.archivedAt, null);
  const both = await Promise.all([a.request(`portfolios/${second.id}/primary`, 'POST'), a.request(`portfolios/${portfolioId}/primary`, 'POST')]);
  assert.ok(both.every(x => x.status === 200));
  assert.equal(await db.portfolio.count({ where: { ownerId: aId, isPrimary: true } }), 1);
  await a.request(`portfolios/${second.id}/archive`, 'POST'); await a.request(`portfolios/${portfolioId}/archive`, 'POST');
  assert.equal(await db.portfolio.count({ where: { ownerId: aId, isPrimary: true } }), 0);
  assert.equal((await a.request(`portfolios/${portfolioId}/restore`, 'POST')).body.data.isPrimary, true);
});
test('profile changes affect only the current user and reject protected fields', async () => {
  assert.equal((await a.request('users/me', 'PATCH', { name: 'A updated', locale: 'en-US', timeZone: 'UTC' })).status, 200);
  assert.equal((await b.request('users/me')).body.data.name, 'Synthetic B');
  assert.equal((await a.request('users/me', 'PATCH', { userId: 'other', passwordHash: 'ATTACK' })).status, 400);
});
test('logout destroys the stored session; replay of the old cookie fails', async () => {
  const replay = client(b.cookie);
  assert.equal((await b.request('auth/logout', 'POST')).status, 200);
  assert.equal((await replay.request('auth/me')).status, 401);
});
test('expired and version-invalidated sessions cannot read protected resources', async () => {
  assert.equal((await b.login('b@example.test')).status, 200);
  const sid = decodeURIComponent(b.cookie.split('=').slice(1).join('=')).slice(2).split('.')[0];
  const stored = await db.session.findUniqueOrThrow({ where: { sid } });
  const owner = await db.user.findUniqueOrThrow({ where: { email: 'b@example.test' } });
  assert.equal(stored.sess.userId, owner.id);
  await db.session.update({ where: { sid }, data: { expire: new Date(Date.now() - 1000) } });
  const expiry = await db.$queryRaw`SELECT expire <= now() AS expired, EXTRACT(EPOCH FROM expire - now())::text AS delta FROM \"Session\" WHERE sid = ${sid}`;
  assert.equal(expiry[0].expired, true);
  assert.equal((await b.request('portfolios')).status, 401);
  assert.equal((await b.login('b@example.test')).status, 200);
  await db.user.update({ where: { email: 'b@example.test' }, data: { authVersion: { increment: 1 } } });
  assert.equal((await b.request('auth/me')).status, 401);
});
test('password change checks the current password and revokes every previous session', async () => {
  const secondSession = client(); assert.equal((await secondSession.login('a@example.test')).status, 200);
  assert.equal((await a.request('auth/change-password', 'POST', { currentPassword: 'Wrong synthetic password', password: newer })).status, 401);
  assert.equal((await a.request('auth/change-password', 'POST', { currentPassword: password, password: newer })).status, 200);
  assert.equal((await secondSession.request('auth/me')).status, 401);
  assert.equal((await a.login('a@example.test', password)).status, 401);
  assert.equal((await a.login('a@example.test', newer)).status, 200);
});
async function latestRecovery(email) {
  await app.get(MailDelivery).drain();
  const dir = process.env.MAIL_OUTBOX_DIR;
  const entries = await Promise.all((await readdir(dir)).map(async name => ({ name, data: JSON.parse(await readFile(dir + '/' + name, 'utf8')), info: await stat(dir + '/' + name) })));
  const mail = entries.filter(x => x.data.to === email).sort((x, y) => y.info.mtimeMs - x.info.mtimeMs)[0];
  assert.equal((await stat(dir)).mode & 0o077, 0); assert.equal(mail.info.mode & 0o077, 0);
  assert.ok(!new URL(mail.data.resetUrl).search);
  return new URLSearchParams(new URL(mail.data.resetUrl).hash.slice(1)).get('token');
}
test('recovery is generic; only hashed, expiring verifiers are stored; expired tokens fail', async () => {
  const existent = await b.request('auth/forgot-password', 'POST', { email: 'b@example.test' });
  const absent = await b.request('auth/forgot-password', 'POST', { email: 'missing@example.test' });
  assert.equal(existent.status, 202); assert.deepEqual(existent.body, absent.body);
  const token = await latestRecovery('b@example.test');
  const stored = await db.passwordReset.findFirst();
  assert.equal(stored.tokenHash, createHash('sha256').update(token).digest('hex')); assert.notEqual(stored.tokenHash, token);
  await db.passwordReset.update({ where: { id: stored.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await b.request('auth/reset-password', 'POST', { token, password: newer })).status, 400);
});
test('valid reset is atomic, single-use, invalidates existing sessions and accepts the new password', async () => {
  const staleSession = client(); assert.equal((await staleSession.login('b@example.test')).status, 200);
  await b.csrf(); await b.request('auth/forgot-password', 'POST', { email: 'b@example.test' });
  const token = await latestRecovery('b@example.test');
  const attempts = await Promise.all([b.request('auth/reset-password', 'POST', { token, password: newer }), b.request('auth/reset-password', 'POST', { token, password: newer })]);
  assert.deepEqual(attempts.map(x => x.status).sort(), [200, 400]);
  assert.equal((await staleSession.request('auth/me')).status, 401);
  assert.equal((await b.request('auth/reset-password', 'POST', { token, password: newer })).status, 400);
  assert.equal((await b.login('b@example.test', newer)).status, 200);
});
test('sensitive endpoints throttle repeated requests with HTTP 429', async () => {
  const statuses = [];
  for (let i = 0; i < 21; i++) statuses.push((await b.request('auth/forgot-password', 'POST', { email: 'rate-limit@example.test' })).status);
  assert.ok(statuses.includes(429));
});
