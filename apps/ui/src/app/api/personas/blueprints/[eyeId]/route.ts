import { NextRequest, NextResponse } from 'next/server';
import { getPersonaBlueprint } from '@third-eye/eyes';
import { EyeId } from '@third-eye/constants';
import { getEyeIconPath } from '@third-eye/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: { eyeId: string } }
) {
  try {
    const eyeId = params.eyeId;
    const blueprint = getPersonaBlueprint(eyeId);
    
    if (!blueprint) {
      return NextResponse.json(
        { success: false, error: 'Blueprint not found' },
        { status: 404 }
      );
    }

    const personaBlueprint = {
      id: eyeId,
      eyeId: eyeId as EyeId,
      name: blueprint.metadata.name,
      description: blueprint.metadata.description,
      version: blueprint.metadata.version,
      capabilities: blueprint.metadata.capabilities as string[],
      iconPath: getEyeIconPath(eyeId as EyeId),
      metadata: blueprint.metadata,
      mission: blueprint.mission,
      phases: blueprint.phases,
      envelopeContract: blueprint.envelopeContract,
      reminders: blueprint.reminders,
      notes: blueprint.notes,
    };

    return NextResponse.json({
      success: true,
      data: personaBlueprint,
    });
  } catch (error) {
    console.error(`Failed to fetch persona blueprint:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blueprint' },
      { status: 500 }
    );
  }
}

