/**
 * Order Guard Middleware
 *
 * Validates Eye execution order based on pipeline dependencies
 * Prevents skipping prerequisite steps in workflows
 */

export interface SessionHistory {
  executedEyes: string[];
  currentWorkflow?: 'clarification' | 'planning' | 'implementation' | 'factChecking';
}

/**
 * Define prerequisite chains for each Eye
 */
const PREREQUISITES: Record<string, string[]> = {
  // Clarification workflow
  'prompt-helper': ['sharingan'],
  'jogan': ['prompt-helper'],

  // Planning workflow
  'rinnegan:review': ['rinnegan:requirements'],

  // Implementation workflow
  'mangekyo:scaffold': ['rinnegan:review'],
  'mangekyo:impl': ['mangekyo:scaffold'],
  'mangekyo:tests': ['mangekyo:impl'],
  'mangekyo:docs': ['mangekyo:tests'],
  'rinnegan:approval': ['mangekyo:docs'],

  // Fact-checking workflow
  'byakugan': ['tenseigan'],
};

/**
 * Eyes that can start workflows (no prerequisites)
 */
const ENTRY_POINTS = [
  'sharingan',
  'overseer',
  'rinnegan:requirements',
  'tenseigan',
];

export interface OrderGuardResult {
  allowed: boolean;
  reason?: string;
  missingPrerequisites?: string[];
  suggestion?: string;
}

/**
 * Check if an Eye can be executed given session history
 */
export function orderGuard(
  eyeName: string,
  sessionHistory: SessionHistory
): OrderGuardResult {
  // Entry points are always allowed
  if (ENTRY_POINTS.includes(eyeName)) {
    return { allowed: true };
  }

  // Check if Eye has prerequisites
  const prerequisites = PREREQUISITES[eyeName];

  if (!prerequisites || prerequisites.length === 0) {
    // No prerequisites defined, allow execution
    return { allowed: true };
  }

  // Validate all prerequisites are met
  const executedEyes = sessionHistory.executedEyes || [];
  const missingPrerequisites: string[] = [];

  for (const prerequisite of prerequisites) {
    if (!executedEyes.includes(prerequisite)) {
      missingPrerequisites.push(prerequisite);
    }
  }

  if (missingPrerequisites.length > 0) {
    return {
      allowed: false,
      reason: `Missing required prerequisite steps before executing ${eyeName}`,
      missingPrerequisites,
      suggestion: `Execute ${missingPrerequisites.join(' → ')} first`,
    };
  }

  return { allowed: true };
}

/**
 * Detect workflow type based on executed Eyes
 */
export function detectWorkflow(executedEyes: string[]): SessionHistory['currentWorkflow'] | undefined {
  if (executedEyes.includes('sharingan') || executedEyes.includes('prompt-helper')) {
    return 'clarification';
  }

  if (executedEyes.includes('rinnegan:requirements') || executedEyes.includes('rinnegan:review')) {
    return 'planning';
  }

  if (executedEyes.some(eye => eye.startsWith('mangekyo:'))) {
    return 'implementation';
  }

  if (executedEyes.includes('tenseigan') || executedEyes.includes('byakugan')) {
    return 'factChecking';
  }

  return undefined;
}

/**
 * Get recommended next Eye based on current state
 */
export function getRecommendedNextEye(sessionHistory: SessionHistory): string | null {
  const lastEye = sessionHistory.executedEyes[sessionHistory.executedEyes.length - 1];

  if (!lastEye) {
    return 'overseer'; // No history, start with overseer
  }

  // Follow workflow chains
  if (lastEye === 'sharingan') return 'prompt-helper';
  if (lastEye === 'prompt-helper') return 'jogan';
  if (lastEye === 'rinnegan:requirements') return 'rinnegan:review';
  if (lastEye === 'rinnegan:review') return 'mangekyo:scaffold';
  if (lastEye === 'mangekyo:scaffold') return 'mangekyo:impl';
  if (lastEye === 'mangekyo:impl') return 'mangekyo:tests';
  if (lastEye === 'mangekyo:tests') return 'mangekyo:docs';
  if (lastEye === 'mangekyo:docs') return 'rinnegan:approval';
  if (lastEye === 'tenseigan') return 'byakugan';

  return null; // Workflow complete or unknown
}
