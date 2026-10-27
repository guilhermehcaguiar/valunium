import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import Home from '../src/app/page';
import { AppShell, StatusMessage } from '../src/components/ui';
import { publicApiOrigin } from '../src/config/environment';

test('home explains the provisional scope and read-only policy', () => {
  const html = renderToStaticMarkup(<AppShell><Home /></AppShell>);
  assert.match(html, /Valunium/);
  assert.match(html, /nunca envia ordens/);
  assert.match(html, /ainda não estão disponíveis/);
  assert.match(html, /href="#conteudo"/);
  assert.match(html, /id="conteudo"/);
});
test('loading is exposed to assistive technology', () => {
  const html = renderToStaticMarkup(<StatusMessage title="Carregando" busy>Aguarde.</StatusMessage>);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-busy="true"/);
});
test('public environment rejects credentials', () => {
  const previous = process.env.NEXT_PUBLIC_API_URL;
  try {
    process.env.NEXT_PUBLIC_API_URL = 'https://user:secret@example.org';
    assert.throws(publicApiOrigin);
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_URL;
    else process.env.NEXT_PUBLIC_API_URL = previous;
  }
});
