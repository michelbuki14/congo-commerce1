#!/usr/bin/env node
/**
 * seed-fraud-rules.js
 * 
 * Script to seed fraud rules from src/lib/fraud-rules.json into the
 * FraudRule entity. Can be run locally for testing or as part of
 * deployment.
 * 
 * Usage:
 *   node scripts/seed-fraud-rules.js
 * 
 * Environment:
 *   Requires BASE44_API_KEY or uses local mock for development
 */

import fs from 'node:fs';
import path from 'node:path';

const SEED_DATA_PATH = path.join(import.meta.dirname, '../src/lib/fraud-rules.json');

async function getDb() {
  const { base44 } = await import('../src/api/base44Client.js');
  return base44.asServiceRole || base44;
}

async function seedFraudRules() {
  console.log('🌱 Seeding fraud rules...\n');

  const seedData = JSON.parse(fs.readFileSync(SEED_DATA_PATH, 'utf-8'));
  const RULES_SEED = seedData.RULES_SEED || seedData.default || seedData.rules || [];

  console.log(`Found ${RULES_SEED.length} rules to seed.`);

  const db = await getDb().catch(() => {
    console.log('⚠️  Using mock mode (no Base44 backend available)');
    return {
      entities: {
        FraudRule: {
          filter: async () => [],
          create: async (data) => ({ id: 'mock-' + Date.now(), ...data }),
        },
      },
    };
  });

  const results = { seeded: 0, skipped: 0, errors: 0, rules: [] };

  for (const rule of RULES_SEED) {
    try {
      const existing = await db.entities.FraudRule.filter({ code: rule.code }).catch(() => []);

      if (existing.length > 0) {
        console.log(`⏭️  ${rule.code} — already exists`);
        results.skipped++;
        results.rules.push({ code: rule.code, status: 'exists' });
        continue;
      }

      const created = await db.entities.FraudRule.create({
        code: rule.code,
        label: rule.label,
        description: rule.description || '',
        signal: rule.signal,
        threshold: rule.threshold,
        score: rule.score,
        action: rule.action,
        active: rule.active,
        sort_order: rule.sort_order || 0,
      });

      console.log(`✅ Created: ${rule.code}`);
      results.seeded++;
      results.rules.push({ code: rule.code, status: 'created', id: created.id });
    } catch (err) {
      console.error(`❌ Failed: ${rule.code} — ${err.message}`);
      results.errors++;
      results.rules.push({ code: rule.code, error: err.message });
    }
  }

  console.log(`\n📊 Results:`);
  console.log(`   Seeded: ${results.seeded}`);
  console.log(`   Skipped: ${results.skipped}`);
  console.log(`   Errors: ${results.errors}`);

  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedFraudRules().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

export { seedFraudRules };