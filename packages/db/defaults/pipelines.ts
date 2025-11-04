/**
 * Default Pipelines - SSOT for seeded pipeline configurations
 * 
 * All pipelines are database rows (no hardcoded pipelines in frontend)
 * These pipelines are seeded on startup
 */

import type { NewPipeline } from '../schema';

export const DEFAULT_PIPELINES: Omit<NewPipeline, 'createdAt' | 'active'>[] = [
  {
    id: 'new-task-full',
    name: 'New Task - Full Pipeline',
    version: 1,
    description: 'Complete validation pipeline for new content creation tasks',
    category: 'default',
    workflowJson: {
      nodes: [
        { id: 'overseer', type: 'eye', data: { eyeId: 'overseer', position: { x: 100, y: 200 } } },
        { id: 'sharingan', type: 'eye', data: { eyeId: 'sharingan', position: { x: 400, y: 100 } } },
        { id: 'kyuubi', type: 'eye', data: { eyeId: 'kyuubi', position: { x: 700, y: 100 } } },
        { id: 'jogan', type: 'eye', data: { eyeId: 'jogan', position: { x: 1000, y: 100 } } },
        { id: 'tenseigan', type: 'eye', data: { eyeId: 'tenseigan', position: { x: 1300, y: 200 } } },
        { id: 'byakugan', type: 'eye', data: { eyeId: 'byakugan', position: { x: 1600, y: 200 } } },
      ],
      edges: [
        { id: 'e1', source: 'overseer', target: 'sharingan' },
        { id: 'e2', source: 'sharingan', target: 'kyuubi' },
        { id: 'e3', source: 'kyuubi', target: 'jogan' },
        { id: 'e4', source: 'jogan', target: 'tenseigan' },
        { id: 'e5', source: 'tenseigan', target: 'byakugan' },
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
        { id: 'mangekyo', type: 'eye', data: { eyeId: 'mangekyo', position: { x: 100, y: 200 } } },
        { id: 'tenseigan', type: 'eye', data: { eyeId: 'tenseigan', position: { x: 400, y: 200 } } },
        { id: 'byakugan', type: 'eye', data: { eyeId: 'byakugan', position: { x: 700, y: 200 } } },
      ],
      edges: [
        { id: 'e1', source: 'mangekyo', target: 'tenseigan' },
        { id: 'e2', source: 'tenseigan', target: 'byakugan' },
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
        { id: 'overseer', type: 'eye', data: { eyeId: 'overseer', position: { x: 100, y: 200 } } },
        { id: 'sharingan', type: 'eye', data: { eyeId: 'sharingan', position: { x: 400, y: 200 } } },
        { id: 'rinnegan', type: 'eye', data: { eyeId: 'rinnegan', position: { x: 700, y: 200 } } },
      ],
      edges: [
        { id: 'e1', source: 'overseer', target: 'sharingan' },
        { id: 'e2', source: 'sharingan', target: 'rinnegan' },
      ],
    },
  },
];

