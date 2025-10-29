import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eyeId: string }> }
) {
  try {
    const { eyeId } = await params;
    
    // Proxy to server API to avoid bun:sqlite import issues
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
    const serverResponse = await fetch(`${API_URL}/api/personas/blueprints/${eyeId}`);
    
    if (!serverResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }
    
    const serverData = await serverResponse.json();
    return NextResponse.json(serverData);
  } catch (error) {
    console.error('Failed to fetch blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blueprint' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eyeId: string }> }
) {
  try {
    const { eyeId } = await params;
    const body = await req.json();
    
    // Proxy PUT to server API
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
    const serverResponse = await fetch(`${API_URL}/api/personas/blueprints/${eyeId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    if (!serverResponse.ok) {
      throw new Error(`Server API returned ${serverResponse.status}`);
    }
    
    const serverData = await serverResponse.json();
    return NextResponse.json(serverData);
  } catch (error) {
    console.error('Failed to update blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update blueprint' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eyeId: string }> }
) {
  try {
    const { eyeId } = await params;
    
    // Proxy DELETE to server API
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
    const serverResponse = await fetch(`${API_URL}/api/personas/blueprints/${eyeId}`, {
      method: 'DELETE',
    });
    
    if (!serverResponse.ok) {
      throw new Error(`Server API returned ${serverResponse.status}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete blueprint' },
      { status: 500 }
    );
  }
}
