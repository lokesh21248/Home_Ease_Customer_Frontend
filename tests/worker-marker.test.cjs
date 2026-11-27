const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { categoryIcon, liveLabel } = require('../src/services/workerMarkerStyle.ts');
const { WORKER_SYMBOL_WIDTH, WORKER_SYMBOL_HEIGHT, smoothWorkerMotionDurationMs } = require('../src/services/workerMarkerMotion.ts');

// ─── Existing tests ───────────────────────────────────────────────────────────

test('trade icons per service category', () => {
  assert.equal(categoryIcon('Electrician').icon, 'flash');
  assert.equal(categoryIcon('Ceiling fan repair').icon, 'flash');
  assert.equal(categoryIcon('Plumbing').icon, 'water');
  assert.equal(categoryIcon('Tap leakage fix').icon, 'water');
  assert.equal(categoryIcon('AC Service & Repair').icon, 'snow');
  assert.equal(categoryIcon('Split AC installation').icon, 'snow');
  assert.equal(categoryIcon('Deep cleaning').icon, 'sparkles');
  assert.equal(categoryIcon('Carpentry').icon, 'hammer');
  assert.equal(categoryIcon('Painting').icon, 'color-palette');
  assert.equal(categoryIcon('Pest Control').icon, 'bug');
  assert.equal(categoryIcon('Washing machine repair').icon, 'construct');
});

test('unknown or missing category falls back to a neutral icon (never a wrong trade)', () => {
  assert.equal(categoryIcon(undefined).icon, 'person');
  assert.equal(categoryIcon('').icon, 'person');
  assert.equal(categoryIcon('Yoga instructor').icon, 'person');
  // "Accounting" must not match the AC rule
  assert.equal(categoryIcon('Accounting help').icon, 'person');
});

test('badge says Live only when live, otherwise how long ago', () => {
  const now = 1_800_000_000_000;
  assert.equal(liveLabel(true, now - 2_000, now), 'Live');
  assert.equal(liveLabel(false, null, now), 'Offline');
  assert.equal(liveLabel(false, now - 42_000, now), 'Seen 42s ago');
  assert.equal(liveLabel(false, now - 5 * 60_000, now), 'Seen 5m ago');
});

test('worker map symbol stays compact rather than covering city streets', () => {
  assert.ok(WORKER_SYMBOL_WIDTH <= 44);
  assert.ok(WORKER_SYMBOL_HEIGHT <= 52);
});

test('native marker smoothing stays within a GPS frame, with bounded duration', () => {
  assert.equal(smoothWorkerMotionDurationMs(7_000), 6_440);
  assert.equal(smoothWorkerMotionDurationMs(null), 6_440);
  assert.equal(smoothWorkerMotionDurationMs(200), 500);
  assert.equal(smoothWorkerMotionDurationMs(60_000), 6_500);
});
