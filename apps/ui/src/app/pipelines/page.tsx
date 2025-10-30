'use client';

import { ReactFlowProvider } from 'reactflow';
import { PipelineCanvasEnhanced } from '@/components/pipeline-builder/PipelineCanvasEnhanced';

/**
 * Pipelines Page - Phase 10 Enhanced
 *
 * Full-screen N8N-style pipeline editor
 * Per R13: No inline text, all from components
 */
export default function PipelinesPage() {
  return (
    <ReactFlowProvider>
      <div className="w-full h-screen">
        <PipelineCanvasEnhanced />
      </div>
    </ReactFlowProvider>
  );
}
