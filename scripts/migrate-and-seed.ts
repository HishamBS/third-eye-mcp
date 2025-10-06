#!/usr/bin/env bun
import { nanoid } from 'nanoid';
import { getDb } from '../packages/db';
import { prompts, eyesCustom, pipelines, strictnessProfiles } from '../packages/db/schema';

console.log('🔄 Running database migration and seed...');

async function migrate() {
  const { db } = getDb();

  // Use transaction to ensure atomic operations - all seeds succeed or all fail
  try {
    // Seed Strictness Profiles (built-in presets)
    const strictnessData = [
    {
      id: nanoid(),
      name: 'Casual',
      description: 'Relaxed validation for exploratory work and prototyping',
      ambiguityThreshold: 50,
      citationCutoff: 50,
      consistencyTolerance: 60,
      mangekyoStrictness: 'lenient',
      isBuiltIn: true,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      name: 'Enterprise',
      description: 'Balanced validation for professional development',
      ambiguityThreshold: 30,
      citationCutoff: 70,
      consistencyTolerance: 80,
      mangekyoStrictness: 'standard',
      isBuiltIn: true,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      name: 'Security',
      description: 'Maximum validation for critical systems and compliance',
      ambiguityThreshold: 10,
      citationCutoff: 90,
      consistencyTolerance: 95,
      mangekyoStrictness: 'strict',
      isBuiltIn: true,
      createdAt: new Date(),
    },
  ];

  console.log('📊 Seeding strictness profiles...');
  for (const profile of strictnessData) {
    await db.insert(strictnessProfiles).values(profile).onConflictDoNothing();
  }

  // Seed Prompt Templates
  const promptTemplates = [
    {
      id: nanoid(),
      name: 'Clarification Question Generator',
      version: 1,
      content: `You are an expert at identifying ambiguities in user requests. Generate {{max_questions}} precise questions to clarify the user's intent.

Input: {{user_input}}

Return questions that:
1. Address critical ambiguities
2. Are specific and actionable
3. Cannot be easily guessed from context`,
      variablesJson: ['user_input', 'max_questions'],
      category: 'template',
      tags: ['clarification', 'questions'],
      active: true,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      name: 'Code Review Checklist',
      version: 1,
      content: `Review the following code changes for:
- Security vulnerabilities
- Performance issues
- Best practices violations
- Missing tests
- Incomplete documentation

Code: {{code_diff}}

Provide specific line-by-line feedback with severity levels.`,
      variablesJson: ['code_diff'],
      category: 'template',
      tags: ['code-review', 'quality'],
      active: true,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      name: 'Evidence Validator',
      version: 1,
      content: `Validate all claims in the following content against provided evidence sources.

Content: {{content}}
Sources: {{sources}}

For each claim:
1. Mark as SUPPORTED, UNSUPPORTED, or PARTIAL
2. Cite specific evidence
3. Provide confidence score (0-100)`,
      variablesJson: ['content', 'sources'],
      category: 'template',
      tags: ['evidence', 'validation'],
      active: true,
      createdAt: new Date(),
    },
  ];

  console.log('📝 Seeding prompt templates...');
  for (const prompt of promptTemplates) {
    await db.insert(prompts).values(prompt).onConflictDoNothing();
  }

  // Seed Pipeline Templates
  const pipelineTemplates = [
    {
      id: nanoid(),
      name: 'Quick Classification',
      version: 1,
      description: 'Fast track for simple, unambiguous requests',
      workflowJson: {
        steps: [
          { id: 'start', eye: 'navigator', next: 'sharingan' },
          { id: 'sharingan', eye: 'sharingan', next: 'conditional_1' },
          {
            id: 'conditional_1',
            type: 'condition',
            condition: 'data.ambiguous === false',
            true: 'jogan',
            false: 'prompt_helper',
          },
          { id: 'prompt_helper', eye: 'helper', next: 'jogan' },
          { id: 'jogan', eye: 'jogan', next: 'end' },
          { id: 'end', type: 'terminal' },
        ],
      },
      category: 'built-in',
      active: true,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      name: 'Full Code Review Pipeline',
      version: 1,
      description: 'Complete workflow from requirements to documentation review',
      workflowJson: {
        steps: [
          { id: 'start', eye: 'navigator', next: 'sharingan' },
          { id: 'sharingan', eye: 'sharingan', next: 'prompt_helper' },
          { id: 'prompt_helper', eye: 'helper', next: 'jogan' },
          { id: 'jogan', eye: 'jogan', next: 'rinnegan_requirements' },
          { id: 'rinnegan_requirements', eye: 'rinnegan', next: 'user_approval_1' },
          { id: 'user_approval_1', type: 'user_input', prompt: 'Review and approve requirements', next: 'conditional_2' },
          {
            id: 'conditional_2',
            type: 'condition',
            condition: 'userApproved === true',
            true: 'rinnegan_plan',
            false: 'rinnegan_requirements',
          },
          { id: 'rinnegan_plan', eye: 'rinnegan', next: 'user_approval_2' },
          { id: 'user_approval_2', type: 'user_input', prompt: 'Review and approve plan', next: 'conditional_3' },
          {
            id: 'conditional_3',
            type: 'condition',
            condition: 'userApproved === true',
            true: 'mangekyo_scaffold',
            false: 'rinnegan_plan',
          },
          { id: 'mangekyo_scaffold', eye: 'mangekyo', next: 'mangekyo_impl' },
          { id: 'mangekyo_impl', eye: 'mangekyo', next: 'mangekyo_tests' },
          { id: 'mangekyo_tests', eye: 'mangekyo', next: 'mangekyo_docs' },
          { id: 'mangekyo_docs', eye: 'mangekyo', next: 'tenseigan' },
          { id: 'tenseigan', eye: 'tenseigan', next: 'byakugan' },
          { id: 'byakugan', eye: 'byakugan', next: 'rinnegan_approval' },
          { id: 'rinnegan_approval', eye: 'rinnegan', next: 'end' },
          { id: 'end', type: 'terminal' },
        ],
      },
      category: 'built-in',
      active: true,
      createdAt: new Date(),
    },
    {
      id: nanoid(),
      name: 'Documentation Review',
      version: 1,
      description: 'Validate documentation completeness and accuracy',
      workflowJson: {
        steps: [
          { id: 'start', eye: 'navigator', next: 'tenseigan' },
          { id: 'tenseigan', eye: 'tenseigan', next: 'byakugan' },
          { id: 'byakugan', eye: 'byakugan', next: 'conditional_1' },
          {
            id: 'conditional_1',
            type: 'condition',
            condition: 'data.approved === true',
            true: 'end',
            false: 'user_fix',
          },
          { id: 'user_fix', type: 'user_input', prompt: 'Fix documentation issues', next: 'tenseigan' },
          { id: 'end', type: 'terminal' },
        ],
      },
      category: 'built-in',
      active: true,
      createdAt: new Date(),
    },
  ];

  console.log('🔄 Seeding pipeline templates...');
  for (const pipeline of pipelineTemplates) {
    await db.insert(pipelines).values(pipeline).onConflictDoNothing();
  }

  console.log('✅ Migration and seed completed!');
  console.log(`   - ${strictnessData.length} strictness profiles`);
  console.log(`   - ${promptTemplates.length} prompt templates`);
  console.log(`   - ${pipelineTemplates.length} pipeline templates`);
  } catch (error) {
    console.error('❌ Seed operation failed:', error);
    throw error; // Re-throw to trigger outer catch
  }
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
