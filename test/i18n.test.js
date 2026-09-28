import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fr from '../src/i18n/fr.js';
import en from '../src/i18n/en.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function flatten(obj, prefix = '', out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.add(key);
  }
  return out;
}

function srcFiles(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'i18n') srcFiles(f, acc);
    } else if (/\.jsx?$/.test(f)) acc.push(f);
  }
  return acc;
}

describe('i18n dictionaries', () => {
  it('English covers every French key (fallback must never fire for EN)', () => {
    const frKeys = flatten(fr);
    const enKeys = flatten(en);
    const missing = [...frKeys].filter((k) => !enKeys.has(k));
    assert.deepEqual(missing, []);
  });

  it('every t() key used in src exists in French', () => {
    const frKeys = flatten(fr);
    const used = new Set();
    for (const f of srcFiles(path.join(root, 'src'))) {
      const s = fs.readFileSync(f, 'utf8');
      const re = /\bt\(\s*['"]([a-z0-9_.]+)['"]/gi;
      let m;
      while ((m = re.exec(s))) used.add(m[1]);
    }
    const missing = [...used].filter((k) => !frKeys.has(k));
    assert.deepEqual(missing, []);
  });
});
