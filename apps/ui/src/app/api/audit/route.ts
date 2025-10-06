import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@third-eye/db';
import { runs, pipelineEvents } from '@third-eye/db';
import { desc, and, gte, lte, eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const tenant = searchParams.get('tenant');
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  const limit = parseInt(searchParams.get('limit') || '100', 10);

  try {
    const { db } = getDb();

    // Build filters
    const filters = [];
    if (since) {
      const sinceDate = new Date(parseInt(since) * 1000);
      filters.push(gte(pipelineEvents.createdAt, sinceDate));
    }
    if (until) {
      const untilDate = new Date(parseInt(until) * 1000);
      filters.push(lte(pipelineEvents.createdAt, untilDate));
    }

    // Query pipeline events as audit records
    const events = await db
      .select()
      .from(pipelineEvents)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(pipelineEvents.createdAt))
      .limit(limit)
      .all();

    // Transform to audit record format
    const auditRecords = events.map((event) => ({
      id: event.id,
      timestamp: event.createdAt,
      sessionId: event.sessionId,
      eye: event.eye || 'system',
      type: event.type,
      code: event.code,
      message: event.md || '',
      data: event.dataJson,
      nextAction: event.nextAction,
    }));

    return NextResponse.json(auditRecords);
  } catch (error) {
    console.error('Failed to fetch audit records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit records' },
      { status: 500 }
    );
  }
}
