import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Custom Eye API] ===== PROXY REQUEST =====');
    console.log('[Custom Eye API] Payload:', JSON.stringify(body, null, 2));
    console.log('[Custom Eye API] Payload types:', {
      name: typeof body.name,
      description: typeof body.description,
      inputSchema: typeof body.inputSchema,
      outputSchema: typeof body.outputSchema,
      personaId: typeof body.personaId,
    });
    console.log('[Custom Eye API] Target URL:', `${API_URL}/api/eyes/custom`);

    const response = await fetch(`${API_URL}/api/eyes/custom`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('[Custom Eye API] Backend response status:', response.status);
    const data = await response.json();
    console.log('[Custom Eye API] Backend response data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('[Custom Eye API] Backend error:', {
        status: response.status,
        data: JSON.stringify(data, null, 2)
      });
    } else {
      console.log('[Custom Eye API] Success:', data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Custom Eye API] Proxy error:', error);
    return NextResponse.json(
      { error: { detail: 'Failed to create custom eye', technical: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}
