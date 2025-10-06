#!/usr/bin/env bun

/**
 * Persona Importer
 *
 * Imports existing personas from Python third_eye/personas.py
 * into SQLite personas table (version 1 active)
 */

import { getDb } from './index.js';
import { personas } from './schema.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface PersonaData {
  eye: string;
  content: string;
}

/**
 * Extract personas from Python personas.py file
 */
function extractPersonasFromPython(): PersonaData[] {
  const personasPath = resolve(process.cwd(), 'legacy-python/personas.py');

  if (!existsSync(personasPath)) {
    console.log('⚠️  Python personas.py not found at:', personasPath);
    return getDefaultPersonas();
  }

  try {
    const personasFile = readFileSync(personasPath, 'utf-8');
    const extractedPersonas: PersonaData[] = [];

    // Extract SHARINGAN persona
    const sharinganMatch = personasFile.match(/PersonaKey\.SHARINGAN\.value.*?system_prompt=\(\s*"([^"]+(?:"|\\.|[^"\\])*?)"/s);
    if (sharinganMatch) {
      extractedPersonas.push({
        eye: 'sharingan',
        content: cleanPersonaContent(sharinganMatch[1])
      });
    }

    // Extract RINNEGAN persona
    const rinneganMatch = personasFile.match(/RinneganPersona\([^}]+system_prompt=\(\s*"([^"]+(?:"|\\.|[^"\\])*?)"/s);
    if (rinneganMatch) {
      extractedPersonas.push({
        eye: 'rinnegan',
        content: cleanPersonaContent(rinneganMatch[1])
      });
    }

    // Extract TENSEIGAN persona
    const tenseiganMatch = personasFile.match(/TenseiganPersona\([^}]+system_prompt=\(\s*"([^"]+(?:"|\\.|[^"\\])*?)"/s);
    if (tenseiganMatch) {
      extractedPersonas.push({
        eye: 'tenseigan',
        content: cleanPersonaContent(tenseiganMatch[1])
      });
    }

    console.log(`✅ Extracted ${extractedPersonas.length} personas from Python`);
    return extractedPersonas.length > 0 ? extractedPersonas : getDefaultPersonas();

  } catch (error) {
    console.error('❌ Error parsing personas.py:', error);
    return getDefaultPersonas();
  }
}

/**
 * Clean and format persona content
 */
function cleanPersonaContent(content: string): string {
  return content
    .replace(/\\n/g, '\n')
    .replace(/\\\"/g, '"')
    .replace(/\\\\/g, '\\')
    .trim();
}

/**
 * Default personas if Python extraction fails
 */
function getDefaultPersonas(): PersonaData[] {
  return [
    {
      eye: 'sharingan',
      content: `You are SHARINGAN, the Ambiguity Radar and Classifier. You never generate deliverables.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Classification and summarise the branch selection.
- data MUST contain score, ambiguous, x, is_code_related, reasoning_md, questions_md, and policy_md.

Classification rules:
- CODE if the prompt requests code/diffs/tests/docs, mentions repos/tooling, file extensions, code fences, or framework/tech tokens.
- GENERAL for educational content, explanations, discussions, or non-technical queries.

Your role is to classify user inputs and identify ambiguity for proper routing.`
    },
    {
      eye: 'rinnegan',
      content: `You are RINNEGAN, the Strategic Planner and Code Architect.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- Focus on strategic planning, architecture decisions, and implementation roadmaps.
- Provide comprehensive analysis of technical challenges and solutions.
- Break down complex problems into manageable implementation steps.

Your role is to create detailed plans and architectural guidance for complex technical implementations.`
    },
    {
      eye: 'tenseigan',
      content: `You are TENSEIGAN, the Claims Validator and Quality Assurance Specialist.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- Validate claims and assertions for accuracy and completeness.
- Focus on quality assurance, testing strategies, and verification processes.
- Identify potential issues, edge cases, and improvement opportunities.

Your role is to ensure quality, validate claims, and provide comprehensive testing and validation guidance.`
    }
  ];
}

/**
 * Import personas into SQLite database
 */
async function importPersonas() {
  console.log('🔄 Starting persona import...');

  const { db } = getDb();
  const personaData = extractPersonasFromPython();

  for (const persona of personaData) {
    try {
      // Insert persona as version 1 and mark as active
      await db.insert(personas).values({
        eye: persona.eye,
        version: 1,
        content: persona.content,
        active: true,
        createdAt: new Date()
      }).onConflictDoUpdate({
        target: [personas.eye, personas.version],
        set: {
          content: persona.content,
          active: true
        }
      });

      console.log(`✅ Imported persona: ${persona.eye} (version 1, active)`);
    } catch (error) {
      console.error(`❌ Failed to import persona ${persona.eye}:`, error);
    }
  }

  console.log(`🎉 Persona import completed! Imported ${personaData.length} personas.`);
}

// Run if called directly
if (import.meta.main) {
  importPersonas().catch(console.error);
}

export { importPersonas, extractPersonasFromPython };