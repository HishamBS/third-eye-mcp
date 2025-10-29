/**
 * Blueprint Index
 *
 * Exports all persona blueprints
 */
export * from './overseer.blueprint';
export * from './sharingan.blueprint';
export * from './kyuubi.blueprint';
export * from './jogan.blueprint';
export * from './rinnegan.blueprint';
export * from './mangekyo.blueprint';
export * from './tenseigan.blueprint';
export * from './byakugan.blueprint';
import { OVERSEER_BLUEPRINT } from './overseer.blueprint';
import { SHARINGAN_BLUEPRINT } from './sharingan.blueprint';
import { KYUUBI_BLUEPRINT } from './kyuubi.blueprint';
import { JOGAN_BLUEPRINT } from './jogan.blueprint';
import { RINNEGAN_BLUEPRINT } from './rinnegan.blueprint';
import { MANGEKYO_BLUEPRINT } from './mangekyo.blueprint';
import { TENSEIGAN_BLUEPRINT } from './tenseigan.blueprint';
import { BYAKUGAN_BLUEPRINT } from './byakugan.blueprint';
import { EyeId } from '@third-eye/constants';
export const BLUEPRINT_REGISTRY = {
    [EyeId.OVERSEER]: OVERSEER_BLUEPRINT,
    [EyeId.SHARINGAN]: SHARINGAN_BLUEPRINT,
    [EyeId.KYUUBI]: KYUUBI_BLUEPRINT,
    [EyeId.JOGAN]: JOGAN_BLUEPRINT,
    [EyeId.RINNEGAN]: RINNEGAN_BLUEPRINT,
    [EyeId.MANGEKYO]: MANGEKYO_BLUEPRINT,
    [EyeId.TENSEIGAN]: TENSEIGAN_BLUEPRINT,
    [EyeId.BYAKUGAN]: BYAKUGAN_BLUEPRINT,
};
export function getPersonaBlueprint(eyeId) {
    return BLUEPRINT_REGISTRY[eyeId] || null;
}
//# sourceMappingURL=index.js.map