/**
 * Personas Blueprints API
 * 
 * Returns blueprint-based persona data for UI consumption from database
 */

import { NextResponse } from 'next/server';
import { API_BASE_URL } from '@/consts/api';

export interface PersonaBlueprintUI {
  id: string;
  eyeId: string;
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
    // Proxy to server API to avoid bun:sqlite import issues in Next.js
    const serverResponse = await fetch(`${API_BASE_URL}/api/personas/blueprints`);
    
    if (!serverResponse.ok) {
      throw new Error(`Server API returned ${serverResponse.status}`);
    }
    
    const serverData = await serverResponse.json();
    return NextResponse.json(serverData);
  } catch (error) {
    console.error('Failed to fetch persona blueprints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch persona blueprints' },
      { status: 500 }
    );
  }
}


