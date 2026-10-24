const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = __dirname;
const core = require(path.join(root, 'core.js'));

const valid = { id: 'a', day: '2024-02-29' };
assert.deepEqual(core.validateHistory(null, ['a']), []);
assert.deepEqual(core.validateHistory({}, ['a']), []);
assert.deepEqual(core.validateHistory([
  valid, { id: 'unknown', day: valid.day }, null,
  { id: 'a', day: '2023-02-29' }, { id: 'a', day: '2024-04-31' },
  { id: 'a', day: '2024-00-01' }, { id: 'a', day: '2024-13-01' },
  { id: 'a', day: '2024-02-00' }, { id: 'a', day: '2024-2-01' },
  { id: 'a', day: '2024-02-29T00:00:00Z' }, { id: 'a', day: 42 },
  { id: 'a', day: '2100-02-29' }, { id: 'a', day: '2400-02-29' },
  { id: 'a', day: '2099-01-01', irrelevant: true }, valid,
], ['a']), [valid, { id: 'a', day: '2400-02-29' }, { id: 'a', day: '2099-01-01' }, valid]);
assert.equal(core.validateHistory(Array.from({ length: 10001 }, () => valid), ['a']).length, 10000);
assert.deepEqual(core.validateHistory([{ id: 'b', day: valid.day }, ...Array.from({ length: 10000 }, () => valid)], ['a', 'b'])[0], valid);
const older = { id: 'b', day: '2024-02-28' };
const newer = { id: 'a', day: '2024-03-01' };
const merged = core.mergeHistory([valid, valid, older], [valid, newer, valid, valid]);
assert.deepEqual(merged, [older, valid, valid, valid, newer]);
assert.deepEqual(core.mergeHistory(merged, [valid, newer, valid, valid]), merged);
assert.equal(core.mergeHistory(Array.from({ length: 10000 }, () => older), [newer]).length, 10000);
assert.deepEqual(core.mergeHistory(Array.from({ length: 10000 }, () => older), [newer]).at(-1), newer);

const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
async function requestThroughWorker(range, { online = false, failPut = false, cached = true } = {}) {
  const listeners = {};
  const cache = {
    match: async () => cached ? new Response('abcdefghij', { headers: { 'Content-Type': 'application/pdf' } }) : undefined,
    put: async () => { if (failPut) throw Error('QuotaExceededError'); },
  };
  const context = {
    self: {
      location: { origin: 'https://example.test' }, registration: { scope: 'https://example.test/matika/' },
      addEventListener: (type, listener) => { listeners[type] = listener; },
    },
    caches: { open: async () => cache },
    fetch: async () => { if (!online) throw Error('offline'); return new Response('fresh network response'); },
    Request, Response, URL,
  };
  vm.runInNewContext(source, context);
  let promise;
  const headers = range ? { Range: range } : {};
  listeners.fetch({ request: new Request('https://example.test/matika/MA1.pdf', { headers }), respondWith: value => { promise = value; } });
  return await promise;
}

(async () => {
  for (const [range, body, contentRange] of [
    ['bytes=2-4', 'cde', 'bytes 2-4/10'],
    ['bytes=7-', 'hij', 'bytes 7-9/10'],
    ['bytes=-3', 'hij', 'bytes 7-9/10'],
    ['bytes=-99', 'abcdefghij', 'bytes 0-9/10'],
    ['bytes=8-99', 'ij', 'bytes 8-9/10'],
  ]) {
    const result = await requestThroughWorker(range);
    assert.equal(result.status, 206, range);
    assert.equal(result.headers.get('Content-Range'), contentRange, range);
    assert.equal(await result.text(), body, range);
  }
  for (const range of ['bytes=20-30', 'bytes=7-2', 'bytes=-0']) {
    const result = await requestThroughWorker(range);
    assert.equal(result.status, 416, range);
    assert.equal(result.headers.get('Content-Range'), 'bytes */10', range);
    assert.equal(await result.text(), '', range);
  }
  for (const range of [null, 'bytes=0-1,5-6', 'not-a-range', 'bytes=-']) {
    const result = await requestThroughWorker(range);
    assert.equal(result.status, 200, range);
    assert.equal(await result.text(), 'abcdefghij', range);
  }
  const result = await requestThroughWorker(null, { online: true, failPut: true, cached: false });
  assert.equal(result.status, 200);
  assert.equal(await result.text(), 'fresh network response');
  console.log('PASS: history validation, PDF range recovery, and cache quota fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
