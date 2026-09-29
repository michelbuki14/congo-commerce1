import { register } from 'node:module';

// Test-only ESM hooks: `@/` → ./src, and the Base44 SDK client → a stub.
// Lets node --test import the app's pure logic without a browser or backend.
register('./alias-loader.mjs', import.meta.url);
