#!/usr/bin/env bun

/**
 * Test AI-powered Eye execution end-to-end
 */

import { EyeOrchestrator } from './packages/core/orchestrator';

async function testAIIntegration() {
  console.log('🧿 Testing AI-powered Eye integration...\n');

  try {
    // 1. Database should already be migrated
    console.log('📁 Assuming database is already migrated...');

    // 2. Create orchestrator
    const orchestrator = new EyeOrchestrator();

    // 3. Test all 8 Eyes with AI
    const testCases = [
      { eye: 'overseer', input: "Initialize session for authentication system", description: "Navigator" },
      { eye: 'sharingan', input: "Can you somehow improve this thing and make it better?", description: "Ambiguity Radar" },
      { eye: 'prompt-helper', input: "Create user authentication that is secure", description: "Prompt Optimizer" },
      { eye: 'jogan', input: "Add JWT authentication with access tokens and refresh tokens", description: "Intent Analysis" },
      { eye: 'rinnegan', input: "Plan the authentication system architecture", description: "Strategic Planner" },
      { eye: 'mangekyo', input: "Implement user login form component", description: "Implementation Phases" },
      { eye: 'tenseigan', input: "Our API is 50% faster than competitors with zero downtime", description: "Evidence Validator" },
      { eye: 'byakugan', input: "The API always returns JSON. When it fails, it returns XML", description: "Consistency Checker" }
    ];

    const allResults = [];

    for (const testCase of testCases) {
      console.log(`👁️  Testing ${testCase.eye.toUpperCase()} Eye (${testCase.description})...`);

      try {
        const result = await orchestrator.runEye(testCase.eye, testCase.input);
        console.log('📊 Result:');
        console.log(`   Eye: ${result.eye}`);
        console.log(`   Code: ${result.code}`);
        console.log(`   Verdict: ${result.verdict}`);
        console.log(`   Summary: ${result.summary.substring(0, 100)}...`);

        allResults.push(result);
        console.log('✅ SUCCESS\n');
      } catch (error) {
        console.log(`❌ FAILED: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
        allResults.push(null);
      }
    }

    // 4. Verify all results are properly typed envelopes
    const validResults = allResults.filter(r => r !== null);
    const validEnvelopes = validResults.every(result =>
      result.eye &&
      result.code &&
      result.verdict &&
      result.summary &&
      result.confidence !== undefined
    );

    console.log(`📊 Test Summary: ${validResults.length}/${testCases.length} Eyes working`);

    if (validEnvelopes && validResults.length === testCases.length) {
      console.log('✅ All Eyes returned valid typed envelopes!');
      console.log('🎯 AI-powered Eye integration is working correctly!');
    } else {
      console.log('❌ Some Eyes failed or returned invalid envelopes');
      return 1;
    }

    // 5. Check that AI provider was used (not hardcoded logic)
    const hasMetadata = validResults.some(result => result.metadata);
    if (hasMetadata) {
      console.log('✅ Eyes are using AI analysis (metadata present)');
    } else {
      console.log('⚠️  Eyes may not be using AI analysis (no metadata)');
    }

    console.log('\n🧿 Stage 3: Eyes Orchestration Core - COMPLETE! 🎉');
    return 0;

  } catch (error) {
    console.error('❌ AI integration test failed:', error);
    return 1;
  }
}

// Run test
if (import.meta.main) {
  const exitCode = await testAIIntegration();
  process.exit(exitCode);
}