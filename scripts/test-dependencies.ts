#!/usr/bin/env bun

/**
 * Test script to validate dependency fixes
 */

console.log('🧪 Testing dependency imports...');

try {
  console.log('1. Testing database imports...');
  const { getDb } = await import('../packages/db/index.js');
  console.log('✅ Database imports successful');

  console.log('2. Testing core imports...');
  const { EyeOrchestrator } = await import('../packages/core/index.js');
  console.log('✅ Core imports successful');

  console.log('3. Testing provider imports...');
  const { ProviderFactory } = await import('../packages/providers/index.js');
  console.log('✅ Provider imports successful');

  console.log('4. Testing server imports...');
  const server = await import('../apps/server/src/index.js');
  console.log('✅ Server imports successful');

  console.log('\n🎉 All dependency imports successful!');

} catch (error) {
  console.error('❌ Import test failed:', error);
  process.exit(1);
}