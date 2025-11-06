/**
 * Default Pipelines - SSOT for seeded pipeline configurations
 * 
 * All pipelines are database rows (no hardcoded pipelines in frontend)
 * These pipelines are seeded on startup
 */

import type { NewPipeline } from '../schema';
import { EyeId } from '@third-eye/constants';

export const DEFAULT_PIPELINES: Omit<NewPipeline, 'createdAt' | 'active'>[] = [
  {
    id: 'new-task-full',
    name: 'New Task - Full Pipeline',
    version: 1,
    description: 'Complete validation pipeline for new content creation tasks',
    category: 'default',
    workflowJson: {
      nodes: [
        { id: EyeId.OVERSEER, type: 'eye', data: { eyeId: EyeId.OVERSEER, position: { x: 100, y: 200 } } },
        { id: EyeId.SHARINGAN, type: 'eye', data: { eyeId: EyeId.SHARINGAN, position: { x: 400, y: 100 } } },
        { id: EyeId.KYUUBI, type: 'eye', data: { eyeId: EyeId.KYUUBI, position: { x: 700, y: 100 } } },
        { id: EyeId.JOGAN, type: 'eye', data: { eyeId: EyeId.JOGAN, position: { x: 1000, y: 100 } } },
        { id: EyeId.TENSEIGAN, type: 'eye', data: { eyeId: EyeId.TENSEIGAN, position: { x: 1300, y: 200 } } },
        { id: EyeId.BYAKUGAN, type: 'eye', data: { eyeId: EyeId.BYAKUGAN, position: { x: 1600, y: 200 } } },
      ],
      edges: [
        { id: 'e1', source: EyeId.OVERSEER, target: EyeId.SHARINGAN },
        { id: 'e2', source: EyeId.SHARINGAN, target: EyeId.KYUUBI },
        { id: 'e3', source: EyeId.KYUUBI, target: EyeId.JOGAN },
        { id: 'e4', source: EyeId.JOGAN, target: EyeId.TENSEIGAN },
        { id: 'e5', source: EyeId.TENSEIGAN, target: EyeId.BYAKUGAN },
      ],
    },
  },
  {
    id: 'draft-review',
    name: 'Draft Review',
    version: 1,
    description: 'Quick validation pipeline for reviewing existing drafts',
    category: 'default',
    workflowJson: {
      nodes: [
        { id: EyeId.MANGEKYO, type: 'eye', data: { eyeId: EyeId.MANGEKYO, position: { x: 100, y: 200 } } },
        { id: EyeId.TENSEIGAN, type: 'eye', data: { eyeId: EyeId.TENSEIGAN, position: { x: 400, y: 200 } } },
        { id: EyeId.BYAKUGAN, type: 'eye', data: { eyeId: EyeId.BYAKUGAN, position: { x: 700, y: 200 } } },
      ],
      edges: [
        { id: 'e1', source: EyeId.MANGEKYO, target: EyeId.TENSEIGAN },
        { id: 'e2', source: EyeId.TENSEIGAN, target: EyeId.BYAKUGAN },
      ],
    },
  },
  {
    id: 'planning-only',
    name: 'Planning & Architecture',
    version: 1,
    description: 'Strategic planning pipeline for architectural decisions',
    category: 'default',
    workflowJson: {
      nodes: [
        { id: EyeId.OVERSEER, type: 'eye', data: { eyeId: EyeId.OVERSEER, position: { x: 100, y: 200 } } },
        { id: EyeId.SHARINGAN, type: 'eye', data: { eyeId: EyeId.SHARINGAN, position: { x: 400, y: 200 } } },
        { id: EyeId.RINNEGAN, type: 'eye', data: { eyeId: EyeId.RINNEGAN, position: { x: 700, y: 200 } } },
      ],
      edges: [
        { id: 'e1', source: EyeId.OVERSEER, target: EyeId.SHARINGAN },
        { id: 'e2', source: EyeId.SHARINGAN, target: EyeId.RINNEGAN },
      ],
    },
  },
];

