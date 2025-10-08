'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EyeStatus {
  name: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'waiting';
  verdict?: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
  latency?: number;
  confidence?: number;
  output?: string;
  lastUpdate?: number;
}

interface PipelineVisualizationProps {
  sessionId: string;
  events: Array<Record<string, unknown>>;
  isLive?: boolean;
}

const EYE_POSITIONS = {
  overseer: { x: 50, y: 10 },
  sharingan: { x: 20, y: 30 },
  'prompt-helper': { x: 50, y: 30 },
  jogan: { x: 80, y: 30 },
  rinnegan: { x: 10, y: 60 },
  mangekyo: { x: 40, y: 60 },
  tenseigan: { x: 60, y: 60 },
  byakugan: { x: 90, y: 60 },
};

const EYE_COLORS = {
  overseer: '#8B5CF6', // Purple
  sharingan: '#EF4444', // Red
  'prompt-helper': '#F59E0B', // Amber
  jogan: '#3B82F6', // Blue
  rinnegan: '#10B981', // Emerald
  mangekyo: '#F97316', // Orange
  tenseigan: '#14B8A6', // Teal
  byakugan: '#6366F1', // Indigo
};

export function PipelineVisualization({ sessionId, events, isLive = false }: PipelineVisualizationProps) {
  const [eyeStatuses, setEyeStatuses] = useState<Record<string, EyeStatus>>({});
  const [connections, setConnections] = useState<Array<{ from: string; to: string; active: boolean }>>([]);
  const [currentFlow, setCurrentFlow] = useState<string[]>([]);

  useEffect(() => {
    // Initialize eye statuses
    const initialStatuses: Record<string, EyeStatus> = {};
    Object.keys(EYE_POSITIONS).forEach(eye => {
      initialStatuses[eye] = {
        name: eye,
        status: 'idle',
        lastUpdate: Date.now()
      };
    });
    setEyeStatuses(initialStatuses);
  }, []);

  useEffect(() => {
    // Update eye statuses based on events
    const statuses = { ...eyeStatuses };
    const flow: string[] = [];
    const activeConnections: Array<{ from: string; to: string; active: boolean }> = [];

    events.forEach((event, index) => {
      if (event.eye && statuses[event.eye]) {
        const eyeStatus = statuses[event.eye];

        // Determine status based on event code
        if (event.code === 'OK' || event.code === 'OK_WITH_NOTES') {
          eyeStatus.status = 'completed';
          eyeStatus.verdict = 'APPROVED';
        } else if (event.code?.startsWith('REJECT_')) {
          eyeStatus.status = 'completed';
          eyeStatus.verdict = 'REJECTED';
        } else if (event.code?.startsWith('NEED_')) {
          eyeStatus.status = 'completed';
          eyeStatus.verdict = 'NEEDS_INPUT';
        } else {
          eyeStatus.status = 'running';
        }

        eyeStatus.output = event.md || event.code;
        eyeStatus.lastUpdate = new Date(event.createdAt).getTime();

        // Extract confidence if available
        if (event.dataJson?.confidence) {
          eyeStatus.confidence = event.dataJson.confidence;
        }

        flow.push(event.eye);

        // Create connections between consecutive eyes
        if (index > 0 && events[index - 1].eye) {
          activeConnections.push({
            from: events[index - 1].eye,
            to: event.eye,
            active: true
          });
        }
      }
    });

    setEyeStatuses(statuses);
    setCurrentFlow(flow);
    setConnections(activeConnections);
  }, [events]);

  const getEyeStatusColor = (status: EyeStatus) => {
    switch (status.status) {
      case 'completed':
        return status.verdict === 'APPROVED' ? '#10B981' :
               status.verdict === 'REJECTED' ? '#EF4444' : '#F59E0B';
      case 'running':
        return '#3B82F6';
      case 'failed':
        return '#EF4444';
      case 'waiting':
        return '#6B7280';
      default:
        return '#374151';
    }
  };

  const getEyeStatusIcon = (status: EyeStatus) => {
    switch (status.status) {
      case 'completed':
        return status.verdict === 'APPROVED' ? '✅' :
               status.verdict === 'REJECTED' ? '❌' : '⚠️';
      case 'running':
        return '🔄';
      case 'failed':
        return '💥';
      case 'waiting':
        return '⏳';
      default:
        return '⚪';
    }
  };

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-2xl bg-gradient-to-br from-brand-paper/50 to-brand-ink/80 p-6">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="h-full w-full" style={{
          backgroundImage: `
            linear-gradient(rgba(147, 197, 253, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(147, 197, 253, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* Session Info */}
      <div className="absolute top-4 left-4 z-10">
        <div className="rounded-lg bg-brand-paper/80 px-3 py-2 backdrop-blur-sm">
          <p className="text-xs font-medium text-slate-300">Session: {sessionId}</p>
          <p className="text-xs text-slate-400">
            Active Eyes: {currentFlow.length} |
            {isLive && <span className="ml-2 inline-flex items-center">
              <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
              LIVE
            </span>}
          </p>
        </div>
      </div>

      {/* Pipeline Flow Indicator */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex space-x-1 rounded-lg bg-brand-paper/80 px-3 py-2 backdrop-blur-sm">
          {currentFlow.slice(-5).map((eye, index) => (
            <div
              key={`${eye}-${index}`}
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: EYE_COLORS[eye as keyof typeof EYE_COLORS] || '#6B7280' }}
              title={eye}
            />
          ))}
        </div>
      </div>

      {/* Connection Lines */}
      <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
        {connections.map((connection, index) => {
          const fromPos = EYE_POSITIONS[connection.from as keyof typeof EYE_POSITIONS];
          const toPos = EYE_POSITIONS[connection.to as keyof typeof EYE_POSITIONS];

          if (!fromPos || !toPos) return null;

          const fromX = (fromPos.x / 100) * 100; // Convert percentage to actual position
          const fromY = (fromPos.y / 100) * 100;
          const toX = (toPos.x / 100) * 100;
          const toY = (toPos.y / 100) * 100;

          return (
            <motion.line
              key={`${connection.from}-${connection.to}-${index}`}
              x1={`${fromX}%`}
              y1={`${fromY}%`}
              x2={`${toX}%`}
              y2={`${toY}%`}
              stroke={connection.active ? '#3B82F6' : '#374151'}
              strokeWidth="2"
              strokeDasharray={connection.active ? '5,5' : '0'}
              opacity={connection.active ? 0.8 : 0.3}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: connection.active ? 0.8 : 0.3 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
          );
        })}
      </svg>

      {/* Eye Nodes */}
      <AnimatePresence>
        {Object.entries(EYE_POSITIONS).map(([eyeName, position]) => {
          const status = eyeStatuses[eyeName];
          if (!status) return null;

          return (
            <motion.div
              key={eyeName}
              className="absolute z-10 cursor-pointer"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {/* Eye Node */}
              <div
                className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-lg transition-all duration-300"
                style={{
                  backgroundColor: getEyeStatusColor(status),
                  borderColor: getEyeStatusColor(status),
                  boxShadow: `0 4px 12px ${getEyeStatusColor(status)}40`
                }}
              >
                <span className="text-lg">
                  {getEyeStatusIcon(status)}
                </span>

                {/* Pulse Animation for Active Eyes */}
                {status.status === 'running' && (
                  <div
                    className="absolute inset-0 animate-ping rounded-full"
                    style={{ backgroundColor: getEyeStatusColor(status) }}
                  />
                )}

                {/* Confidence Indicator */}
                {status.confidence !== undefined && (
                  <div
                    className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-800"
                    title={`Confidence: ${status.confidence}%`}
                  >
                    {Math.round(status.confidence)}
                  </div>
                )}
              </div>

              {/* Eye Name Label */}
              <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white">
                {eyeName}
              </div>

              {/* Tooltip on Hover */}
              <div className="absolute bottom-16 left-1/2 z-20 hidden -translate-x-1/2 rounded-lg bg-black/90 px-3 py-2 text-xs text-white shadow-xl hover:block group-hover:block">
                <p className="font-semibold">{eyeName}</p>
                <p className="text-slate-300">Status: {status.status}</p>
                {status.verdict && <p className="text-slate-300">Verdict: {status.verdict}</p>}
                {status.latency && <p className="text-slate-300">Latency: {status.latency}ms</p>}
                {status.output && (
                  <p className="mt-1 max-w-xs truncate text-slate-400">
                    {status.output}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <div className="rounded-lg bg-brand-paper/80 px-3 py-2 backdrop-blur-sm">
          <div className="flex space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-gray-500"></div>
              <span className="text-slate-400">Idle</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <span className="text-slate-400">Running</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-slate-400">Approved</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="h-2 w-2 rounded-full bg-red-500"></div>
              <span className="text-slate-400">Rejected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}