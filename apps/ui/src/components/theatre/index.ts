/**
 * Theatre Components - Theatrical Monitor experience
 */

// Core stage components
export {
  EyeCharacter,
  type EyeCharacterProps,
  type EyeCharacterSize,
  type EyeCharacterPosition,
} from "./EyeCharacter";
export { DialogueBox, type DialogueBoxProps } from "./DialogueBox";
export { Marquee, type MarqueeProps, type ConnectionStatus } from "./Marquee";
export {
  LeftWing,
  RightWing,
  type LeftWingProps,
  type RightWingProps,
  type WaitingEye,
  type CompletedEye,
} from "./Wings";
export { CenterStage, type CenterStageProps } from "./CenterStage";

// Interactive components
export {
  ClarificationPrompt,
  type ClarificationPromptProps,
} from "./ClarificationPrompt";
export { ApprovalGate, type ApprovalGateProps } from "./ApprovalGate";
export {
  CelebrationOverlay,
  type CelebrationOverlayProps,
} from "./CelebrationOverlay";

// Timeline components
export * from "./timeline";

// Effects
export * from "./effects";

// Re-export types for convenience
export type {
  EyePersonaConfig,
  EyeCharacterState,
  TheatreActionType,
  SuspenseState,
  CurtainState,
  SpotlightIntensity,
  CelebrationType,
  ClarificationPromptData,
  PlanApprovalData,
} from "@third-eye/types";
