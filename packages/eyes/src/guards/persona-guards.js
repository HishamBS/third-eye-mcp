/**
 * Persona Guards
 *
 * Ensures envelopes meet SSOT requirements and validates behavior.
 * Integrates with orchestrator retry loop without heuristics.
 */
import { EnvelopeField, ErrorMessage } from '@third-eye/constants';
/**
 * Ensure eye behavior according to blueprint
 */
export function ensureEyeBehavior(blueprint, envelope) {
    const violations = [];
    // Check envelope is an object
    if (!envelope || typeof envelope !== 'object') {
        violations.push({
            field: 'envelope',
            message: ErrorMessage.NOT_OBJECT,
            reminder: 'Your response must be a valid JSON object',
        });
        return { valid: false, violations };
    }
    const env = envelope;
    // Validate required keys from envelope contract
    for (const requiredKey of blueprint.envelopeContract.requiredKeys) {
        if (!(requiredKey in env)) {
            violations.push({
                field: requiredKey,
                message: `Missing required field: ${requiredKey}`,
                reminder: `Your response must include the field: ${requiredKey}`,
            });
        }
    }
    // Validate tag field
    if (EnvelopeField.TAG in env) {
        if (env[EnvelopeField.TAG] !== blueprint.metadata.eyeId) {
            violations.push({
                field: EnvelopeField.TAG,
                message: `Tag mismatch: expected ${blueprint.metadata.eyeId}, got ${env[EnvelopeField.TAG]}`,
                reminder: `The tag field must be: ${blueprint.metadata.eyeId}`,
            });
        }
    }
    // Validate ok field
    if (EnvelopeField.OK in env) {
        const okValue = env[EnvelopeField.OK];
        if (typeof okValue !== 'boolean') {
            violations.push({
                field: EnvelopeField.OK,
                message: `${EnvelopeField.OK} must be a boolean`,
                reminder: `The ${EnvelopeField.OK} field must be true or false`,
            });
        }
    }
    // Validate code field
    if (EnvelopeField.CODE in env) {
        const codeValue = env[EnvelopeField.CODE];
        if (typeof codeValue !== 'string') {
            violations.push({
                field: EnvelopeField.CODE,
                message: `${EnvelopeField.CODE} must be a string (status code)`,
                reminder: `The ${EnvelopeField.CODE} field must be a status code string`,
            });
        }
    }
    // Validate data field
    if (EnvelopeField.DATA in env) {
        const dataValue = env[EnvelopeField.DATA];
        if (typeof dataValue !== 'object' || dataValue === null) {
            violations.push({
                field: EnvelopeField.DATA,
                message: `${EnvelopeField.DATA} must be an object`,
                reminder: `The ${EnvelopeField.DATA} field must be a JSON object`,
            });
        }
        else {
            // Check required data keys
            const data = dataValue;
            for (const requiredDataKey of blueprint.envelopeContract.requiredDataKeys) {
                if (!(requiredDataKey in data)) {
                    violations.push({
                        field: `${EnvelopeField.DATA}.${requiredDataKey}`,
                        message: `Missing required data field: ${requiredDataKey}`,
                        reminder: `The ${EnvelopeField.DATA} object must include: ${requiredDataKey}`,
                    });
                }
            }
        }
    }
    // Validate ui field
    if (EnvelopeField.UI in env) {
        const uiValue = env[EnvelopeField.UI];
        if (typeof uiValue !== 'object' || uiValue === null) {
            violations.push({
                field: EnvelopeField.UI,
                message: `${EnvelopeField.UI} must be an object`,
                reminder: `The ${EnvelopeField.UI} field must be a JSON object`,
            });
        }
        else {
            // Check required UI keys
            const ui = uiValue;
            for (const requiredUiKey of blueprint.envelopeContract.requiredUiKeys) {
                if (!(requiredUiKey in ui)) {
                    violations.push({
                        field: `${EnvelopeField.UI}.${requiredUiKey}`,
                        message: `Missing required UI field: ${requiredUiKey}`,
                        reminder: `The ${EnvelopeField.UI} object must include: ${requiredUiKey}`,
                    });
                }
            }
        }
    }
    // Validate next field
    if (EnvelopeField.NEXT in env) {
        const nextValue = env[EnvelopeField.NEXT];
        if (typeof nextValue !== 'string' && typeof nextValue !== 'undefined') {
            violations.push({
                field: EnvelopeField.NEXT,
                message: `${EnvelopeField.NEXT} must be a string or undefined`,
                reminder: `The ${EnvelopeField.NEXT} field must be a string or omitted`,
            });
        }
    }
    return {
        valid: violations.length === 0,
        violations,
    };
}
/**
 * Build targeted reminder message referencing violations
 */
export function buildReminderMessage(violations) {
    if (violations.length === 0) {
        return 'No violations detected.';
    }
    const lines = [`Detected ${violations.length} violation(s):`];
    for (const violation of violations) {
        lines.push(`- ${violation.field}: ${violation.reminder}`);
    }
    return lines.join('\n');
}
/**
 * Check if envelope matches valid status code for eye
 */
export function validateStatusCode(code, allowedCodes) {
    if (typeof code !== 'string') {
        return false;
    }
    return allowedCodes.includes(code);
}
//# sourceMappingURL=persona-guards.js.map