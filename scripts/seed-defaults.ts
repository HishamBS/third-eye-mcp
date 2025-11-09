#!/usr/bin/env bun

import { seedDefaults, type SeedDefaultsOptions } from '../packages/db/defaults';

function parseArgs(): SeedDefaultsOptions {
  const args = Bun.argv.slice(2);
  const options: SeedDefaultsOptions = {};
  let onlySubsets: SeedDefaultsOptions['subsets'] | undefined;

  for (const arg of args) {
    if (arg === '--force') {
      options.force = true;
    } else if (arg.startsWith('--only=')) {
      const list = arg.split('=')[1];
      if (list) {
        const items = list.split(',').map((item) => item.trim().toLowerCase());
        onlySubsets = {
          personas: items.includes('personas'),
          routing: items.includes('routing'),
          strictness: items.includes('strictness'),
          appSettings: items.includes('appsettings') || items.includes('app-settings'),
          integrations: items.includes('integrations'),
        };
      }
    }
  }

  if (onlySubsets) {
    options.subsets = onlySubsets;
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log('🌱 Seeding defaults...');
  const report = await seedDefaults({
    ...options,
    log: (message: string) => console.log(message),
  });

  console.log('\n✅ Seeding complete. Summary:');
  console.log(`   Personas seeded:     ${report.personas}`);
  console.log(`   Routing seeded:      ${report.routing}`);
  console.log(`   Strictness seeded:   ${report.strictness}`);
  console.log(`   App settings seeded: ${report.appSettings}`);
  console.log(`   Integrations seeded: ${report.integrations}`);
}

main().catch((error) => {
  console.error('❌ Failed to seed defaults:', error);
  process.exit(1);
});
