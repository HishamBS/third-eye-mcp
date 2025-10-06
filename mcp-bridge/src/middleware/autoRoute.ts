/**
 * Auto-Routing Middleware
 *
 * Uses Overseer Eye to automatically determine next Eye based on task and state
 */

export interface AutoRouteInput {
  task: string;
  currentState?: {
    executedEyes?: string[];
    lastOutput?: any;
    sessionContext?: Record<string, any>;
  };
}

export interface AutoRouteResult {
  recommendedEye: string;
  reasoning: string;
  confidence: number;
  alternativeEyes?: string[];
}

/**
 * Auto-route task to appropriate Eye using Overseer
 *
 * This is a simplified router that uses heuristics.
 * For production, this would delegate to the Overseer Eye.
 */
export async function autoRoute(input: AutoRouteInput): Promise<AutoRouteResult> {
  const { task, currentState } = input;
  const executedEyes = currentState?.executedEyes || [];
  const taskLower = task.toLowerCase();

  // If nothing executed yet, detect intent
  if (executedEyes.length === 0) {
    // Check for ambiguous language
    const ambiguityKeywords = ['better', 'improve', 'fix it', 'make it', 'this', 'that', 'something'];
    const isAmbiguous = ambiguityKeywords.some(keyword => taskLower.includes(keyword));

    if (isAmbiguous) {
      return {
        recommendedEye: 'sharingan',
        reasoning: 'Task contains ambiguous language requiring clarification',
        confidence: 85,
        alternativeEyes: ['overseer'],
      };
    }

    // Check for planning keywords
    const planningKeywords = ['plan', 'design', 'architecture', 'requirements', 'spec'];
    const needsPlanning = planningKeywords.some(keyword => taskLower.includes(keyword));

    if (needsPlanning) {
      return {
        recommendedEye: 'rinnegan:requirements',
        reasoning: 'Task requires planning and requirements definition',
        confidence: 90,
        alternativeEyes: ['sharingan'],
      };
    }

    // Check for implementation keywords
    const implementKeywords = ['implement', 'build', 'create', 'add feature', 'develop'];
    const needsImplementation = implementKeywords.some(keyword => taskLower.includes(keyword));

    if (needsImplementation) {
      return {
        recommendedEye: 'rinnegan:requirements',
        reasoning: 'Implementation tasks should start with requirements',
        confidence: 85,
        alternativeEyes: ['sharingan'],
      };
    }

    // Check for fact-checking keywords
    const factCheckKeywords = ['validate', 'verify', 'check', 'evidence', 'citation', 'fact'];
    const needsFactCheck = factCheckKeywords.some(keyword => taskLower.includes(keyword));

    if (needsFactCheck) {
      return {
        recommendedEye: 'tenseigan',
        reasoning: 'Task requires fact-checking and evidence validation',
        confidence: 80,
      };
    }

    // Default to overseer for general routing
    return {
      recommendedEye: 'overseer',
      reasoning: 'Let Overseer determine best workflow for this task',
      confidence: 70,
    };
  }

  // If there's execution history, follow workflow chains
  const lastEye = executedEyes[executedEyes.length - 1];

  // Clarification workflow
  if (lastEye === 'sharingan') {
    return {
      recommendedEye: 'prompt-helper',
      reasoning: 'Sharingan detected ambiguity, next step is prompt refinement',
      confidence: 95,
    };
  }

  if (lastEye === 'prompt-helper') {
    return {
      recommendedEye: 'jogan',
      reasoning: 'Prompt refined, confirm user intent',
      confidence: 95,
    };
  }

  // Planning workflow
  if (lastEye === 'rinnegan:requirements') {
    return {
      recommendedEye: 'rinnegan:review',
      reasoning: 'Requirements defined, review and approve plan',
      confidence: 95,
    };
  }

  if (lastEye === 'rinnegan:review') {
    return {
      recommendedEye: 'mangekyo:scaffold',
      reasoning: 'Plan approved, generate code scaffold',
      confidence: 90,
    };
  }

  // Implementation workflow
  if (lastEye === 'mangekyo:scaffold') {
    return {
      recommendedEye: 'mangekyo:impl',
      reasoning: 'Scaffold approved, implement core logic',
      confidence: 95,
    };
  }

  if (lastEye === 'mangekyo:impl') {
    return {
      recommendedEye: 'mangekyo:tests',
      reasoning: 'Implementation complete, add tests',
      confidence: 95,
    };
  }

  if (lastEye === 'mangekyo:tests') {
    return {
      recommendedEye: 'mangekyo:docs',
      reasoning: 'Tests complete, generate documentation',
      confidence: 95,
    };
  }

  if (lastEye === 'mangekyo:docs') {
    return {
      recommendedEye: 'rinnegan:approval',
      reasoning: 'All artifacts complete, final approval check',
      confidence: 95,
    };
  }

  // Fact-checking workflow
  if (lastEye === 'tenseigan') {
    return {
      recommendedEye: 'byakugan',
      reasoning: 'Evidence validated, check for logical consistency',
      confidence: 90,
    };
  }

  // Workflow complete or unknown state
  return {
    recommendedEye: 'overseer',
    reasoning: 'Current workflow may be complete, consult Overseer for next steps',
    confidence: 60,
  };
}

/**
 * Extract Eye name from task string if explicitly mentioned
 */
export function extractExplicitEye(task: string): string | null {
  const eyeNames = [
    'sharingan',
    'prompt-helper',
    'jogan',
    'rinnegan',
    'mangekyo',
    'tenseigan',
    'byakugan',
    'overseer',
  ];

  const taskLower = task.toLowerCase();

  for (const eyeName of eyeNames) {
    if (taskLower.includes(eyeName)) {
      return eyeName;
    }
  }

  return null;
}
