/**
 * Default Pipelines - SSOT for seeded pipeline configurations
 *
 * LEGACY CLEANUP: Removed 3 outdated simple pipelines (new-task-full, draft-review, planning-only)
 * - These were breaking Fixed Template mode by being marked active simultaneously
 * - Templates functionality moved to pipelineTemplates table (templates.ts)
 * - Only overseer-dynamic-master remains as the production pipeline
 *
 * All pipelines are database rows (no hardcoded pipelines in frontend)
 * These pipelines are seeded on startup
 */

import type { NewPipeline } from "../schema";
import {
  EyeId,
  MASTER_PIPELINE_ID,
  MASTER_PIPELINE_NAME,
  MASTER_PIPELINE_DESCRIPTION,
  MASTER_PIPELINE_CATEGORY,
  MASTER_PIPELINE_VERSION,
  PIPELINE_NODE_SPACING_HORIZONTAL as SPACING_X,
  PIPELINE_NODE_SPACING_VERTICAL as SPACING_Y,
  PIPELINE_START_NODE_X,
  PIPELINE_START_NODE_Y,
  EDGE_LABEL_NEW_TASK,
  EDGE_LABEL_DRAFT_REVIEW,
  EDGE_LABEL_VALIDATION_ONLY,
  EDGE_LABEL_CONTENT_TEXT,
  EDGE_LABEL_CONTENT_CODE,
  EDGE_LABEL_CONTENT_PLAN,
  EDGE_LABEL_CONTENT_MIXED,
  EDGE_LABEL_TO_FINAL_VALIDATION,
  ANNOTATION_OVERSEER_TITLE,
  ANNOTATION_OVERSEER_CONTENT,
  ANNOTATION_REQUEST_TYPE_TITLE,
  ANNOTATION_REQUEST_TYPE_CONTENT,
  ANNOTATION_CONTENT_DOMAIN_TITLE,
  ANNOTATION_CONTENT_DOMAIN_CONTENT,
  ANNOTATION_FINAL_VALIDATION_TITLE,
  ANNOTATION_FINAL_VALIDATION_CONTENT,
} from "@third-eye/constants";

export const DEFAULT_PIPELINES: Omit<NewPipeline, "createdAt" | "active">[] = [
  {
    id: MASTER_PIPELINE_ID,
    name: MASTER_PIPELINE_NAME,
    version: MASTER_PIPELINE_VERSION,
    description: MASTER_PIPELINE_DESCRIPTION,
    category: MASTER_PIPELINE_CATEGORY,
    workflowJson: {
      nodes: [
        // Start Node
        {
          id: "start",
          type: "userInputNode",
          position: { x: PIPELINE_START_NODE_X, y: PIPELINE_START_NODE_Y },
          data: { label: "User Request" },
        },

        // Overseer Analysis Node
        {
          id: EyeId.OVERSEER,
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X, y: PIPELINE_START_NODE_Y },
          data: { eyeId: EyeId.OVERSEER },
        },

        // Annotation: Overseer Analysis
        {
          id: "annotation-overseer",
          type: "annotationNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X, y: PIPELINE_START_NODE_Y - 150 },
          data: {
            title: ANNOTATION_OVERSEER_TITLE,
            content: ANNOTATION_OVERSEER_CONTENT,
            iconType: "info",
          },
        },

        // Request Type Switch Node (3 outputs: NEW_TASK, DRAFT_REVIEW, VALIDATION_ONLY)
        {
          id: "switch-request-type",
          type: "switchNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 2, y: PIPELINE_START_NODE_Y },
          data: {
            label: "Request Type",
            switchConfig: {
              mode: "rules",
              rules: [
                { label: EDGE_LABEL_NEW_TASK, outputIndex: 0 },
                { label: EDGE_LABEL_DRAFT_REVIEW, outputIndex: 1 },
                { label: EDGE_LABEL_VALIDATION_ONLY, outputIndex: 2 },
              ],
            },
          },
        },

        // Annotation: Request Type Routing
        {
          id: "annotation-request-type",
          type: "annotationNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 2, y: PIPELINE_START_NODE_Y - 150 },
          data: {
            title: ANNOTATION_REQUEST_TYPE_TITLE,
            content: ANNOTATION_REQUEST_TYPE_CONTENT,
            iconType: "lightbulb",
          },
        },

        // ========== NEW_TASK BRANCH (Branch 0) ==========
        // Content Domain Switch for NEW_TASK (4 outputs: TEXT, CODE, PLAN, MIXED)
        {
          id: "switch-new-task-content",
          type: "switchNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 3, y: PIPELINE_START_NODE_Y - SPACING_Y * 2 },
          data: {
            label: "Content Domain (NEW_TASK)",
            switchConfig: {
              mode: "rules",
              rules: [
                { label: EDGE_LABEL_CONTENT_TEXT, outputIndex: 0 },
                { label: EDGE_LABEL_CONTENT_CODE, outputIndex: 1 },
                { label: EDGE_LABEL_CONTENT_PLAN, outputIndex: 2 },
                { label: EDGE_LABEL_CONTENT_MIXED, outputIndex: 3 },
              ],
            },
          },
        },

        // NEW_TASK + TEXT Path: Sharingan → Kyuubi → Jogan → Tenseigan → Byakugan
        {
          id: "nt-text-sharingan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y - SPACING_Y * 3 },
          data: { eyeId: EyeId.SHARINGAN },
        },
        {
          id: "nt-text-kyuubi",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 5, y: PIPELINE_START_NODE_Y - SPACING_Y * 3 },
          data: { eyeId: EyeId.KYUUBI },
        },
        {
          id: "nt-text-jogan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 6, y: PIPELINE_START_NODE_Y - SPACING_Y * 3 },
          data: { eyeId: EyeId.JOGAN },
        },

        // NEW_TASK + CODE Path: Sharingan → Kyuubi → Jogan → Rinnegan → Mangekyo → Tenseigan → Byakugan
        {
          id: "nt-code-sharingan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y - SPACING_Y * 2 },
          data: { eyeId: EyeId.SHARINGAN },
        },
        {
          id: "nt-code-kyuubi",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 5, y: PIPELINE_START_NODE_Y - SPACING_Y * 2 },
          data: { eyeId: EyeId.KYUUBI },
        },
        {
          id: "nt-code-jogan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 6, y: PIPELINE_START_NODE_Y - SPACING_Y * 2 },
          data: { eyeId: EyeId.JOGAN },
        },
        {
          id: "nt-code-rinnegan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 7, y: PIPELINE_START_NODE_Y - SPACING_Y * 2 },
          data: { eyeId: EyeId.RINNEGAN },
        },
        {
          id: "nt-code-mangekyo",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 8, y: PIPELINE_START_NODE_Y - SPACING_Y * 2 },
          data: { eyeId: EyeId.MANGEKYO },
        },

        // NEW_TASK + PLAN Path: Sharingan → Rinnegan → Tenseigan → Byakugan
        {
          id: "nt-plan-sharingan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y - SPACING_Y * 1 },
          data: { eyeId: EyeId.SHARINGAN },
        },
        {
          id: "nt-plan-rinnegan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 5, y: PIPELINE_START_NODE_Y - SPACING_Y * 1 },
          data: { eyeId: EyeId.RINNEGAN },
        },

        // NEW_TASK + MIXED Path: Sharingan → Kyuubi → Jogan → Tenseigan → Byakugan
        {
          id: "nt-mixed-sharingan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y },
          data: { eyeId: EyeId.SHARINGAN },
        },
        {
          id: "nt-mixed-kyuubi",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 5, y: PIPELINE_START_NODE_Y },
          data: { eyeId: EyeId.KYUUBI },
        },
        {
          id: "nt-mixed-jogan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 6, y: PIPELINE_START_NODE_Y },
          data: { eyeId: EyeId.JOGAN },
        },

        // ========== DRAFT_REVIEW BRANCH (Branch 1) ==========
        // Content Domain Switch for DRAFT_REVIEW (3 outputs: TEXT, CODE, PLAN)
        {
          id: "switch-draft-content",
          type: "switchNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 3, y: PIPELINE_START_NODE_Y + SPACING_Y * 1.5 },
          data: {
            label: "Content Domain (DRAFT_REVIEW)",
            switchConfig: {
              mode: "rules",
              rules: [
                { label: EDGE_LABEL_CONTENT_TEXT, outputIndex: 0 },
                { label: EDGE_LABEL_CONTENT_CODE, outputIndex: 1 },
                { label: EDGE_LABEL_CONTENT_PLAN, outputIndex: 2 },
              ],
            },
          },
        },

        // DRAFT_REVIEW + TEXT Path: Tenseigan → Byakugan (direct validation)
        // (No intermediate nodes needed, goes directly to merge point)

        // DRAFT_REVIEW + CODE Path: Mangekyo → Tenseigan → Byakugan
        {
          id: "dr-code-mangekyo",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y + SPACING_Y * 2 },
          data: { eyeId: EyeId.MANGEKYO },
        },

        // DRAFT_REVIEW + PLAN Path: Rinnegan → Tenseigan → Byakugan
        {
          id: "dr-plan-rinnegan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y + SPACING_Y * 2.5 },
          data: { eyeId: EyeId.RINNEGAN },
        },

        // ========== VALIDATION_ONLY BRANCH (Branch 2) ==========
        // Content Domain Switch for VALIDATION_ONLY (3 outputs: TEXT, CODE, PLAN)
        {
          id: "switch-validation-content",
          type: "switchNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 3, y: PIPELINE_START_NODE_Y + SPACING_Y * 3.5 },
          data: {
            label: "Content Domain (VALIDATION)",
            switchConfig: {
              mode: "rules",
              rules: [
                { label: EDGE_LABEL_CONTENT_TEXT, outputIndex: 0 },
                { label: EDGE_LABEL_CONTENT_CODE, outputIndex: 1 },
                { label: EDGE_LABEL_CONTENT_PLAN, outputIndex: 2 },
              ],
            },
          },
        },

        // VALIDATION_ONLY + TEXT: Tenseigan → Byakugan (same as DRAFT_REVIEW TEXT)
        // (No intermediate nodes, goes to merge)

        // VALIDATION_ONLY + CODE: Mangekyo → Tenseigan (no Byakugan per routing matrix)
        {
          id: "vo-code-mangekyo",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y + SPACING_Y * 4 },
          data: { eyeId: EyeId.MANGEKYO },
        },

        // VALIDATION_ONLY + PLAN: Rinnegan → Tenseigan → Byakugan
        {
          id: "vo-plan-rinnegan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 4, y: PIPELINE_START_NODE_Y + SPACING_Y * 4.5 },
          data: { eyeId: EyeId.RINNEGAN },
        },

        // ========== FINAL VALIDATION MERGE POINT ==========
        // All paths converge at Tenseigan → Byakugan
        {
          id: "final-tenseigan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 9, y: PIPELINE_START_NODE_Y },
          data: { eyeId: EyeId.TENSEIGAN },
        },
        {
          id: "final-byakugan",
          type: "eyeNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 10, y: PIPELINE_START_NODE_Y },
          data: { eyeId: EyeId.BYAKUGAN },
        },

        // Annotation: Final Validation
        {
          id: "annotation-final-validation",
          type: "annotationNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 9, y: PIPELINE_START_NODE_Y - 150 },
          data: {
            title: ANNOTATION_FINAL_VALIDATION_TITLE,
            content: ANNOTATION_FINAL_VALIDATION_CONTENT,
            iconType: "alert",
          },
        },

        // Terminal Node
        {
          id: "terminal",
          type: "terminalNode",
          position: { x: PIPELINE_START_NODE_X + SPACING_X * 11, y: PIPELINE_START_NODE_Y },
          data: { label: "Complete" },
        },
      ],
      edges: [
        // Start → Overseer
        { id: "e-start-overseer", source: "start", target: EyeId.OVERSEER },

        // Overseer → Request Type Switch
        { id: "e-overseer-switch", source: EyeId.OVERSEER, target: "switch-request-type" },

        // Request Type Switch → Content Domain Switches
        {
          id: "e-switch-new-task",
          source: "switch-request-type",
          sourceHandle: "output-0",
          target: "switch-new-task-content",
          label: EDGE_LABEL_NEW_TASK,
        },
        {
          id: "e-switch-draft",
          source: "switch-request-type",
          sourceHandle: "output-1",
          target: "switch-draft-content",
          label: EDGE_LABEL_DRAFT_REVIEW,
        },
        {
          id: "e-switch-validation",
          source: "switch-request-type",
          sourceHandle: "output-2",
          target: "switch-validation-content",
          label: EDGE_LABEL_VALIDATION_ONLY,
        },

        // NEW_TASK + TEXT Path
        {
          id: "e-nt-text-1",
          source: "switch-new-task-content",
          sourceHandle: "output-0",
          target: "nt-text-sharingan",
          label: EDGE_LABEL_CONTENT_TEXT,
        },
        { id: "e-nt-text-2", source: "nt-text-sharingan", target: "nt-text-kyuubi" },
        { id: "e-nt-text-3", source: "nt-text-kyuubi", target: "nt-text-jogan" },
        {
          id: "e-nt-text-4",
          source: "nt-text-jogan",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // NEW_TASK + CODE Path
        {
          id: "e-nt-code-1",
          source: "switch-new-task-content",
          sourceHandle: "output-1",
          target: "nt-code-sharingan",
          label: EDGE_LABEL_CONTENT_CODE,
        },
        { id: "e-nt-code-2", source: "nt-code-sharingan", target: "nt-code-kyuubi" },
        { id: "e-nt-code-3", source: "nt-code-kyuubi", target: "nt-code-jogan" },
        { id: "e-nt-code-4", source: "nt-code-jogan", target: "nt-code-rinnegan" },
        { id: "e-nt-code-5", source: "nt-code-rinnegan", target: "nt-code-mangekyo" },
        {
          id: "e-nt-code-6",
          source: "nt-code-mangekyo",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // NEW_TASK + PLAN Path
        {
          id: "e-nt-plan-1",
          source: "switch-new-task-content",
          sourceHandle: "output-2",
          target: "nt-plan-sharingan",
          label: EDGE_LABEL_CONTENT_PLAN,
        },
        { id: "e-nt-plan-2", source: "nt-plan-sharingan", target: "nt-plan-rinnegan" },
        {
          id: "e-nt-plan-3",
          source: "nt-plan-rinnegan",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // NEW_TASK + MIXED Path
        {
          id: "e-nt-mixed-1",
          source: "switch-new-task-content",
          sourceHandle: "output-3",
          target: "nt-mixed-sharingan",
          label: EDGE_LABEL_CONTENT_MIXED,
        },
        { id: "e-nt-mixed-2", source: "nt-mixed-sharingan", target: "nt-mixed-kyuubi" },
        { id: "e-nt-mixed-3", source: "nt-mixed-kyuubi", target: "nt-mixed-jogan" },
        {
          id: "e-nt-mixed-4",
          source: "nt-mixed-jogan",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // DRAFT_REVIEW + TEXT Path (direct to Tenseigan)
        {
          id: "e-dr-text-1",
          source: "switch-draft-content",
          sourceHandle: "output-0",
          target: "final-tenseigan",
          label: EDGE_LABEL_CONTENT_TEXT,
        },

        // DRAFT_REVIEW + CODE Path
        {
          id: "e-dr-code-1",
          source: "switch-draft-content",
          sourceHandle: "output-1",
          target: "dr-code-mangekyo",
          label: EDGE_LABEL_CONTENT_CODE,
        },
        {
          id: "e-dr-code-2",
          source: "dr-code-mangekyo",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // DRAFT_REVIEW + PLAN Path
        {
          id: "e-dr-plan-1",
          source: "switch-draft-content",
          sourceHandle: "output-2",
          target: "dr-plan-rinnegan",
          label: EDGE_LABEL_CONTENT_PLAN,
        },
        {
          id: "e-dr-plan-2",
          source: "dr-plan-rinnegan",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // VALIDATION_ONLY + TEXT Path (direct to Tenseigan)
        {
          id: "e-vo-text-1",
          source: "switch-validation-content",
          sourceHandle: "output-0",
          target: "final-tenseigan",
          label: EDGE_LABEL_CONTENT_TEXT,
        },

        // VALIDATION_ONLY + CODE Path (Mangekyo → Tenseigan, no Byakugan)
        {
          id: "e-vo-code-1",
          source: "switch-validation-content",
          sourceHandle: "output-1",
          target: "vo-code-mangekyo",
          label: EDGE_LABEL_CONTENT_CODE,
        },
        {
          id: "e-vo-code-2",
          source: "vo-code-mangekyo",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // VALIDATION_ONLY + PLAN Path
        {
          id: "e-vo-plan-1",
          source: "switch-validation-content",
          sourceHandle: "output-2",
          target: "vo-plan-rinnegan",
          label: EDGE_LABEL_CONTENT_PLAN,
        },
        {
          id: "e-vo-plan-2",
          source: "vo-plan-rinnegan",
          target: "final-tenseigan",
          label: EDGE_LABEL_TO_FINAL_VALIDATION,
        },

        // Final Validation → Approval
        { id: "e-final-1", source: "final-tenseigan", target: "final-byakugan" },
        { id: "e-final-2", source: "final-byakugan", target: "terminal" },
      ],
    },
  },
];
