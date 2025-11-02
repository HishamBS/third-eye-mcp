'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';

interface PipelineEvent {
  id: string;
  sessionId: string;
  eye: string | null;
  type: string;
  code: string | null;
  md: string | null;
  dataJson: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ReplayTheaterProps {
  sessionId: string;
  events: PipelineEvent[];
}

const SPEED_OPTIONS = [0.5, 1, 2, 3, 5];

export function ReplayTheater({ sessionId, events }: ReplayTheaterProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalEvents = events.length;
  const currentEvent = events[currentIndex];

  useEffect(() => {
    if (totalEvents > 0) {
      setProgress((currentIndex / (totalEvents - 1)) * 100);
    }
  }, [currentIndex, totalEvents]);

  useEffect(() => {
    if (isPlaying && currentIndex < totalEvents - 1) {
      const interval = 1000 / speed;
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= totalEvents - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else if (!isPlaying || currentIndex >= totalEvents - 1) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentIndex, speed, totalEvents]);

  const togglePlayPause = () => {
    if (currentIndex >= totalEvents - 1) {
      setCurrentIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  const handleSkipForward = () => {
    setCurrentIndex(prev => Math.min(prev + 1, totalEvents - 1));
  };

  const handleSkipBackward = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };

  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCurrentIndex(value);
  };

  const handleSpeedChange = () => {
    const currentSpeedIndex = SPEED_OPTIONS.indexOf(speed);
    const nextSpeedIndex = (currentSpeedIndex + 1) % SPEED_OPTIONS.length;
    setSpeed(SPEED_OPTIONS[nextSpeedIndex]);
  };

  const formatTimestamp = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 1
    });
  };

  const getEventStatusColor = (code: string | null) => {
    if (!code) return 'bg-brand-paper0';
    if (code.startsWith('OK')) return STATUS_BG_COLORS.success;
    if (code.startsWith('REJECT')) return STATUS_BG_COLORS.error;
    if (code.startsWith('NEED')) return STATUS_BG_COLORS.warning;
    return STATUS_BG_COLORS.info;
  };

  if (totalEvents === 0) {
    return (
      <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/50 p-12 text-center">
        <p className="text-semantic-muted">No events available for replay</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-foreground">🎬 Replay Theater</h2>
          <p className="mt-1 text-sm text-semantic-muted">
            Session: {sessionId} • {totalEvents} events
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-semantic-muted">Event {currentIndex + 1} / {totalEvents}</span>
        </div>
      </div>

      {/* Current Event Display */}
      {currentEvent && (
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-6 rounded-xl border border-brand-outline/40 bg-brand-ink/60 p-6"
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`h-3 w-3 rounded-full ${getEventStatusColor(currentEvent.code)}`} />
              <span className="text-lg font-semibold text-brand-foreground">
                {currentEvent.eye || 'System'}
              </span>
              <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs font-medium text-brand-accent">
                {currentEvent.type}
              </span>
            </div>
            <span className="text-sm text-semantic-muted">
              {formatTimestamp(currentEvent.createdAt)}
            </span>
          </div>

          {currentEvent.code && (
            <div className="mb-3">
              <span className="rounded bg-brand-paperElev px-2 py-1 font-mono text-xs text-semantic-muted">
                {currentEvent.code}
              </span>
            </div>
          )}

          {currentEvent.md && (
            <div className="rounded-lg bg-brand-paper/50 p-4">
              <p className="text-sm leading-relaxed text-semantic-muted">{currentEvent.md}</p>
            </div>
          )}

          {currentEvent.dataJson && Object.keys(currentEvent.dataJson).length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase text-semantic-muted hover:text-semantic-muted">
                Data JSON
              </summary>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-brand-ink p-3 text-xs text-semantic-muted">
                {JSON.stringify(currentEvent.dataJson, null, 2)}
              </pre>
            </details>
          )}
        </motion.div>
      )}

      {/* Progress Scrubber */}
      <div className="mb-4">
        <div className="relative mb-2">
          <input
            type="range"
            min="0"
            max={totalEvents - 1}
            value={currentIndex}
            onChange={handleScrub}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-brand-paperElev"
            style={{
              background: `linear-gradient(to right, rgb(124 58 237) 0%, rgb(124 58 237) ${progress}%, rgb(51 65 85) ${progress}%, rgb(51 65 85) 100%)`
            }}
          />
          <div className="absolute inset-x-0 top-full mt-1 flex justify-between text-xs text-semantic-muted">
            <span>Start</span>
            <span>End</span>
          </div>
        </div>

        {/* Timeline Markers */}
        <div className="flex items-center space-x-1 overflow-x-auto py-2">
          {events.map((event, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`h-8 min-w-[32px] flex-shrink-0 rounded text-xs font-medium transition ${
                index === currentIndex
                  ? 'bg-brand-accent text-brand-foreground'
                  : 'bg-brand-paperElev text-semantic-muted hover:bg-brand-outline/80'
              }`}
              title={`${event.eye || 'System'} - ${event.type}`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between rounded-xl bg-brand-ink/60 p-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleReset}
            className="rounded-lg bg-brand-paperElev p-2 text-semantic-muted transition hover:bg-brand-outline/80"
            title="Reset to start"
          >
            <SkipBack className="h-5 w-5" />
          </button>

          <button
            onClick={handleSkipBackward}
            className="rounded-lg bg-brand-paperElev p-2 text-semantic-muted transition hover:bg-brand-outline/80"
            title="Previous event"
          >
            <Rewind className="h-5 w-5" />
          </button>

          <button
            onClick={togglePlayPause}
            className="rounded-lg bg-brand-accent p-3 text-brand-foreground transition hover:bg-brand-accent/90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </button>

          <button
            onClick={handleSkipForward}
            className="rounded-lg bg-brand-paperElev p-2 text-semantic-muted transition hover:bg-brand-outline/80"
            title="Next event"
          >
            <FastForward className="h-5 w-5" />
          </button>

          <button
            onClick={() => setCurrentIndex(totalEvents - 1)}
            className="rounded-lg bg-brand-paperElev p-2 text-semantic-muted transition hover:bg-brand-outline/80"
            title="Skip to end"
          >
            <SkipForward className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={handleSpeedChange}
          className="rounded-lg bg-brand-paperElev px-4 py-2 font-semibold text-semantic-muted transition hover:bg-brand-outline/80"
          title="Change playback speed"
        >
          {speed}x
        </button>
      </div>

      {/* Event Legend */}
      <div className="mt-4 flex items-center justify-center space-x-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 rounded-full ${STATUS_BG_COLORS.success}"></div>
          <span className="text-semantic-muted">OK</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 rounded-full ${STATUS_BG_COLORS.error}"></div>
          <span className="text-semantic-muted">Reject</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 rounded-full ${STATUS_BG_COLORS.warning}"></div>
          <span className="text-semantic-muted">Need Input</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 rounded-full ${STATUS_BG_COLORS.info}"></div>
          <span className="text-semantic-muted">Running</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="h-2 w-2 rounded-full bg-brand-paper0"></div>
          <span className="text-semantic-muted">Other</span>
        </div>
      </div>
    </div>
  );
}

export default ReplayTheater;
