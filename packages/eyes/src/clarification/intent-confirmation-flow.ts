/**
 * Intent Confirmation & Resume Flow
 *
 * Manages intent confirmation workflow and pipeline resumption.
 */

import type { IntentConfirmation } from "@third-eye/db";
import { getDb, sessions, intentConfirmations } from "@third-eye/db";
import { eq } from "drizzle-orm";
import {
  getIntentConfirmationStatus,
  storeIntentConfirmation,
  recordIntentConfirmationResponse,
} from "./clarification-storage";
import { EyeStatusCode } from "@third-eye/constants";

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
  response: "approved" | "rejected" | "modified",
  userIdentity?: string,
  modification?: string,
): Promise<void> {
  await recordIntentConfirmationResponse(
    confirmationId,
    response,
    userIdentity,
  );

  if (response === "rejected") {
    // Pipeline should abort or restart
    return;
  }

  if (response === "modified" && modification) {
    // Store modification details in session config
    try {
      const { db } = getDb();

      // First get the sessionId from the confirmation record
      const confirmation = await db
        .select()
        .from(intentConfirmations)
        .where(eq(intentConfirmations.id, confirmationId))
        .limit(1)
        .all();

      if (confirmation.length === 0) {
        console.error(
          `Confirmation not found for confirmationId: ${confirmationId}`,
        );
        return;
      }

      const sessionId = confirmation[0].sessionId;

      // Get current session config
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1)
        .all();

      if (session.length > 0) {
        const currentConfig =
          (session[0].configJson as Record<string, unknown>) || {};

        // Update config with modified requirements
        const updatedConfig = {
          ...currentConfig,
          modifiedRequirements: modification,
          modifiedAt: new Date().toISOString(),
        };

        // Update session with modified config
        await db
          .update(sessions)
          .set({ configJson: updatedConfig })
          .where(eq(sessions.id, sessionId))
          .run();
      }
    } catch (error) {
      console.error(
        `Failed to update session state with modified requirements:`,
        error,
      );
      // Don't throw - allow pipeline to continue even if update fails
    }
  }
}

/**
 * Check if session needs confirmation before proceeding
 */
export async function checkConfirmationRequired(
  sessionId: string,
): Promise<IntentConfirmation | null> {
  return await getIntentConfirmationStatus(sessionId);
}

/**
 * Determine if pipeline can resume after confirmation
 */
export function canResumeAfterConfirmation(confirmation: IntentConfirmation): {
  canResume: boolean;
  statusCode: string;
  nextAction: string;
} {
  if (confirmation.status === "confirmed") {
    return {
      canResume: true,
      statusCode: EyeStatusCode.OK_NEXT_EYE,
      nextAction: "proceed",
    };
  }

  if (confirmation.status === "rejected") {
    return {
      canResume: false,
      statusCode: EyeStatusCode.AWAIT_CONFIRMATION,
      nextAction: "abort",
    };
  }

  if (confirmation.status === "expired") {
    return {
      canResume: false,
      statusCode: EyeStatusCode.AWAIT_CONFIRMATION,
      nextAction: "expired",
    };
  }

  // "pending" or any other state
  return {
    canResume: false,
    statusCode: EyeStatusCode.AWAIT_CONFIRMATION,
    nextAction: "await_confirmation",
  };
}
