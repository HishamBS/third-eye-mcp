#!/usr/bin/env bun
/**
 * Test Agent Name Capture Fix
 *
 * This script verifies that agent names are properly captured from MCP protocol
 * and stored in the database
 */

import { getDb } from '@third-eye/db';
import { sessions } from '@third-eye/db';
import { desc, sql } from 'drizzle-orm';

async function testAgentNameCapture() {
  console.log('📊 Testing Agent Name Capture Fix\n');

  const { db } = getDb();

  // 1. Check current sessions with agent names
  console.log('1️⃣  Checking existing sessions...');
  const allSessions = await db
    .select({
      id: sessions.id,
      agentName: sessions.agentName,
      model: sessions.model,
      displayName: sessions.displayName,
      status: sessions.status,
      createdAt: sessions.createdAt,
    })
    .from(sessions)
    .orderBy(desc(sessions.createdAt))
    .limit(10);

  console.log(`Found ${allSessions.length} recent sessions:\n`);

  const unknownAgents = allSessions.filter(
    s => !s.agentName || s.agentName === 'Unknown Agent'
  );
  const knownAgents = allSessions.filter(
    s => s.agentName && s.agentName !== 'Unknown Agent'
  );

  console.log(`✅ Known agents: ${knownAgents.length}`);
  console.log(`❌ Unknown agents: ${unknownAgents.length}\n`);

  if (knownAgents.length > 0) {
    console.log('📝 Sessions with known agents:');
    knownAgents.forEach(s => {
      console.log(`  - ${s.agentName} (${s.id.substring(0, 8)}...) - ${s.createdAt.toLocaleString()}`);
    });
    console.log('');
  }

  if (unknownAgents.length > 0) {
    console.log('⚠️  Sessions with unknown agents:');
    unknownAgents.forEach(s => {
      console.log(`  - ${s.agentName || 'NULL'} (${s.id.substring(0, 8)}...) - ${s.createdAt.toLocaleString()}`);
    });
    console.log('');
  }

  // 2. Show agent name distribution
  console.log('2️⃣  Agent name distribution:');
  const distribution = await db
    .select({
      agentName: sessions.agentName,
      count: sql<number>`count(*)`,
    })
    .from(sessions)
    .groupBy(sessions.agentName)
    .orderBy(desc(sql`count(*)`));

  distribution.forEach(d => {
    console.log(`  ${d.agentName || 'NULL'}: ${d.count} sessions`);
  });

  console.log('\n✨ Fix Applied:');
  console.log('   - MCP server now captures client metadata from initialize handshake');
  console.log('   - clientInfo.name and clientInfo.displayName are stored as agent_name');
  console.log('   - New sessions will automatically have agent names populated');
  console.log('\n🔍 To verify:');
  console.log('   1. Connect to Third Eye via Claude Desktop or another MCP client');
  console.log('   2. Call the third_eye_overseer tool');
  console.log('   3. Check the database - new session should show real agent name');
  console.log('\n🗄️  Database query to check:');
  console.log('   SELECT id, agent_name, created_at FROM sessions ORDER BY created_at DESC LIMIT 5;');
}

testAgentNameCapture().catch(console.error);
