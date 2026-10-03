#!/usr/bin/env node
/**
 * find-placeholder-i18n.js
 *
 * Detects i18n entries whose VALUE is just a lowercased/capitalised version of
 * their own KEY with no spaces — the signature of a bad bulk-insert that wrote
 * key names as values instead of copy.
 *
 * Usage: node scripts/find-placeholder-i18n.js
 */
import fs from 'node:fs';
import path from 'node:path';

const FILES = ['src/i18n/fr.js', 'src/i18n/en.js'];

// key: 'value'  — single-line entries only
const LINE_RE = /^\s*([A-Za-z_$][\w$]*):\s*'((?:[^'\\]|\\.)*)',?\s*$/;

for (const rel of FILES) {
  const abs = path.join(process.cwd(), rel);
  if (!fs.existsSync(abs)) {
    console.error(`missing: ${rel}`);
    continue;
  }
  const lines = fs.readFileSync(abs, 'utf-8').split(/\r?\n/);

  // Track which top-level section we're inside so the report is actionable.
  let section = '(root)';
  const hits = [];

  lines.forEach((line, i) => {
    const secMatch = line.match(/^ {2}([A-Za-z_$][\w$]*):\s*\{/);
    if (secMatch) section = secMatch[1];

    const m = line.match(LINE_RE);
    if (!m) return;
    const [, key, value] = m;

    // Placeholder signature: value === key.toLowerCase(), possibly capitalised,
    // with no spaces (real copy has spaces or is a single word with different chars).
    const normalised = value.replace(/\s+/g, '');
    const keyNorm = key.toLowerCase();
    if (normalised.length === keyNorm.length &&
        normalised.toLowerCase() === keyNorm &&
        value.length > 2) {
      hits.push({ line: i + 1, section, key, value });
    }
  });

  console.log(`\n=== ${rel} — ${hits.length} placeholder value(s) ===`);
  const bySection = {};
  for (const h of hits) {
    (bySection[h.section] ||= []).push(h);
  }
  for (const [sec, list] of Object.entries(bySection)) {
    console.log(`\n[${sec}]  (${list.length})`);
    console.log('  ' + list.map((h) => h.key).join(', '));
  }
}