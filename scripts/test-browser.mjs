import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const { createApplication } = require('../apps/api/dist/application');
const { readEnvironment } = require('../apps/api/dist/config/environment');
const { MailDelivery } = require('../apps/api/dist/core/mail');
assert.match(process.env.INTEGRATION_DATABASE_URL ?? '', /valunium_stage02_disposable/);
assert.equal(process.env.DATABASE_URL, process.env.INTEGRATION_DATABASE_URL);
const origin = 'http://localhost:43102';
const environment = readEnvironment({ ...process.env, NODE_ENV: 'test', WEB_ORIGIN: origin, CORS_ORIGINS: origin });
const app = await createApplication(environment, false);
let web, browser;
const log = openSync(join(process.env.MAIL_OUTBOX_DIR, '..', 'web.log'), 'w', 0o600);
try {
  await app.listen(43103, '127.0.0.1');
  const next = require.resolve('next/dist/bin/next', { paths: [join(process.cwd(), 'apps/web')] });
  web = spawn(process.execPath, [next, 'start', '--hostname', '127.0.0.1', '--port', '43102'], {
    cwd: join(process.cwd(), 'apps/web'), stdio: ['ignore', log, log],
    env: { ...process.env, NODE_ENV: 'production', API_INTERNAL_URL: 'http://127.0.0.1:43103', WEB_ORIGIN: origin },
  });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (web.exitCode !== null) throw new Error('Next runtime exited');
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch { /* starting */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert.ok(ready);
  browser = await chromium.launch({ headless: true });
  const errors = [];
  const a = await browser.newContext(); const b = await browser.newContext();
  const pageA = await a.newPage(); const pageB = await b.newPage();
  for (const page of [pageA, pageB]) page.on('pageerror', failure => errors.push(failure.message));
  const password = 'Browser synthetic password 02!';
  async function register(page, name, email) {
    await page.goto(origin + '/register');
    await page.getByLabel('Nome', { exact: true }).fill(name);
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha (12 a 128 caracteres)', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Se o cadastro pôde' }).waitFor();
  }
  async function login(page, email, pass = password) {
    await page.goto(origin + '/login');
    await page.getByLabel('E-mail', { exact: true }).fill(email);
    await page.getByLabel('Senha (12 a 128 caracteres)', { exact: true }).fill(pass);
    await page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await page.waitForURL('**/dashboard');
    await page.getByRole('heading', { name: 'Visão geral', exact: true }).waitFor();
  }
  async function portfolio(page, name) {
    await page.goto(origin + '/portfolios/new');
    await page.getByLabel('Nome da carteira').fill(name);
    await page.getByLabel('Descrição (opcional)').fill('Dados sintéticos de teste');
    await page.getByRole('button', { name: 'Criar carteira', exact: true }).click();
    await page.waitForURL(/\/portfolios\/[0-9a-f-]{36}$/);
    await page.getByRole('button', { name: 'Salvar alterações' }).waitFor();
    return page.url().split('/').at(-1);
  }
  await pageA.goto(origin + '/dashboard'); await pageA.waitForURL('**/login');
  await register(pageA, 'Browser A', 'browser.a@example.test'); await login(pageA, 'browser.a@example.test');
  await pageA.getByText('Browser A', { exact: true }).waitFor();
  await pageA.getByText('Seu acompanhamento começa por uma carteira',{exact:true}).waitFor();
  await pageA.screenshot({path:join(process.env.MAIL_OUTBOX_DIR,'..','dashboard-empty.png'),fullPage:true});
  const idA = await portfolio(pageA, 'Carteira sintética A');
  await pageA.goto(origin + '/assets');
  await pageA.getByLabel('Ticker',{exact:true}).fill('BROWSER03');
  await pageA.getByLabel('Nome do ativo').fill('Synthetic browser asset');
  await pageA.getByLabel('Fonte da identificação (ou declaração manual)').fill('Synthetic test fixture');
  await pageA.getByRole('button',{name:'Cadastrar ativo',exact:true}).click();
  await pageA.getByRole('status').filter({hasText:'Registro salvo'}).waitFor();
  await pageA.goto(origin + '/portfolios/' + idA + '/history');
  async function historical(type,quantity,price,date){
    await pageA.getByLabel('Tipo de registro',{exact:true}).selectOption(type);
    await pageA.getByLabel('Data efetiva').fill(date);
    await pageA.getByLabel('Quantidade',{exact:true}).fill(quantity);
    await pageA.getByLabel('Preço unitário',{exact:true}).fill(price);
    await pageA.getByRole('button',{name:type==='BUY'?'Registrar compra':'Registrar venda',exact:true}).click();
    await pageA.getByRole('status').filter({hasText:'Registro salvo'}).waitFor();
    await pageA.getByRole('status').filter({hasText:'Carregando'}).waitFor({state:'hidden'});
  }
  await historical('BUY','10','17','2026-01-01');
  await historical('BUY','5','19','2026-01-02');
  await historical('SELL','3','20','2026-01-03');
  await pageA.getByText('Custo remanescente: 212,000000000000',{exact:true}).waitFor();
  await pageA.getByText('Resultado realizado: 7,000000000000',{exact:true}).waitFor();
  await pageA.getByLabel('Tipo de registro',{exact:true}).selectOption('DIVIDEND');
  await pageA.getByLabel('Data efetiva').fill('2026-01-04');
  await pageA.getByLabel('Valor bruto recebido').fill('10');
  await pageA.getByRole('button',{name:'Registrar provento recebido',exact:true}).click();
  await pageA.getByText('Proventos líquidos: 10,000000000000',{exact:true}).waitFor();
  await pageA.goto(origin+'/dashboard');
  await pageA.getByText('R$ 212,00',{exact:true}).waitFor();
  await pageA.getByRole('heading',{name:'Distribuição do custo por classe',exact:true}).waitFor();
  await pageA.locator('.chart-canvas svg').first().waitFor();
  const requestCount=[];
  pageA.on('request',request=>{if(request.url().includes('/api/dashboard'))requestCount.push(request.url());});
  for(const width of [320,375,768,1024,1440]){
    await pageA.setViewportSize({width,height:1000});
    await pageA.waitForTimeout(350);
    assert.ok(await pageA.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'Unintended horizontal overflow at '+width);
    await pageA.screenshot({path:join(process.env.MAIL_OUTBOX_DIR,'..',`dashboard-${width}.png`),fullPage:true});
    await pageA.screenshot({path:join(process.env.MAIL_OUTBOX_DIR,'..',`dashboard-${width}-top.png`)});
  }
  assert.equal(requestCount.length,0,'Resizing must not fetch accounting data again');
  await pageA.getByText('Ver dados exatos — Distribuição do custo por classe',{exact:true}).click();
  await pageA.getByRole('columnheader',{name:'Custo remanescente',exact:true}).first().waitFor();
  await pageA.getByLabel('Data inicial',{exact:true}).fill('2026-01-01');
  await pageA.getByLabel('Data final',{exact:true}).fill('2026-01-02');
  await pageA.getByRole('button',{name:'Aplicar período',exact:true}).click();
  await pageA.getByText('R$ 265,00',{exact:true}).waitFor();
  await pageA.route('**/api/dashboard?*',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{message:'Synthetic outage'}})}));
  await pageA.getByRole('button',{name:'Atualizar painel',exact:true}).click();
  await pageA.getByRole('alert').filter({hasText:'Não foi possível carregar este painel'}).waitFor();
  await pageA.screenshot({path:join(process.env.MAIL_OUTBOX_DIR,'..','dashboard-error.png'),fullPage:true});
  await pageA.unroute('**/api/dashboard?*');
  await pageA.getByRole('button',{name:'Tentar novamente',exact:true}).click();
  await pageA.getByText('R$ 265,00',{exact:true}).waitFor();
  assert.equal(requestCount.length,3,'Exactly one read per period change, failed refresh and retry');
  await pageA.goto(origin+'/portfolios/'+idA);
  await pageA.getByRole('heading',{name:'Carteira sintética A',exact:true}).waitFor();
  await pageA.getByText('R$ 212,00',{exact:true}).waitFor();
  const dashboardCsrf=(await (await a.request.get(origin+'/api/auth/csrf')).json()).data.csrfToken;
  const flag=async incomplete=>{const response=await a.request.post(`${origin}/api/portfolios/${idA}/positions/limitation`,{headers:{Origin:origin,'X-CSRF-Token':dashboardCsrf},data:{incomplete,reason:'Synthetic dashboard completeness test'}});assert.equal(response.status(),201);};
  await flag(true);await pageA.goto(origin+'/dashboard');
  await pageA.getByRole('status').filter({hasText:'Histórico incompleto:'}).waitFor();
  assert.equal(await pageA.getByText('Indisponível',{exact:true}).count(),4);
  await pageA.screenshot({path:join(process.env.MAIL_OUTBOX_DIR,'..','dashboard-incomplete.png'),fullPage:true});
  await flag(false);
  console.log('PASS: dashboard empty/populated; 320/375/768/1024/1440 screenshots; SVG charts, exact table, period, retry and portfolio dashboard.');
  await register(pageB, 'Browser B', 'browser.b@example.test'); await login(pageB, 'browser.b@example.test');
  await pageB.getByText('Browser B', { exact: true }).waitFor();
  await portfolio(pageB, 'Carteira sintética B');
  await pageA.goto(origin + '/portfolios');
  await pageA.getByRole('link', { name: 'Carteira sintética A', exact: true }).waitFor();
  assert.equal(await pageA.getByRole('link', { name: 'Carteira sintética B', exact: true }).count(), 0);
  await pageB.goto(origin + '/portfolios/' + idA);
  await pageB.getByRole('alert').filter({ hasText: 'Carteira não encontrada' }).waitFor();
  assert.equal((await b.request.get(`${origin}/api/portfolios/${idA}/positions`)).status(),404);
  assert.equal((await b.request.get(`${origin}/api/portfolios/${idA}/transactions`)).status(),404);
  const csrfResponse = await b.request.get(origin + '/api/auth/csrf');
  const csrf = (await csrfResponse.json()).data.csrfToken;
  for (const action of ['archive', 'restore', 'primary']) {
    const response = await b.request.post(`${origin}/api/portfolios/${idA}/${action}`, { headers: { Origin: origin, 'X-CSRF-Token': csrf } });
    assert.equal(response.status(), 404);
  }
  const deniedCsrf = await b.request.post(origin + '/api/portfolios', { headers: { Origin: origin }, data: { name: 'CSRF denied' } });
  assert.equal(deniedCsrf.status(), 403);
  const newPage = await a.newPage(); await newPage.goto(origin + '/dashboard');
  await newPage.getByRole('heading', { name: 'Visão geral', exact: true }).waitFor(); await newPage.close();
  assert.ok((await a.cookies()).some(cookie => cookie.name === 'valunium.sid' && cookie.httpOnly && cookie.sameSite === 'Lax'));
  assert.equal(await pageA.evaluate(() => localStorage.length), 0);
  assert.equal((await pageA.goto(origin + '/settings/profile')).status(), 200);
  await pageA.getByLabel('Nome', { exact: true }).fill('Browser A atualizado');
  await pageA.getByRole('button', { name: 'Salvar perfil' }).click();
  await pageA.getByRole('status').filter({ hasText: 'Perfil atualizado' }).waitFor();
  await pageA.setViewportSize({ width: 390, height: 844 });
  await pageA.goto(origin + '/portfolios');
  await pageA.getByRole('link', { name: 'Carteira sintética A', exact: true }).waitFor();
  assert.ok(await pageA.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await pageA.keyboard.press('Tab');
  assert.match(await pageA.evaluate(() => document.activeElement?.textContent), /Ir para o conteúdo/);
  await pageA.screenshot({ path: join(process.env.MAIL_OUTBOX_DIR, '..', 'mobile.png'), fullPage: true });
  await pageA.setViewportSize({ width: 1366, height: 900 });
  await pageA.screenshot({ path: join(process.env.MAIL_OUTBOX_DIR, '..', 'desktop.png'), fullPage: true });
  await pageA.getByRole('button', { name: 'Encerrar sessão', exact: true }).click();
  await pageA.waitForURL('**/login');
  await pageA.goto(origin + '/portfolios/' + idA); await pageA.waitForURL('**/login');
  await pageB.goto(origin + '/forgot-password');
  await pageB.getByLabel('E-mail').fill('browser.b@example.test');
  await pageB.getByRole('button', { name: 'Enviar instruções' }).click();
  await pageB.getByRole('status').filter({ hasText: 'Se o e-mail estiver cadastrado' }).waitFor();
  await app.get(MailDelivery).drain();
  const names = await readdir(process.env.MAIL_OUTBOX_DIR);
  const messages = await Promise.all(names.map(async name => JSON.parse(await readFile(join(process.env.MAIL_OUTBOX_DIR, name), 'utf8'))));
  const resetUrl = messages.find(message => message.to === 'browser.b@example.test').resetUrl;
  await pageB.goto(resetUrl);
  await pageB.getByLabel('Nova senha (12 a 128 caracteres)', { exact: true }).fill('Browser reset password 03!');
  await pageB.getByRole('button', { name: 'Redefinir senha' }).click();
  await pageB.getByRole('status').filter({ hasText: 'Senha redefinida' }).waitFor();
  assert.equal(new URL(pageB.url()).hash, '');
  await login(pageB, 'browser.b@example.test', 'Browser reset password 03!');
  assert.deepEqual(errors, []);
  console.log('PASS: Chromium; two isolated browser contexts; registration/login/portfolios/profile/logout/recovery; CSRF/IDOR; persistent HttpOnly session; mobile width and keyboard; no page errors.');
} catch (failure) {
  if (browser) {
    let index = 0;
    for (const context of browser.contexts()) for (const page of context.pages()) {
      await page.screenshot({ path: join(process.env.MAIL_OUTBOX_DIR, '..', `failure-${index++}.png`), fullPage: true }).catch(() => {});
    }
  }
  throw failure;
} finally {
  await browser?.close();
  if (web) { web.kill('SIGTERM'); await new Promise(resolve => web.once('exit', resolve)); }
  await app.close(); closeSync(log);
}
