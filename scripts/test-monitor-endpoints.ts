#!/usr/bin/env bun
/**
 * Test Monitor Page Endpoints
 *
 * Verifies that all API endpoints used by the Monitor page work correctly
 */

const API_URL = process.env.API_URL || 'http://127.0.0.1:7070';

interface TestResult {
  endpoint: string;
  status: 'PASS' | 'FAIL';
  statusCode?: number;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(name: string, url: string, method: string = 'GET', body?: any): Promise<TestResult> {
  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      endpoint: name,
      status: response.ok ? 'PASS' : 'FAIL',
      statusCode: response.status,
      data: response.ok ? data : undefined,
      error: response.ok ? undefined : data.detail || data.error || 'Unknown error'
    };
  } catch (error) {
    return {
      endpoint: name,
      status: 'FAIL',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main() {
  console.log('🧪 Testing Monitor Page Endpoints\n');
  console.log(`API URL: ${API_URL}\n`);

  // Test 1: Create a test session
  console.log('1️⃣  Creating test session...');
  const createResult = await testEndpoint(
    'POST /api/session',
    `${API_URL}/api/session`,
    'POST',
    { config: { test: true } }
  );
  results.push(createResult);

  if (createResult.status === 'FAIL') {
    console.error('❌ Failed to create test session. Cannot continue tests.');
    console.error('   Error:', createResult.error);
    process.exit(1);
  }

  const sessionId = createResult.data?.data?.sessionId || createResult.data?.sessionId;

  if (!sessionId) {
    console.error('❌ No sessionId in response:', createResult.data);
    process.exit(1);
  }

  console.log(`✅ Created session: ${sessionId}\n`);

  // Test 2: Get session summary
  console.log('2️⃣  Fetching session summary...');
  const summaryResult = await testEndpoint(
    'GET /api/session/:id/summary',
    `${API_URL}/api/session/${sessionId}/summary`
  );
  results.push(summaryResult);

  if (summaryResult.status === 'PASS') {
    const summary = summaryResult.data?.data || summaryResult.data;
    console.log(`✅ Summary: Status=${summary.status}, Events=${summary.eventCount}, Eyes=${summary.eyes?.length || 0}\n`);
  } else {
    console.error(`❌ Failed: ${summaryResult.error}\n`);
  }

  // Test 3: Get session events
  console.log('3️⃣  Fetching session events...');
  const eventsResult = await testEndpoint(
    'GET /api/session/:id/events',
    `${API_URL}/api/session/${sessionId}/events`
  );
  results.push(eventsResult);

  if (eventsResult.status === 'PASS') {
    const events = eventsResult.data?.data || eventsResult.data || [];
    console.log(`✅ Events: ${Array.isArray(events) ? events.length : 'Invalid format'}\n`);
  } else {
    console.error(`❌ Failed: ${eventsResult.error}\n`);
  }

  // Test 4: Get active sessions
  console.log('4️⃣  Fetching active sessions...');
  const activeResult = await testEndpoint(
    'GET /api/session/active',
    `${API_URL}/api/session/active`
  );
  results.push(activeResult);

  if (activeResult.status === 'PASS') {
    const sessions = activeResult.data?.data?.sessions || activeResult.data?.sessions || [];
    console.log(`✅ Active sessions: ${sessions.length}\n`);
  } else {
    console.error(`❌ Failed: ${activeResult.error}\n`);
  }

  // Test 5: WebSocket status
  console.log('5️⃣  Checking WebSocket status...');
  const wsStatusResult = await testEndpoint(
    'GET /ws/status',
    `${API_URL}/ws/status`
  );
  results.push(wsStatusResult);

  if (wsStatusResult.status === 'PASS') {
    const wsData = wsStatusResult.data?.websocket || wsStatusResult.data;
    console.log(`✅ WebSocket: Enabled=${wsData.enabled}, Endpoint=${wsData.endpoint}\n`);
    if (wsData.stats) {
      console.log(`   Stats: ${wsData.stats.totalConnections} connections, ${wsData.stats.activeSessions} sessions\n`);
    }
  } else {
    console.error(`❌ Failed: ${wsStatusResult.error}\n`);
  }

  // Test 6: Health check
  console.log('6️⃣  Health check...');
  const healthResult = await testEndpoint(
    'GET /health',
    `${API_URL}/health`
  );
  results.push(healthResult);

  if (healthResult.status === 'PASS') {
    const health = healthResult.data;
    console.log(`✅ Health: ${health.status}, Version=${health.version}\n`);
  } else {
    console.error(`❌ Failed: ${healthResult.error}\n`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`   - ${r.endpoint}: ${r.error}`);
      });
  }

  console.log('='.repeat(60));

  // Cleanup: Delete test session
  console.log('\n🧹 Cleaning up test session...');
  try {
    await fetch(`${API_URL}/api/session/bulk`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds: [sessionId] })
    });
    console.log('✅ Test session deleted\n');
  } catch (error) {
    console.warn('⚠️  Failed to delete test session:', error);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
