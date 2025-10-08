'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: string;
  color?: string;
}

interface PerformanceMetricsProps {
  events: Array<Record<string, unknown>>;
  runs?: Array<Record<string, unknown>>;
}

function MetricCard({ title, value, unit, trend, trendValue, icon, color = '#3B82F6' }: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return '#10B981';
      case 'down': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      default: return '→';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-brand-outline/30 bg-brand-paper/60 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon && <span className="text-lg">{icon}</span>}
          <p className="text-sm font-medium text-slate-300">{title}</p>
        </div>
        {trend && trendValue && (
          <div className="flex items-center space-x-1 text-xs" style={{ color: getTrendColor() }}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-white" style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
    </motion.div>
  );
}

export function PerformanceMetrics({ events, runs = [] }: PerformanceMetricsProps) {
  const metrics = useMemo(() => {
    const now = Date.now();
    const recentEvents = events.filter(event =>
      now - new Date(event.createdAt).getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    // Calculate success rate
    const completedEvents = recentEvents.filter(event =>
      event.code === 'OK' || event.code === 'OK_WITH_NOTES' || event.code?.startsWith('REJECT_')
    );
    const successfulEvents = recentEvents.filter(event =>
      event.code === 'OK' || event.code === 'OK_WITH_NOTES'
    );
    const successRate = completedEvents.length > 0
      ? Math.round((successfulEvents.length / completedEvents.length) * 100)
      : 0;

    // Calculate average latency from runs
    const runLatencies = runs
      .filter(run => run.latencyMs && run.latencyMs > 0)
      .map(run => run.latencyMs);
    const avgLatency = runLatencies.length > 0
      ? Math.round(runLatencies.reduce((sum, lat) => sum + lat, 0) / runLatencies.length)
      : 0;

    // Calculate token usage
    const totalTokensIn = runs.reduce((sum, run) => sum + (run.tokensIn || 0), 0);
    const totalTokensOut = runs.reduce((sum, run) => sum + (run.tokensOut || 0), 0);

    // Calculate events per hour
    const hourAgo = now - 60 * 60 * 1000;
    const recentHourEvents = events.filter(event =>
      new Date(event.createdAt).getTime() > hourAgo
    );
    const eventsPerHour = recentHourEvents.length;

    // Calculate unique eyes used
    const uniqueEyes = new Set(events.filter(e => e.eye).map(e => e.eye)).size;

    // Calculate confidence score (if available)
    const confidenceScores = events
      .filter(event => event.dataJson?.confidence)
      .map(event => event.dataJson.confidence);
    const avgConfidence = confidenceScores.length > 0
      ? Math.round(confidenceScores.reduce((sum, conf) => sum + conf, 0) / confidenceScores.length)
      : 0;

    return {
      successRate,
      avgLatency,
      totalTokensIn,
      totalTokensOut,
      eventsPerHour,
      uniqueEyes,
      avgConfidence,
      totalEvents: events.length,
      totalRuns: runs.length
    };
  }, [events, runs]);

  return (
    <div className="space-y-6">
      {/* Primary Metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          title="Success Rate"
          value={metrics.successRate}
          unit="%"
          icon="🎯"
          color={metrics.successRate >= 80 ? '#10B981' : metrics.successRate >= 60 ? '#F59E0B' : '#EF4444'}
          trend={metrics.successRate >= 80 ? 'up' : metrics.successRate >= 60 ? 'neutral' : 'down'}
          trendValue={`${metrics.totalRuns} runs`}
        />

        <MetricCard
          title="Avg Latency"
          value={metrics.avgLatency}
          unit="ms"
          icon="⚡"
          color={metrics.avgLatency <= 1000 ? '#10B981' : metrics.avgLatency <= 3000 ? '#F59E0B' : '#EF4444'}
          trend={metrics.avgLatency <= 1000 ? 'up' : 'down'}
          trendValue={`${metrics.totalRuns} samples`}
        />

        <MetricCard
          title="Events/Hour"
          value={metrics.eventsPerHour}
          icon="📊"
          color="#3B82F6"
          trend="neutral"
          trendValue="last hour"
        />

        <MetricCard
          title="Active Eyes"
          value={metrics.uniqueEyes}
          unit="eyes"
          icon="👁️"
          color="#8B5CF6"
          trend="neutral"
          trendValue={`${metrics.totalEvents} events`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Tokens In"
          value={metrics.totalTokensIn.toLocaleString()}
          icon="📥"
          color="#14B8A6"
          trend="neutral"
          trendValue="total input"
        />

        <MetricCard
          title="Tokens Out"
          value={metrics.totalTokensOut.toLocaleString()}
          icon="📤"
          color="#F97316"
          trend="neutral"
          trendValue="total output"
        />

        {metrics.avgConfidence > 0 && (
          <MetricCard
            title="Avg Confidence"
            value={metrics.avgConfidence}
            unit="%"
            icon="🧠"
            color={metrics.avgConfidence >= 80 ? '#10B981' : metrics.avgConfidence >= 60 ? '#F59E0B' : '#EF4444'}
            trend={metrics.avgConfidence >= 80 ? 'up' : 'down'}
            trendValue="model confidence"
          />
        )}
      </div>

      {/* Real-time Activity Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-brand-outline/30 bg-brand-paper/60 p-4 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
            <p className="text-sm font-medium text-slate-300">Pipeline Activity</p>
          </div>
          <p className="text-xs text-slate-400">Last 24 hours</p>
        </div>

        <div className="mt-3 flex space-x-1">
          {/* Simple activity bar chart */}
          {Array.from({ length: 24 }, (_, i) => {
            const hourStart = new Date(Date.now() - (23 - i) * 60 * 60 * 1000);
            const hourEnd = new Date(Date.now() - (22 - i) * 60 * 60 * 1000);

            const hourEvents = events.filter(event => {
              const eventTime = new Date(event.createdAt);
              return eventTime >= hourStart && eventTime < hourEnd;
            });

            const height = Math.max(4, Math.min(32, (hourEvents.length / 10) * 32));

            return (
              <div
                key={i}
                className="flex-1 rounded-sm bg-brand-accent/60"
                style={{ height: `${height}px` }}
                title={`${hourStart.getHours()}:00 - ${hourEvents.length} events`}
              />
            );
          })}
        </div>

        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>24h ago</span>
          <span>Now</span>
        </div>
      </motion.div>
    </div>
  );
}