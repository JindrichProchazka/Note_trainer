import test from 'node:test';
import assert from 'node:assert/strict';
import { createStaticServer } from '../scripts/serve.mjs';

test('static app and every module load correctly at a GitHub Pages project subpath', async t => {
  const server = createStaticServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const resources = [
    ['/', 'text/html'], ['/Note_trainer/', 'text/html'],
    ['/Note_trainer/css/style.css', 'text/css'],
    ['/Note_trainer/css/themes.css', 'text/css'],
    ['/Note_trainer/css/components.css', 'text/css'],
    ['/Note_trainer/js/app.js', 'text/javascript'],
    ['/Note_trainer/js/config.js', 'text/javascript'],
    ['/Note_trainer/js/music/notes.js', 'text/javascript'],
    ['/Note_trainer/js/music/notation.js', 'text/javascript'],
    ['/Note_trainer/js/exercises/generator.js', 'text/javascript'],
    ['/Note_trainer/js/exercises/single-note.js', 'text/javascript'],
    ['/Note_trainer/js/session/session.js', 'text/javascript'],
    ['/Note_trainer/js/session/statistics.js', 'text/javascript'],
    ['/Note_trainer/js/ui/home.js', 'text/javascript'],
    ['/Note_trainer/js/ui/practice.js', 'text/javascript'],
    ['/Note_trainer/js/ui/strings.js', 'text/javascript'],
    ['/Note_trainer/js/ui/format.js', 'text/javascript'],
  ];
  for (const [resource, mime] of resources) {
    const response = await fetch(origin + resource);
    assert.equal(response.status, 200, resource);
    assert.ok(response.headers.get('content-type').startsWith(mime), resource);
    assert.ok((await response.text()).length > 0);
  }
  const redirect = await fetch(origin + '/Note_trainer', { redirect: 'manual' });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('location'), './Note_trainer/');
  const head = await fetch(origin + '/Note_trainer/js/app.js', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  for (const resource of ['/missing', '/.git/config', '/docs/PRODUCT_SPEC.md', '/js/%2e%2e%2f.git/config', '/js/notes.txt']) {
    assert.equal((await fetch(origin + resource)).status, 404, resource);
  }
  assert.equal((await fetch(origin + '/%ZZ')).status, 400);
  assert.equal((await fetch(origin + '/', { method: 'POST' })).status, 405);
});
