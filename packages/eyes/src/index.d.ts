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
import type { BaseEye } from './schemas/base';
export declare const ALL_EYES: {
    readonly overseer: import(".").OverseerEye;
    readonly sharingan: import(".").SharinganEye;
    readonly kyuubi: import(".").KyuubiEye;
    readonly jogan: import(".").JoganEye;
    readonly rinnegan: import(".").RinneganEye;
    readonly mangekyo: import(".").MangekyoEye;
    readonly tenseigan: import(".").TenseiganEye;
    readonly byakugan: import(".").ByakuganEye;
};
export type EyeName = keyof typeof ALL_EYES;
export declare function getEye(name: EyeName): BaseEye;
export declare function getAllEyeNames(): EyeName[];
//# sourceMappingURL=index.d.ts.map