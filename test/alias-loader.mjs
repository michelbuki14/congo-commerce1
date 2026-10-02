import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const EXTENSIONS = ['', '.js', '.jsx', '/index.js', '/index.jsx'];

export async function resolve(specifier, context, next) {
  if (specifier === '@/api/base44Client') {
    return { url: pathToFileURL(path.join(root, 'test/stubs/base44Client.js')).href, shortCircuit: true };
  }
  if (specifier.startsWith('@/')) {
    const base = path.join(root, 'src', specifier.slice(2));
    const hit = EXTENSIONS.map((e) => base + e).find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }
  if (specifier.startsWith('.') && context?.parentURL?.startsWith('file:')) {
    const base = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    const hit = EXTENSIONS.map((e) => base + e).find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
  }
  return next(specifier, context);
}
