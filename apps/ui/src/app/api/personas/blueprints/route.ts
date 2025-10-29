/**
 * Personas Blueprints API
 * 
 * Returns blueprint-based persona data for UI consumption from database
 */

import { NextResponse } from 'next/server';
import { personaBlueprints } from '@third-eye/db/schema';
import { EyeId } from '@third-eye/constants';
import { getEyeIconPath } from '@third-eye/constants';

export interface PersonaBlueprintUI {
  id: string;
  eyeId: EyeId;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  iconPath: string;
  metadata: {
    eyeId: EyeId;
    name: string;
    description: string;
    version: string;
    capabilities: readonly string[];
  };
  mission: string;
  phases: {
    guidance?: {
      stage: string;
      mission: string;
      check: string;
      reminders: readonly string[];
      example: string;
    };
    validation?: {
      stage: string;
      mission: string;
      check: string;
      reminders: readonly string[];
      example: string;
    };
  };
  envelopeContract: {
    requiredKeys: readonly string[];
    requiredDataKeys: readonly string[];
    requiredUiKeys: readonly string[];
  };
  reminders: readonly string[];
  notes?: string;
}

export async function GET() {
  try {
    const { getDb } = await import('@third-eye/db');
    const { db } = getDb();
    
    const dbBlueprints = await db.select().from(personaBlueprints);
    
    const blueprints = dbBlueprints.map(blueprint => ({
      id: blueprint.eyeId,
      eyeId: blueprint.eyeId as EyeId,
      name: blueprint.name,
      description: blueprint.description,
      version: blueprint.version,
      capabilities: JSON.parse(blueprint.capabilities) as string[],
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
    } as PersonaBlueprintUI));

    return NextResponse.json({
      success: true,
      data: blueprints,
      count: blueprints.length,
    });
  } catch (error) {
    console.error('Failed to fetch persona blueprints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch persona blueprints' },
      { status: 500 }
    );
  }
}


