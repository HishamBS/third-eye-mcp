import { NextRequest, NextResponse } from 'next/server';

/**
 * Proxy to backend server for MCP run execution
 * POST /api/mcp/run
 */
export async function POST(request: NextRequest) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

  try {
    const body = await request.json();

    const response = await fetch(`${API_URL}/api/mcp/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[API Proxy] Failed to run MCP execution:', error);
    return NextResponse.json(
      { error: 'Failed to execute MCP run' },
      { status: 500 }
    );
  }
}
