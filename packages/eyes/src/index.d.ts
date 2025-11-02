export * from './schemas/base';
export * from './eyes/overseer';
export * from './eyes/sharingan';
export * from './eyes/kyuubi';
export * from './eyes/jogan';
export * from './eyes/rinnegan';
export * from './eyes/mangekyo';
export * from './eyes/tenseigan';
export * from './eyes/byakugan';
export * from './clarification';
export * from './renderer';
export * from './blueprints';
export * from './guards';
export * from './routing/dynamic-router';
import type { BaseEye } from './schemas/base';
export declare const ALL_EYES: {
    readonly overseer: import("@third-eye/core").OverseerEye;
    readonly sharingan: import("@third-eye/core").SharinganEye;
    readonly kyuubi: import("@third-eye/core").KyuubiEye;
    readonly jogan: import("@third-eye/core").JoganEye;
    readonly rinnegan: import("@third-eye/core").RinneganEye;
    readonly mangekyo: import("@third-eye/core").MangekyoEye;
    readonly tenseigan: import("@third-eye/core").TenseiganEye;
    readonly byakugan: import("@third-eye/core").ByakuganEye;
};
export type EyeName = keyof typeof ALL_EYES;
export declare function getEye(name: EyeName): BaseEye;
export declare function getAllEyeNames(): EyeName[];
//# sourceMappingURL=index.d.ts.map