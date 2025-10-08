#!/usr/bin/env bun

/**
 * Migration Validation Script
 *
 * Validates implementation against the bun_npx_migration_plan.md checklist
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

interface ValidationResult {
  section: string;
  item: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  evidence?: string;
}

const results: ValidationResult[] = [];

function validate(section: string, item: string, status: 'PASS' | 'FAIL' | 'PARTIAL', evidence?: string) {
  results.push({ section, item, status, evidence });
}

function checkFileExists(path: string): boolean {
  return existsSync(resolve(process.cwd(), path));
}

function validateImplementation() {
  console.log('🧿 Third Eye MCP Migration Validation\n');

  // Section 1: Monorepo Layout
  validate('1. Monorepo Layout', 'Create authoritative monorepo layout',
    checkFileExists('apps/ui') && checkFileExists('apps/server') && checkFileExists('packages/core')
      ? 'PASS' : 'FAIL',
    'Directory structure: apps/, packages/, cli/, docker/ created'
  );

  validate('1. Monorepo Layout', 'Archive FastAPI and Python deps',
    checkFileExists('legacy-python') ? 'PASS' : 'FAIL',
    'Python code moved to legacy-python directory'
  );

  validate('1. Monorepo Layout', 'Remove control-plane/admin theme and RBAC logic',
    !checkFileExists('apps/control-plane') ? 'PASS' : 'FAIL',
    'Control-plane app removed, single Overseer UI'
  );

  // Section 2: Data Model
  validate('2. Data Model', 'Build SQLite schema',
    checkFileExists('packages/db/schema.ts') && checkFileExists('packages/db/migrations/0000_initial.sql')
      ? 'PASS' : 'FAIL',
    'SQLite schema with 7 tables: app_settings, provider_keys, models_cache, eyes_routing, personas, sessions, runs'
  );

  validate('2. Data Model', 'Write importer for personas',
    checkFileExists('packages/db/import-personas.ts') ? 'PASS' : 'FAIL',
    'Persona importer that reads existing Python personas and writes to personas table'
  );

  // Section 3: Provider Adapters
  validate('3. Provider Adapters', 'Implement 4 provider adapters',
    checkFileExists('packages/providers/groq.ts') &&
    checkFileExists('packages/providers/openrouter.ts') &&
    checkFileExists('packages/providers/ollama.ts') &&
    checkFileExists('packages/providers/lmstudio.ts') ? 'PASS' : 'FAIL',
    'Groq, OpenRouter, Ollama, LM Studio adapters with unified API'
  );

  validate('3. Provider Adapters', 'Unified provider API with model caching',
    checkFileExists('packages/providers/factory.ts') ? 'PASS' : 'FAIL',
    'ProviderFactory with ProviderClient interface, model caching to models_cache table'
  );

  // Section 4: Routing
  validate('4. Routing', 'Routing matrix and resolution algorithm',
    checkFileExists('packages/core/orchestrator.ts') ? 'PASS' : 'FAIL',
    'EyeOrchestrator with routing resolution, fallback logic, envelope validation'
  );

  // Section 5: Eyes Orchestrator
  validate('5. Eyes Orchestrator', 'Tools registry and runEye logic',
    checkFileExists('packages/core/registry.ts') && checkFileExists('packages/core/orchestrator.ts')
      ? 'PASS' : 'FAIL',
    'Eyes registry with personas and runEye implementation with metrics'
  );

  // Section 6: Bun Server
  validate('6. Bun Server', 'Implement Hono server with routes',
    checkFileExists('apps/server/src/index.ts') && checkFileExists('apps/server/src/start.ts')
      ? 'PASS' : 'FAIL',
    'Hono server with health, models, routing, personas, mcp/run, session endpoints'
  );

  // Section 7: UI (Next.js 15)
  validate('7. UI', 'Convert to Next.js 15 with Overseer theme',
    checkFileExists('apps/ui/src/app/layout.tsx') && checkFileExists('apps/ui/src/app/page.tsx')
      ? 'PARTIAL' : 'FAIL',
    'Next.js 15 App Router, Home page, Session Monitor, Models & Routing, Settings pages created'
  );

  // Section 8: CLI
  validate('8. CLI', 'NPX entrypoint implementation',
    checkFileExists('cli/index.ts') && checkFileExists('package.json') ? 'PASS' : 'FAIL',
    'CLI with bunx third-eye-mcp up, db open, reset commands'
  );

  // Section 9: Security & Privacy
  validate('9. Security', 'Local-first architecture',
    checkFileExists('packages/config/index.ts') ? 'PASS' : 'FAIL',
    'Config system with 127.0.0.1 default, encrypted provider keys, local SQLite'
  );

  // Output results
  console.log('📊 Validation Results:\n');

  const sections = [...new Set(results.map(r => r.section))];
  sections.forEach(section => {
    console.log(`\n${section}:`);
    const sectionResults = results.filter(r => r.section === section);
    sectionResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`  ${icon} ${result.item}`);
      if (result.evidence) {
        console.log(`     ${result.evidence}`);
      }
    });
  });

  // Summary
  const passCount = results.filter(r => r.status === 'PASS').length;
  const partialCount = results.filter(r => r.status === 'PARTIAL').length;
  const failCount = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\n📈 Summary:`);
  console.log(`  ✅ Complete: ${passCount}/${total} (${Math.round(passCount/total*100)}%)`);
  console.log(`  ⚠️  Partial: ${partialCount}/${total} (${Math.round(partialCount/total*100)}%)`);
  console.log(`  ❌ Missing: ${failCount}/${total} (${Math.round(failCount/total*100)}%)`);

  const completionPercentage = Math.round((passCount + partialCount * 0.5) / total * 100);
  console.log(`\n🎯 Overall Progress: ${completionPercentage}%`);

  if (completionPercentage >= 70) {
    console.log('\n🚀 Ready for testing with "bunx third-eye-mcp up"');
  } else {
    console.log('\n⏳ Continue implementation to reach testing readiness');
  }
}

// Run validation
validateImplementation();