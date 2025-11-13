/**
 * Default Pipelines - SSOT for seeded pipeline configurations
 *
 * All pipelines are database rows (no hardcoded pipelines in frontend)
 * These pipelines are seeded on startup
 */

import type { NewPipeline } from "../schema";
import { EyeId } from "@third-eye/constants";

export const DEFAULT_PIPELINES: Omit<NewPipeline, "createdAt" | "active">[] = [
  {
    id: "new-task-full",
    name: "New Task - Full Pipeline",
    version: 1,
    description:
      "Complete validation pipeline for new content creation tasks with all 8 eyes",
    category: "default",
    workflowJson: {
      nodes: [
        {
          id: EyeId.OVERSEER,
          type: "eyeNode",
          position: { x: 100, y: 200 },
          data: { eyeId: EyeId.OVERSEER },
        },
        {
          id: EyeId.SHARINGAN,
          type: "eyeNode",
          position: { x: 400, y: 100 },
          data: { eyeId: EyeId.SHARINGAN },
        },
        {
          id: EyeId.KYUUBI,
          type: "eyeNode",
          position: { x: 700, y: 100 },
          data: { eyeId: EyeId.KYUUBI },
        },
        {
          id: EyeId.JOGAN,
          type: "eyeNode",
          position: { x: 1000, y: 100 },
          data: { eyeId: EyeId.JOGAN },
        },
        {
          id: EyeId.RINNEGAN,
          type: "eyeNode",
          position: { x: 400, y: 300 },
          data: { eyeId: EyeId.RINNEGAN },
        },
        {
          id: EyeId.MANGEKYO,
          type: "eyeNode",
          position: { x: 700, y: 300 },
          data: { eyeId: EyeId.MANGEKYO },
        },
        {
          id: EyeId.TENSEIGAN,
          type: "eyeNode",
          position: { x: 1300, y: 200 },
          data: { eyeId: EyeId.TENSEIGAN },
        },
        {
          id: EyeId.BYAKUGAN,
          type: "eyeNode",
          position: { x: 1600, y: 200 },
          data: { eyeId: EyeId.BYAKUGAN },
        },
      ],
      edges: [
        { id: "e1", source: EyeId.OVERSEER, target: EyeId.SHARINGAN },
        { id: "e2", source: EyeId.SHARINGAN, target: EyeId.KYUUBI },
        { id: "e3", source: EyeId.KYUUBI, target: EyeId.JOGAN },
        { id: "e4", source: EyeId.OVERSEER, target: EyeId.RINNEGAN },
        { id: "e5", source: EyeId.RINNEGAN, target: EyeId.MANGEKYO },
        { id: "e6", source: EyeId.JOGAN, target: EyeId.TENSEIGAN },
        { id: "e7", source: EyeId.MANGEKYO, target: EyeId.TENSEIGAN },
        { id: "e8", source: EyeId.TENSEIGAN, target: EyeId.BYAKUGAN },
      ],
    },
  },
  {
    id: "draft-review",
    name: "Draft Review",
    version: 1,
    description: "Quick validation pipeline for reviewing existing drafts",
    category: "default",
    workflowJson: {
      nodes: [
        {
          id: EyeId.MANGEKYO,
          type: "eyeNode",
          position: { x: 100, y: 200 },
          data: { eyeId: EyeId.MANGEKYO },
        },
        {
          id: EyeId.TENSEIGAN,
          type: "eyeNode",
          position: { x: 400, y: 200 },
          data: { eyeId: EyeId.TENSEIGAN },
        },
        {
          id: EyeId.BYAKUGAN,
          type: "eyeNode",
          position: { x: 700, y: 200 },
          data: { eyeId: EyeId.BYAKUGAN },
        },
      ],
      edges: [
        { id: "e1", source: EyeId.MANGEKYO, target: EyeId.TENSEIGAN },
        { id: "e2", source: EyeId.TENSEIGAN, target: EyeId.BYAKUGAN },
      ],
    },
  },
  {
    id: "planning-only",
    name: "Planning & Architecture",
    version: 1,
    description: "Strategic planning pipeline for architectural decisions",
    category: "default",
    workflowJson: {
      nodes: [
        {
          id: EyeId.OVERSEER,
          type: "eyeNode",
          position: { x: 100, y: 200 },
          data: { eyeId: EyeId.OVERSEER },
        },
        {
          id: EyeId.SHARINGAN,
          type: "eyeNode",
          position: { x: 400, y: 200 },
          data: { eyeId: EyeId.SHARINGAN },
        },
        {
          id: EyeId.RINNEGAN,
          type: "eyeNode",
          position: { x: 700, y: 200 },
          data: { eyeId: EyeId.RINNEGAN },
        },
      ],
      edges: [
        { id: "e1", source: EyeId.OVERSEER, target: EyeId.SHARINGAN },
        { id: "e2", source: EyeId.SHARINGAN, target: EyeId.RINNEGAN },
      ],
    },
  },
];
