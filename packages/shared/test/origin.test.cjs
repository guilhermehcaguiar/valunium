const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseHttpOrigin } = require('../dist');
test('canonicalizes HTTP origins', () => {
  assert.equal(parseHttpOrigin('http://localhost:3000/'), 'http://localhost:3000');
  assert.equal(parseHttpOrigin('https://EXAMPLE.org'), 'https://example.org');
});
test('rejects unsafe protocols, credentials and non-origin URLs', () => {
  for (const value of ['*', 'null', 'file:///etc/passwd', 'https://user:secret@example.org', 'https://example.org/path', 'https://example.org?q=1', 'https://example.org/#x']) {
    assert.throws(() => parseHttpOrigin(value));
  }
});
