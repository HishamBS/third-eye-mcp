import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@third-eye/db';
import { sessions } from '@third-eye/db';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionId = params.id;

  try {
    const body = await request.json();
    const { questionId, answer, allAnswers } = body;

    const { db } = getDb();

    // Get current session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .get();

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
      })
      .where(eq(sessions.id, sessionId))
      .run();

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
