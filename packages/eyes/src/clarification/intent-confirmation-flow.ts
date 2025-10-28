/**
 * Intent Confirmation & Resume Flow
 * 
 * Manages intent confirmation workflow and pipeline resumption.
 */

import type { IntentConfirmation } from '@third-eye/db';
import { getIntentConfirmationStatus, storeIntentConfirmation, recordIntentConfirmationResponse } from './clarification-storage';
import { EyeStatusCode } from '@third-eye/constants';

export interface IntentAnalysis {
  primary: string;
  secondary: string[];
  scope: string;
  estimatedEffort: string;
  deliverables: string[];
}

export interface ConfirmationRequest {
  sessionId: string;
  intentAnalysis: IntentAnalysis;
  confirmationPrompt: string;
}

export interface ConfirmationResponse {
  confirmationId: string;
  approved: boolean;
  modified?: string;
}

/**
 * Request intent confirmation from user
 */
export async function requestIntentConfirmation(
  sessionId: string,
  request: ConfirmationRequest,
): Promise<string> {
  const confirmationId = await storeIntentConfirmation(
    sessionId,
    request.intentAnalysis,
    request.confirmationPrompt,
  );

  return confirmationId;
}

/**
 * Process user's confirmation response
 */
export async function processConfirmationResponse(
  confirmationId: string,
  response: 'approved' | 'rejected' | 'modified',
  userIdentity?: string,
  modification?: string,
): Promise<void> {
  await recordIntentConfirmationResponse(
    confirmationId,
    response,
    userIdentity,
  );

  if (response === 'rejected') {
    // Pipeline should abort or restart
    return;
  }

  if (response === 'modified' && modification) {
    // Store modification details
    // TODO: Update session state with modified requirements
  }
}

/**
 * Check if session needs confirmation before proceeding
 */
export async function checkConfirmationRequired(sessionId: string): Promise<IntentConfirmation | null> {
  return await getIntentConfirmationStatus(sessionId);
}

/**
 * Determine if pipeline can resume after confirmation
 */
export function canResumeAfterConfirmation(
  confirmation: IntentConfirmation,
): { canResume: boolean; statusCode: string; nextAction: string } {
  if (!confirmation.response) {
    return {
      canResume: false,
      statusCode: EyeStatusCode.AWAIT_CONFIRMATION,
      nextAction: 'await_confirmation',
    };
  }

  if (confirmation.response === 'approved') {
    return {
      canResume: true,
      statusCode: EyeStatusCode.OK_NEXT_EYE,
      nextAction: 'proceed',
    };
  }

  if (confirmation.response === 'rejected') {
    return {
      canResume: false,
      statusCode: EyeStatusCode.AWAIT_CONFIRMATION,
      nextAction: 'abort',
    };
  }

  // Modified case - proceed with modifications
  return {
    canResume: true,
    statusCode: EyeStatusCode.OK_NEXT_EYE,
    nextAction: 'proceed',
  };
}

