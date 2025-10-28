/**
 * Personas Blueprints API
 * 
 * Returns blueprint-based persona data for UI consumption
 */

import { NextResponse } from 'next/server';
import { BLUEPRINT_REGISTRY } from '@third-eye/eyes/blueprint-client';
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

export function GET() {
  try {
    const blueprints = Object.entries(BLUEPRINT_REGISTRY).map(([eyeId, blueprint]) => {
      return {
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
      } as PersonaBlueprintUI;
    });

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


