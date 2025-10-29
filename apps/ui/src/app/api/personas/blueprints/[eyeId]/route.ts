import { NextRequest, NextResponse } from 'next/server';
import { personaBlueprints, type NewPersonaBlueprint, type PersonaBlueprint } from '@third-eye/db/schema';
import { EyeId } from '@third-eye/constants';
import { getEyeIconPath } from '@third-eye/constants';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eyeId: string }> }
) {
  try {
    const { eyeId } = await params;
    
    const { getDb } = await import('@third-eye/db');
    const { db } = getDb();
    
    const blueprint = await db
      .select()
      .from(personaBlueprints)
      .where({ eyeId })
      .get();
    
    if (!blueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: blueprint.eyeId,
        eyeId: blueprint.eyeId as EyeId,
        name: blueprint.name,
        description: blueprint.description,
        version: blueprint.version,
        capabilities: JSON.parse(blueprint.capabilities),
        iconPath: getEyeIconPath(blueprint.eyeId as EyeId),
        metadata: {
          eyeId: blueprint.eyeId as EyeId,
          name: blueprint.name,
          description: blueprint.description,
          version: blueprint.version,
          capabilities: JSON.parse(blueprint.capabilities),
        },
        mission: blueprint.mission,
        phases: JSON.parse(blueprint.phases),
        envelopeContract: JSON.parse(blueprint.envelopeContract),
        reminders: JSON.parse(blueprint.reminders || '[]'),
        notes: blueprint.notes || undefined,
      },
    });
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
    
    const { getDb } = await import('@third-eye/db');
    const { db } = getDb();
    
    const now = new Date();
    
    const blueprint: NewPersonaBlueprint = {
      eyeId,
      name: body.name,
      description: body.description,
      version: body.version,
      capabilities: JSON.stringify(body.capabilities || []),
      mission: body.mission,
      phases: JSON.stringify(body.phases || {}),
      envelopeContract: JSON.stringify(body.envelopeContract || {}),
      reminders: JSON.stringify(body.reminders || []),
      notes: body.notes || null,
      createdAt: body.createdAt ? new Date(body.createdAt) : now,
      updatedAt: now,
    };
    
    // Get existing blueprint to preserve createdAt
    const existing = await db
      .select()
      .from(personaBlueprints)
      .where({ eyeId })
      .get();
    
    if (existing) {
      blueprint.createdAt = existing.createdAt;
    }
    
    await db
      .insert(personaBlueprints)
      .values(blueprint)
      .onConflictDoUpdate({
        target: personaBlueprints.eyeId,
        set: {
          name: blueprint.name,
          description: blueprint.description,
          version: blueprint.version,
          capabilities: blueprint.capabilities,
          mission: blueprint.mission,
          phases: blueprint.phases,
          envelopeContract: blueprint.envelopeContract,
          reminders: blueprint.reminders,
          notes: blueprint.notes,
          updatedAt: blueprint.updatedAt,
        },
      });
    
    // Trigger TypeScript file sync
    try {
      const { syncBlueprintsToCode } = await import('@third-eye/eyes/seeds');
      await syncBlueprintsToCode();
    } catch (e) {
      console.warn('Could not sync blueprints to code:', e);
    }
    
    return NextResponse.json({
      success: true,
      data: blueprint,
    });
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
    
    const { getDb } = await import('@third-eye/db');
    const { db } = getDb();
    
    await db.delete(personaBlueprints).where({ eyeId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete blueprint:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete blueprint' },
      { status: 500 }
    );
  }
}
