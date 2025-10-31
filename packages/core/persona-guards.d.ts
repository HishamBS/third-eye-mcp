import type { BaseEnvelope } from '@third-eye/eyes';
export declare class EyeBehaviorError extends Error {
    readonly eyeId: string;
    readonly reason: string;
    constructor(eyeId: string, reason: string);
}
export declare const ensureEyeBehavior: (eyeId: string, envelope: BaseEnvelope) => void;
//# sourceMappingURL=persona-guards.d.ts.map