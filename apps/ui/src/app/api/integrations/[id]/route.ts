import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    console.log('[Integrations API] Update request:', params.id, JSON.stringify(body, null, 2));

    const response = await fetch(`${API_URL}/api/integrations/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Integrations API] Update error:', {
        status: response.status,
        data: JSON.stringify(data, null, 2)
      });
    } else {
      console.log('[Integrations API] Update success:', data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Integrations API] Update proxy error:', error);
    return NextResponse.json(
      { error: { detail: 'Failed to update integration', technical: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('[Integrations API] Delete request:', params.id);

    const response = await fetch(`${API_URL}/api/integrations/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Integrations API] Delete error:', {
        status: response.status,
        data: JSON.stringify(data, null, 2)
      });
    } else {
      console.log('[Integrations API] Delete success:', data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Integrations API] Delete proxy error:', error);
    return NextResponse.json(
      { error: { detail: 'Failed to delete integration', technical: error instanceof Error ? error.message : String(error) } },
      { status: 500 }
    );
  }
}
