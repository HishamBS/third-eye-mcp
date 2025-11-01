import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/consts/api';

/**
 * Proxy to backend server for session runs
 * GET /api/session/:id/runs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const response = await fetch(`${API_BASE_URL}/api/session/${id}/runs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const payload = data?.data ?? data;
    const runs = Array.isArray(payload) ? payload : payload?.runs ?? [];
    return NextResponse.json(runs, { status: response.status });
  } catch (error) {
    console.error(`[API Proxy] Failed to fetch runs for session ${id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch session runs' },
      { status: 500 }
    );
  }
}
