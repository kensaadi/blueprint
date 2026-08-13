/**
 * Builds a SELF-CONTAINED `csp-no-eval.html` that proves the Blueprint
 * runtime executes no dynamic code. The runtime (blueprint-core + zod, jitless)
 * is bundled inline; the page runs under a Content-Security-Policy with NO
 * `unsafe-eval`, validates real contracts, reports runtime CSP violations
 * (expected: 0), and then deliberately attempts `new Function(...)` to show the
 * browser blocks it (proof the policy is genuinely enforced).
 *
 *   node security/build-csp-demo.mjs
 */
import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const result = await build({
  stdin: {
    contents: `import { validate } from '@dashforge/blueprint-core';
      globalThis.BlueprintCore = { validate };`,
    resolveDir: join(here, '..'),
    loader: 'js',
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  write: false,
  minify: false,
});
const runtimeJs = result.outputFiles[0].text;

const demoJs = `
  const out = document.getElementById('out');
  const row = (label, ok, detail) => {
    const el = document.createElement('div');
    el.className = 'row ' + (ok ? 'ok' : 'bad');
    el.innerHTML = '<span class="mark">' + (ok ? '✓' : '✗') + '</span>' +
      '<span class="label">' + label + '</span>' +
      (detail ? '<span class="detail">' + detail + '</span>' : '');
    out.appendChild(el);
  };

  // Count CSP violations the RUNTIME triggers (must be 0).
  let runtimeViolations = 0;
  let countingRuntime = true;
  document.addEventListener('securitypolicyviolation', () => {
    if (countingRuntime) runtimeViolations++;
  });

  const { validate } = globalThis.BlueprintCore;

  const good = { version: '1.0', lib: 'tw', root: { type: 'form', id: 'signup', props: {},
    children: [ { type: 'field', props: { name: 'email', label: 'Email' } } ] } };
  const bad = { version: '1.0', root: { type: 'field', props: { level: 99 } } };

  const g = validate(good);
  row('Valid contract accepted', g.ok === true, 'form + field');
  const b = validate(bad);
  row('Invalid contract rejected', b.ok === false, (b.errors ? b.errors.length : 0) + ' error(s)');

  // Let any async violation reports land, then check the runtime count.
  setTimeout(() => {
    row('Runtime CSP violations while validating', runtimeViolations === 0, runtimeViolations + ' (expected 0)');
    countingRuntime = false;

    // Now PROVE the policy really blocks eval: this must throw (CSP), not run.
    let blocked = false;
    try { new Function('return 1')(); } catch (e) { blocked = true; }
    row('Deliberate new Function() blocked by CSP', blocked, blocked ? 'browser refused unsafe-eval' : 'NOT blocked — policy not enforced!');

    const all = out.querySelectorAll('.row.bad').length === 0;
    const verdict = document.getElementById('verdict');
    verdict.textContent = all ? 'PASS — runs under strict CSP, no eval executed' : 'FAIL';
    verdict.className = all ? 'ok' : 'bad';
  }, 50);
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<!-- The point: script-src has NO 'unsafe-eval'. eval / new Function are blocked. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'">
<title>Blueprint runtime — no-eval under strict CSP</title>
<style>
  body { font: 15px/1.5 -apple-system, system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; color: #1a1a2e; }
  h1 { font-size: 20px; } code { background: #f0f0f5; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
  .policy { background: #0f172a; color: #e2e8f0; padding: 12px 14px; border-radius: 8px; font: 12px/1.5 ui-monospace, monospace; overflow-x: auto; }
  .row { display: flex; align-items: baseline; gap: 10px; padding: 8px 0; border-bottom: 1px solid #eee; }
  .row .mark { font-weight: 700; width: 16px; } .row.ok .mark { color: #16a34a; } .row.bad .mark { color: #dc2626; }
  .row .label { flex: 1; } .row .detail { color: #64748b; font-size: 13px; }
  #verdict { margin-top: 20px; padding: 12px 16px; border-radius: 8px; font-weight: 600; }
  #verdict.ok { background: #dcfce7; color: #166534; } #verdict.bad { background: #fee2e2; color: #991b1b; }
</style>
</head>
<body>
<h1>Blueprint runtime — no eval, under a strict CSP</h1>
<p>This page runs the actual contract validator (<code>@dashforge/blueprint-core</code>
+ zod, jitless) under the policy below. No <code>'unsafe-eval'</code>.</p>
<div class="policy">Content-Security-Policy: default-src 'self'; script-src 'unsafe-inline'; base-uri 'none'</div>
<div id="out"></div>
<div id="verdict">running…</div>
<script>${runtimeJs}</script>
<script>${demoJs}</script>
</body>
</html>
`;

const outPath = join(here, 'csp-no-eval.html');
writeFileSync(outPath, html);
console.log('wrote ' + outPath + ' (' + Math.round(html.length / 1024) + ' KB)');
