/**
 * Monitor Hooks - Tactical state management and event processing
 */

export {
  useTheatreOrchestrator,
  type UseTheatreOrchestratorOptions,
} from "./useTheatreOrchestrator";

export {
  useStagePerformance,
  type UseStagePerformanceOptions,
  type RawPipelineEvent,
} from "./useStagePerformance";

export {
  useEyeCharacter,
  useEyePersonas,
  type UseEyeCharacterOptions,
} from "./useEyeCharacter";

export {
  useTimelineNavigation,
  type UseTimelineNavigationOptions,
} from "./useTimelineNavigation";

export { useEventTransformer, type TacticalEvent } from "./useEventTransformer";

export {
  useConversationFeed,
  type ConversationEntry,
  type ConversationEntryType,
  type PendingAction,
} from "./useConversationFeed";

export {
  useTacticalState,
  type TacticalState,
  type QualityScore,
} from "./useTacticalState";
