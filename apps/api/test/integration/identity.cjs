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
test('financial ledger: exact scenarios, rollback, audit, idempotency, concurrency, filters and tenant isolation',async()=>{
 const {randomUUID}=require('node:crypto');
 const asset=await a.request('assets','POST',{ticker:'SYN03',name:'Synthetic instrument',assetClass:'STOCK',source:'Synthetic test fixture'});assert.equal(asset.status,201);const assetId=asset.body.data.id;
 assert.equal((await b.request('assets/'+assetId,'PATCH',{ticker:'SYN04',name:'Attack',active:true,source:'Synthetic'})).status,404);
 assert.equal((await a.request('assets','POST',{ticker:'SYN03',name:'Duplicate',assetClass:'ETF',source:'Synthetic'})).status,409);
 const p=(await a.request('portfolios','POST',{name:'Financial synthetic'})).body.data.id,base='portfolios/'+p;
 const input=(kind,q,price,date)=>({assetId,kind,date,quantity:q,unitPrice:price,fees:'0',gross:'0',withholding:'0',note:'Synthetic',requestKey:randomUUID()});
 const first=input('BUY','10','17','2026-01-01');const firstResult=await a.request(base+'/transactions','POST',first);assert.equal(firstResult.status,201);assert.equal(firstResult.body.data.gross,'170.000000000000');
 assert.equal((await a.request(base+'/transactions','POST',first)).body.data.id,firstResult.body.data.id);
 assert.equal((await a.request(base+'/transactions','POST',{...first,quantity:'11'})).status,409);
 await a.request(base+'/transactions','POST',input('BUY','5','19','2026-01-02'));
 const sale=await a.request(base+'/transactions','POST',input('SELL','3','20','2026-01-03'));assert.equal(sale.status,201);
 const pos=()=>a.request(base+'/positions');let s=(await pos()).body.data.items[0];assert.equal(s.cost,'212.000000000000');assert.equal(s.realized,'7.000000000000');assert.equal(s.unrealized,null);
 const invalid=await a.request(base+'/transactions/'+firstResult.body.data.id+'/cancel','POST',{version:1,reason:'Would invalidate future sale'});assert.equal(invalid.status,200);
 assert.equal((await pos()).body.data.items[0].quantity,'2.000000000000');
 const second=(await a.request(base+'/transactions')).body.data.items.find(x=>x.kind==='BUY');
 assert.equal((await a.request(base+'/transactions/'+second.id,'PATCH',{...input('BUY','1','19','2026-01-02'),requestKey:second.requestKey,version:1,reason:'Invalid retroactive correction'})).status,400);
 assert.equal((await a.request(base+'/transactions/'+second.id+'/cancel','POST',{version:1,reason:'Invalid negative position'})).status,400);
 assert.equal((await pos()).body.data.items[0].quantity,'2.000000000000');
 await a.request(base+'/transactions','POST',input('BUY','10','10','2025-12-31'));assert.equal((await pos()).body.data.items[0].quantity,'12.000000000000');
 assert.equal((await a.request(base+'/transactions/'+second.id,'PATCH',{...input('BUY','5','21','2026-01-02'),requestKey:second.requestKey,version:1,reason:'Correct acquisition price'})).status,200);
 assert.equal((await pos()).body.data.items[0].cost,'164.000000000000');assert.equal((await pos()).body.data.items[0].realized,'19.000000000000');
 const income={...input('DIVIDEND','0','0','2026-01-04'),gross:'10',withholding:'1'};const inc=await a.request(base+'/income','POST',income);assert.equal(inc.status,201);assert.equal((await pos()).body.data.items[0].income,'9.000000000000');
 assert.equal((await a.request(base+'/income/'+inc.body.data.id,'PATCH',{...income,gross:'20',version:1,reason:'Correct receipt'})).status,200);assert.equal((await pos()).body.data.items[0].income,'19.000000000000');
 for(const route of ['positions','transactions','income'])assert.equal((await b.request(base+'/'+route)).status,404);
 assert.equal((await b.request(base+'/transactions','POST',input('BUY','1','1','2026-01-01'))).status,404);
 assert.equal((await b.request(base+'/income/'+inc.body.data.id+'/cancel','POST',{version:2,reason:'Attack'})).status,404);
 const audit=await a.request(base+'/transactions/'+firstResult.body.data.id+'/revisions');assert.equal(audit.body.data.length,2);
 assert.equal((await a.request(base+'/transactions?kind=SELL&from=2026-01-03')).body.data.items.length,1);
 const competing=await Promise.all([a.request(base+'/transactions','POST',input('SELL','10','20','2026-01-05')),a.request(base+'/transactions','POST',input('SELL','10','20','2026-01-05'))]);assert.deepEqual(competing.map(x=>x.status).sort(),[201,400]);
 assert.equal((await a.request(base+'/positions/limitation','POST',{incomplete:true,reason:'Unsupported split in external history'})).status,201);assert.equal((await pos()).body.data.status,'INCOMPLETE_HISTORY');
 assert.equal((await a.request(base+'/positions/limitation','POST',{incomplete:false,reason:'History reconciled'})).status,201);
 for(let i=0;i<26;i++)assert.equal((await a.request(base+'/income','POST',{...income,requestKey:randomUUID()})).status,201);
 const page=await a.request(base+'/income?page=1');assert.equal(page.body.data.items.length,25);assert.equal(page.body.data.nextPage,2);
 const row=await db.ledgerRevision.findFirst({where:{portfolioId:p}});await assert.rejects(()=>db.ledgerRevision.delete({where:{id:row.id}}));
 await assert.rejects(()=>db.ledgerEvent.create({data:{portfolioId:p,assetId:randomUUID(),kind:'BUY',date:new Date('2026-01-01'),quantity:'1',unitPrice:'1',fees:'0',gross:'0',withholding:'0',requestKey:randomUUID(),fingerprint:'synthetic'}}));
});
test('dashboard reads only owned histories in a consistent snapshot, filters and incomplete states',async()=>{
 assert.equal((await client().request('dashboard')).status,401);
 const own=(await a.request('portfolios')).body.data;const target=own.find(p=>p.name==='Financial synthetic');
 const scoped=await a.request('dashboard?portfolioId='+target.id+'&from=2026-01-01&to=2026-01-04');assert.equal(scoped.status,200);assert.equal(scoped.body.data.groups[0].cost,'164.000000000000');assert.equal(scoped.body.data.groups[0].realized,'19.000000000000');assert.equal(scoped.body.data.groups[0].income,'253.000000000000'); // corrected receipt 19 + 26 receipts of 9
 assert.equal((await b.request('dashboard?portfolioId='+target.id)).status,404);
 const theirs=(await b.request('dashboard')).body.data;assert.ok(!theirs.portfolios.some(p=>p.id===target.id));assert.ok(!JSON.stringify(theirs).includes('Financial synthetic'));
 assert.equal((await a.request('dashboard?from=2026-02-30')).status,400);
 await a.request('portfolios/'+target.id+'/positions/limitation','POST',{incomplete:true,reason:'Test incomplete dashboard'});
 const incomplete=(await a.request('dashboard')).body.data;assert.equal(incomplete.status,'INCOMPLETE_HISTORY');assert.equal(incomplete.groups[0].cost,null);assert.deepEqual(incomplete.groups[0].positions,[]);
 await a.request('portfolios/'+target.id+'/positions/limitation','POST',{incomplete:false,reason:'Test reconciliation'});
});
