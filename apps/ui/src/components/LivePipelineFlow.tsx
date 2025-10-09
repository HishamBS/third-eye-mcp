'use client';

import { useState, useEffect } from 'react';
import { PipelineVisualization } from './monitor/PipelineVisualization';
import { useWebSocket } from '@/hooks/useWebSocket';

interface LivePipelineFlowProps {
  sessionId: string;
  initialEvents?: Array<Record<string, unknown>>;
}

export function LivePipelineFlow({ sessionId, initialEvents = [] }: LivePipelineFlowProps) {
  const [events, setEvents] = useState<Array<Record<string, unknown>>>(initialEvents);
  const [isConnected, setIsConnected] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
  const { isConnected: wsConnected, lastMessage } = useWebSocket({ sessionId });

  useEffect(() => {
    setIsConnected(wsConnected);
  }, [wsConnected]);

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'pipeline_event' || lastMessage.type === 'eye_complete') {
        setEvents(prev => [...prev, lastMessage]);
      } else if (lastMessage.type === 'pipeline_complete') {
        console.log('Pipeline completed:', lastMessage);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    const fetchInitialEvents = async () => {
      try {
        const response = await fetch(`${API_URL}/api/session/${sessionId}/events`);
        if (response.ok) {
          const data = await response.json();
          setEvents(data.events || data || []);
        }
      } catch (err) {
        console.error('Failed to fetch initial events:', err);
      }
    };

    if (initialEvents.length === 0) {
      fetchInitialEvents();
    }
  }, [sessionId, initialEvents, API_URL]);

  return (
    <div className="relative">
      {/* Connection Status Badge */}
      <div className="absolute top-2 right-2 z-20">
        <div className={`flex items-center space-x-2 rounded-full px-3 py-1 text-xs font-medium ${
          isConnected
            ? 'bg-green-500/20 text-green-400 border border-green-500/40'
            : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
        }`}>
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
          <span>{isConnected ? 'Live' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Pipeline Visualization */}
      <PipelineVisualization
        sessionId={sessionId}
        events={events}
        isLive={isConnected}
      />

      {/* Event Feed */}
      <div className="mt-4 max-h-64 overflow-y-auto rounded-lg bg-brand-paper/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-slate-300">Event Feed</h3>
        <div className="space-y-2">
          {events.slice(-10).reverse().map((event, index) => (
            <div
              key={index}
              className="flex items-start space-x-2 rounded border border-brand-outline/40 bg-brand-ink/50 p-2 text-xs"
            >
              <div className={`mt-0.5 h-2 w-2 flex-shrink-0 rounded-full ${
                event.code?.startsWith('OK') ? 'bg-green-400' :
                event.code?.startsWith('REJECT') ? 'bg-red-400' :
                event.code?.startsWith('NEED') ? 'bg-yellow-400' : 'bg-blue-400'
              }`} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{event.eye || 'System'}</span>
                  <span className="text-slate-500">
                    {new Date(event.createdAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1 text-slate-400">
                  {event.code || event.type}: {event.md || event.message || 'Event received'}
                </p>
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-center text-slate-500">No events yet. Waiting for pipeline activity...</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default LivePipelineFlow;
