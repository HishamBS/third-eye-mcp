import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/consts/api';

/**
 * Proxy to backend server for session pipeline events
 * GET /api/session/:id/events
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const response = await fetch(`${API_BASE_URL}/api/session/${id}/events`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[API Proxy] Failed to fetch events for session ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch session events' },
      { status: 500 }
    );
  }
}
