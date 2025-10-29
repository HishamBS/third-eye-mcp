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
import type { PersonaBlueprint } from '../interfaces/persona-blueprint';
export declare const BLUEPRINT_REGISTRY: Record<string, PersonaBlueprint>;
export declare function getPersonaBlueprint(eyeId: string): PersonaBlueprint | null;
//# sourceMappingURL=index.d.ts.map