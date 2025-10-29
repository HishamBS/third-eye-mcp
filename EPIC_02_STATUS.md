# Epic 02: Persona Engine - Status Update

## Current Status

**Epic 01 (SSOT Foundations)**: ✅ COMPLETE
- 101 tests passing
- All packages build cleanly
- Bun-only runtime established

**Epic 02 (Persona Engine)**: 🚧 IN PROGRESS

## What's Been Done

### Story 2.1: Reauthor Overseer & Eye Blueprints
- ✅ Created `PersonaBlueprint` interface in `packages/eyes/src/interfaces/persona-blueprint.ts`
- ✅ Created `OVERSEER_BLUEPRINT` as reference implementation in `packages/eyes/src/blueprints/overseer.blueprint.ts`
- ✅ Defined structure: metadata, mission, phases, envelope contract, reminders, canonical examples

### Remaining Work for Story 2.1
- [ ] Create blueprints for: sharingan, kyuubi, jogan, rinnegan, mangekyo, tenseigan, byakugan
- [ ] Add unit tests verifying blueprint shape and JSON parsing
- [ ] Map capabilities arrays to `EyeCapability` enums

### Stories 2.2-2.5 Not Yet Started
- Story 2.2: Runtime Renderer & Persona Runner
- Story 2.3: Persona Guards & Behavior Reminders  
- Story 2.4: Clarification Storage & Resolution
- Story 2.5: Intent Confirmation & Resume Flow

## Key Decisions

1. **Persona content already exists in database** (`packages/db/defaults/personas.ts` as Markdown strings)
2. **Blueprints are TypeScript objects** for compile-time validation
3. **Blueprints reference SSOT constants** (EyeId, EyeStageToken, EyeCapability, etc.)

## Next Actions

1. Convert remaining 7 persona Markdown strings to TypeScript blueprints
2. Create test suite for blueprints
3. Implement runtime renderer (Story 2.2)
4. Implement persona guards (Story 2.3)
5. Implement clarification storage (Story 2.4)
6. Implement intent confirmation flow (Story 2.5)

## Architecture Notes

- Persona content for LLM prompts: stored in `packages/db/defaults/personas.ts`
- Persona blueprints for validation: new `packages/eyes/src/blueprints/*.blueprint.ts` files
- Eye schemas for envelope validation: existing `packages/eyes/src/eyes/*.ts` files

All three layers work together but serve different purposes:
- **Persona content**: Long-form Markdown prompts for LLM
- **Persona blueprints**: Structured metadata for validation and rendering
- **Eye schemas**: Runtime envelope validation
