#!/usr/bin/env bun
/**
 * Seed System Pipeline
 *
 * Creates a comprehensive "system-default" pipeline demonstrating all features.
 * This pipeline serves as both:
 * 1. The default selected pipeline in the UI
 * 2. A learning example for users to understand pipeline capabilities
 */

import { getDb } from '@third-eye/db';
import { pipelines } from '@third-eye/db';
import { nanoid } from 'nanoid';

const SYSTEM_PIPELINE = {
  name: 'system-default',
  version: 1,
  description: 'Comprehensive multi-Eye validation workflow demonstrating all pipeline capabilities including sequential validation, conditional branching, and user approval gates.',
  category: 'built-in',
  workflow: {
    steps: [
      {
        id: 'start',
        eye: 'overseer',
        description: 'Pipeline entry point - provides overview and contract',
        next: 'clarify'
      },
      {
        id: 'clarify',
        eye: 'sharingan',
        description: 'Detect ambiguities and classify code type',
        next: 'ambiguity_check'
      },
      {
        id: 'ambiguity_check',
        type: 'condition',
        description: 'Check if clarifications are needed',
        condition: 'data.needsClarification === true',
        true: 'user_clarify',
        false: 'rewrite_prompt'
      },
      {
        id: 'user_clarify',
        type: 'user_input',
        description: 'User provides clarifications for ambiguous requirements',
        prompt: 'Please provide clarifications for the detected ambiguities',
        next: 'rewrite_prompt'
      },
      {
        id: 'rewrite_prompt',
        eye: 'helper',
        description: 'Restructure prompt into ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format',
        next: 'confirm_intent'
      },
      {
        id: 'confirm_intent',
        eye: 'jogan',
        description: 'Verify all required prompt sections are present',
        next: 'intent_check'
      },
      {
        id: 'intent_check',
        type: 'condition',
        description: 'Check if intent is confirmed',
        condition: 'data.intentConfirmed === true',
        true: 'plan_requirements',
        false: 'rewrite_prompt'
      },
      {
        id: 'plan_requirements',
        eye: 'rinnegan',
        description: 'Emit plan schema and requirements',
        next: 'user_plan'
      },
      {
        id: 'user_plan',
        type: 'user_input',
        description: 'User submits implementation plan',
        prompt: 'Please submit your implementation plan following the provided schema',
        next: 'plan_review'
      },
      {
        id: 'plan_review',
        eye: 'rinnegan',
        description: 'Review submitted plan against requirements',
        next: 'plan_approved_check'
      },
      {
        id: 'plan_approved_check',
        type: 'condition',
        description: 'Check if plan is approved',
        condition: 'data.planApproved === true',
        true: 'scaffold_review',
        false: 'user_plan'
      },
      {
        id: 'scaffold_review',
        eye: 'mangekyo',
        description: 'Validate file structure plan',
        next: 'impl_review'
      },
      {
        id: 'impl_review',
        eye: 'mangekyo',
        description: 'Review implementation diffs and reasoning',
        next: 'consistency_check'
      },
      {
        id: 'consistency_check',
        eye: 'byakugan',
        description: 'Detect contradictions and verify consistency',
        next: 'validate_claims'
      },
      {
        id: 'validate_claims',
        eye: 'tenseigan',
        description: 'Validate citations for factual claims',
        next: 'test_review'
      },
      {
        id: 'test_review',
        eye: 'mangekyo',
        description: 'Review test coverage against thresholds',
        next: 'docs_review'
      },
      {
        id: 'docs_review',
        eye: 'mangekyo',
        description: 'Validate documentation updates',
        next: 'final_approval'
      },
      {
        id: 'final_approval',
        eye: 'rinnegan',
        description: 'Final approval gate checking all validation phases',
        next: 'approval_check'
      },
      {
        id: 'approval_check',
        type: 'condition',
        description: 'Check if final approval is granted',
        condition: 'data.approved === true',
        true: 'complete',
        false: 'impl_review'
      },
      {
        id: 'complete',
        type: 'terminal',
        description: 'Pipeline execution complete - all validations passed'
      }
    ]
  }
};

async function seedSystemPipeline() {
  console.log('🌱 Seeding system-default pipeline...\n');

  const { db } = getDb();

  try {
    // Check if system-default pipeline already exists
    const existing = await db
      .select()
      .from(pipelines)
      .where((p: any) => p.name === SYSTEM_PIPELINE.name)
      .all();

    if (existing.length > 0) {
      console.log('⚠️  System pipeline already exists. Deactivating old versions...');
      // Deactivate all existing versions
      await db
        .update(pipelines)
        .set({ active: false })
        .where((p: any) => p.name === SYSTEM_PIPELINE.name)
        .run();
    }

    // Insert new system pipeline
    const id = nanoid();
    await db.insert(pipelines).values({
      id,
      name: SYSTEM_PIPELINE.name,
      version: SYSTEM_PIPELINE.version,
      description: SYSTEM_PIPELINE.description,
      workflowJson: SYSTEM_PIPELINE.workflow,
      category: SYSTEM_PIPELINE.category,
      active: true,
      createdAt: new Date(),
    }).run();

    console.log('✅ System pipeline created successfully!');
    console.log(`   ID: ${id}`);
    console.log(`   Name: ${SYSTEM_PIPELINE.name}`);
    console.log(`   Steps: ${SYSTEM_PIPELINE.workflow.steps.length}`);
    console.log(`   Eyes used: ${SYSTEM_PIPELINE.workflow.steps.filter(s => s.eye).map(s => s.eye).join(', ')}`);
    console.log(`   Conditional branches: ${SYSTEM_PIPELINE.workflow.steps.filter(s => s.type === 'condition').length}`);
    console.log(`   User input steps: ${SYSTEM_PIPELINE.workflow.steps.filter(s => s.type === 'user_input').length}`);
    console.log('\n🎉 System pipeline seeded successfully!');

  } catch (error) {
    console.error('❌ Failed to seed system pipeline:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.main) {
  seedSystemPipeline()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedSystemPipeline };
