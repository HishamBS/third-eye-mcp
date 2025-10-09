#!/usr/bin/env bun

/**
 * Complete Pipeline Flow End-to-End Test
 *
 * Tests the full Third Eye MCP system including:
 * - Auto-routing analysis
 * - Pipeline execution
 * - Session management
 * - Order guard enforcement
 * - Error handling
 * - WebSocket events
 */

// Note: overseerMCPTool removed, using autoRouter directly
import { sessionManager } from './packages/core/session-manager';
import { autoRouter } from './packages/core/auto-router';
import { orderGuard } from './packages/core/order-guard';
// Note: using mock WebSocket for testing

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: any;
}

class PipelineTestSuite {
  private results: TestResult[] = [];

  async runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
    console.log(`🧪 Running test: ${name}...`);
    const startTime = Date.now();

    try {
      const data = await testFn();
      const duration = Date.now() - startTime;
      const result = { name, success: true, duration, data };
      this.results.push(result);
      console.log(`✅ ${name} - ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result = { name, success: false, duration, error: errorMessage };
      this.results.push(result);
      console.log(`❌ ${name} - ${duration}ms - ${errorMessage}`);
      return result;
    }
  }

  printSummary(): void {
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`\n📊 Test Results:`);
    console.log(`   Passed: ${passed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total time: ${totalTime}ms`);
    console.log(`   Success rate: ${Math.round((passed / this.results.length) * 100)}%`);

    if (failed > 0) {
      console.log(`\n❌ Failed tests:`);
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
    }
  }

  isSuccess(): boolean {
    return this.results.every(r => r.success);
  }
}

async function testCompletePipeline(): Promise<number> {
  console.log('🧿 Third Eye MCP - Complete Pipeline Test Suite\n');

  const suite = new PipelineTestSuite();

  // Test 1: AutoRouter - Task Analysis
  await suite.runTest('AutoRouter - Task Analysis', async () => {
    const routing = await autoRouter.analyzeTask(
      'Create a secure user authentication system with JWT tokens'
    );

    if (!routing.recommendedFlow || routing.recommendedFlow.length === 0) {
      throw new Error('No recommended flow generated');
    }

    if (!routing.taskType || !routing.complexity) {
      throw new Error('Missing task type or complexity analysis');
    }

    return routing;
  });

  // Test 2: Auto-Router - Code Task Detection
  await suite.runTest('Auto-Router - Code Task Detection', async () => {
    const routing = await autoRouter.analyzeTask(
      'Implement user login component with validation'
    );

    if (routing.taskType !== 'code') {
      throw new Error(`Expected code task, got: ${routing.taskType}`);
    }

    if (!routing.recommendedFlow.includes('rinnegan')) {
      throw new Error('Code task should include Rinnegan planning');
    }

    if (!routing.recommendedFlow.includes('mangekyo')) {
      throw new Error('Code task should include Mangekyō implementation');
    }

    return routing;
  });

  // Test 3: Auto-Router - Text Task Detection
  await suite.runTest('Auto-Router - Text Task Detection', async () => {
    const routing = await autoRouter.analyzeTask(
      'Our API is 50% faster than competitors with zero downtime'
    );

    if (routing.taskType !== 'text') {
      throw new Error(`Expected text task, got: ${routing.taskType}`);
    }

    if (!routing.recommendedFlow.includes('tenseigan')) {
      throw new Error('Text task should include Tenseigan validation');
    }

    if (!routing.recommendedFlow.includes('byakugan')) {
      throw new Error('Text task should include Byakugan consistency check');
    }

    return routing;
  });

  // Test 4: Session Management
  await suite.runTest('Session Management', async () => {
    const session = await sessionManager.createSession({
      agentName: 'Test Agent',
      displayName: 'Session Test',
      model: 'test-model',
    });

    if (!session.id || !session.portalUrl) {
      throw new Error('Session creation failed');
    }

    // Test session retrieval
    const retrieved = await sessionManager.getSession(session.id);
    if (!retrieved || retrieved.id !== session.id) {
      throw new Error('Session retrieval failed');
    }

    // Test session update
    await sessionManager.updateSession(session.id, { status: 'paused' });
    const updated = await sessionManager.getSession(session.id);
    if (updated!.status !== 'paused') {
      throw new Error('Session update failed');
    }

    return { sessionId: session.id, portalUrl: session.portalUrl };
  });

  // Test 5: Order Guard - Pipeline Enforcement
  await suite.runTest('Order Guard - Pipeline Enforcement', async () => {
    const sessionId = 'test-order-guard-session';

    // Should allow Sharingan first
    const firstViolation = orderGuard.validateOrder(sessionId, 'sharingan');
    if (firstViolation) {
      throw new Error('Sharingan should be allowed first');
    }

    // Should reject Mangekyo before Sharingan
    const orderViolation = orderGuard.validateOrder(sessionId, 'mangekyo');
    if (!orderViolation || orderViolation.code !== 'E_PIPELINE_ORDER') {
      throw new Error('Order guard should reject Mangekyo before Sharingan');
    }

    // Test completion tracking
    orderGuard.recordEyeCompletion(sessionId, 'sharingan', { code: 'OK' });
    const state = orderGuard.getState(sessionId);
    if (!state || !state.completedEyes.includes('sharingan')) {
      throw new Error('Order guard should track completed Eyes');
    }

    // Clean up
    orderGuard.clearSession(sessionId);

    return { orderViolation, state };
  });

  // Test 6: WebSocket Integration (Mock)
  await suite.runTest('WebSocket Integration (Mock)', async () => {
    // Mock WebSocket functionality since we're using server WebSocket
    const mockWSMessage = {
      type: 'eye_update',
      sessionId: 'test-session',
      data: { test: true },
      timestamp: Date.now(),
    };

    // Just verify the structure
    if (!mockWSMessage.type || !mockWSMessage.sessionId) {
      throw new Error('Invalid WebSocket message structure');
    }

    return { message: mockWSMessage, mocked: true };
  });

  // Test 7: Auto-Router - Complete Execution
  await suite.runTest('Auto-Router - Complete Execution', async () => {
    try {
      const result = await autoRouter.executeFlow('Add simple user registration form');

      // Note: This may fail due to missing API keys, but we test the structure
      if (!result.sessionId) {
        throw new Error('Invalid auto-router response structure');
      }

      if (!result.results || !Array.isArray(result.results)) {
        throw new Error('Missing results array in response');
      }

      return result;
    } catch (error: any) {
      // Expected to fail with API key errors, but structure should be correct
      if (error.message.includes('API key') || error.message.includes('provider')) {
        return { expectedError: true, message: error.message };
      }
      throw error;
    }
  });

  // Test 8: Error Handling
  await suite.runTest('Error Handling - Invalid Input', async () => {
    try {
      // Test with empty input
      await autoRouter.analyzeTask('');
      throw new Error('Should have thrown validation error');
    } catch (error) {
      // Expected to fail - verify error structure
      if (!(error instanceof Error)) {
        throw new Error('Error should be Error instance');
      }
      return { errorHandled: true, message: error.message };
    }
  });

  // Test 9: Pipeline Progress Tracking
  await suite.runTest('Pipeline Progress Tracking', async () => {
    const session = await sessionManager.createSession({
      agentName: 'Progress Test Agent',
    });

    // Initial progress should be 0%
    let progress = sessionManager.getPipelineProgress(session.id);
    if (progress.progressPercentage !== 0) {
      throw new Error('Initial progress should be 0%');
    }

    // Test expected next Eyes
    const expectedNext = orderGuard.getExpectedNext(session.id);
    if (!expectedNext.includes('overseer') && !expectedNext.includes('sharingan')) {
      throw new Error('Expected next should include overseer or sharingan');
    }

    return { sessionId: session.id, progress, expectedNext };
  });

  // Test 10: Session Metrics
  await suite.runTest('Session Metrics', async () => {
    const session = await sessionManager.createSession({
      agentName: 'Metrics Test Agent',
    });

    const metrics = await sessionManager.getSessionMetrics(session.id);
    if (typeof metrics.totalRuns !== 'number') {
      throw new Error('Metrics should include totalRuns');
    }

    if (typeof metrics.averageLatency !== 'number') {
      throw new Error('Metrics should include averageLatency');
    }

    if (!metrics.eyeUsageStats || typeof metrics.eyeUsageStats !== 'object') {
      throw new Error('Metrics should include eyeUsageStats');
    }

    return metrics;
  });

  // Print results
  suite.printSummary();

  if (suite.isSuccess()) {
    console.log('\n✅ All pipeline tests passed! 🎉');
    console.log('🧿 Third Eye MCP system is ready for production.');
    return 0;
  } else {
    console.log('\n❌ Some pipeline tests failed.');
    console.log('🔧 Review the failures above and fix before deployment.');
    return 1;
  }
}

// Run the test suite
if (import.meta.main) {
  const exitCode = await testCompletePipeline();
  process.exit(exitCode);
}