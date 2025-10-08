import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

export async function GET(req: NextRequest) {
  try {
    const response = await fetch(`${API_URL}/api/integrations`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('API proxy error:', error);
    return NextResponse.json(
      { error: { detail: 'Failed to fetch integrations' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Integrations API] Create request:', JSON.stringify(body, null, 2));

    const response = await fetch(`${API_URL}/api/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Integrations API] Backend error:', {
        status: response.status,
        data: JSON.stringify(data, null, 2)
      });
    } else {
      console.log('[Integrations API] Success:', data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Integrations API] Proxy error:', error);
    return NextResponse.json(
      { error: { detail: 'Failed to create integration', technical: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}
