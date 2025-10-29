/**
 * Intent Confirmation & Resume Flow
 *
 * Manages intent confirmation workflow and pipeline resumption.
 */
import { getIntentConfirmationStatus, storeIntentConfirmation, recordIntentConfirmationResponse } from './clarification-storage';
import { EyeStatusCode } from '@third-eye/constants';
/**
 * Request intent confirmation from user
 */
export async function requestIntentConfirmation(sessionId, request) {
    const confirmationId = await storeIntentConfirmation(sessionId, request.intentAnalysis, request.confirmationPrompt);
    return confirmationId;
}
/**
 * Process user's confirmation response
 */
export async function processConfirmationResponse(confirmationId, response, userIdentity, modification) {
    await recordIntentConfirmationResponse(confirmationId, response, userIdentity);
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
export async function checkConfirmationRequired(sessionId) {
    return await getIntentConfirmationStatus(sessionId);
}
/**
 * Determine if pipeline can resume after confirmation
 */
export function canResumeAfterConfirmation(confirmation) {
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
//# sourceMappingURL=intent-confirmation-flow.js.map