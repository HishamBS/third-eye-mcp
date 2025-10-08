import { NextRequest, NextResponse } from 'next/server';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;

  try {
    const body = await request.json();
    const { questionId, answer, allAnswers } = body;

    // Dynamic import to avoid bundling bun:sqlite
    const { getDb, sessions } = await import('@third-eye/db');
    const { db } = getDb();

    // Get current session - use sql template to avoid type conflicts
    const sessionResults = await db
      .select()
      .from(sessions)
      .where(sql`${sessions.id} = ${sessionId}`)
      .limit(1);

    const session = sessionResults[0];

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Update session context with clarification answers
    const currentConfig = session.configJson as any || {};
    const clarifications = currentConfig.clarifications || {};

    if (questionId && answer) {
      clarifications[questionId] = answer;
    } else if (allAnswers) {
      Object.assign(clarifications, allAnswers);
    }

    const updatedConfig = {
      ...currentConfig,
      clarifications,
      lastClarificationUpdate: new Date().toISOString(),
    };

    await db
      .update(sessions)
      .set({
        configJson: updatedConfig,
        lastActivity: new Date(),
      } as any)
      .where(sql`${sessions.id} = ${sessionId}`)

    return NextResponse.json({
      success: true,
      clarifications,
      sessionId,
    });
  } catch (error) {
    console.error('Failed to save clarification:', error);
    return NextResponse.json(
      { error: 'Failed to save clarification' },
      { status: 500 }
    );
  }
}
