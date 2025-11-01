'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, BarChart3, Eye, ArrowDownToLine, ArrowUpFromLine, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';
import { METRIC_COLORS } from '@/constants/design-tokens';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: ReactNode;
  color?: string;
}

interface PerformanceMetricsProps {
  events: Array<Record<string, unknown>>;
  runs?: Array<Record<string, unknown>>;
}

function MetricCard({ title, value, unit, trend, trendValue, icon, color = METRIC_COLORS.info }: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return METRIC_COLORS.success;
      case 'down': return METRIC_COLORS.error;
      default: return METRIC_COLORS.muted;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3" />;
      case 'down': return <TrendingDown className="h-3 w-3" />;
      default: return <Minus className="h-3 w-3" />;
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
          {icon && <div className="flex items-center">{icon}</div>}
          <p className="text-sm font-medium text-brand-outline">{title}</p>
        </div>
        {trend && trendValue && (
          <div className="flex items-center space-x-1 text-xs" style={{ color: getTrendColor() }}>
            {getTrendIcon()}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-brand-foreground" style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-sm text-brand-outline">{unit}</span>}
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
          icon={<Target className="h-5 w-5" style={{ color: metrics.successRate >= 80 ? METRIC_COLORS.success : metrics.successRate >= 60 ? METRIC_COLORS.warning : METRIC_COLORS.error }} />}
          color={metrics.successRate >= 80 ? METRIC_COLORS.success : metrics.successRate >= 60 ? METRIC_COLORS.warning : METRIC_COLORS.error}
          trend={metrics.successRate >= 80 ? 'up' : metrics.successRate >= 60 ? 'neutral' : 'down'}
          trendValue={`${metrics.totalRuns} runs`}
        />

        <MetricCard
          title="Avg Latency"
          value={metrics.avgLatency}
          unit="ms"
          icon={<Zap className="h-5 w-5" style={{ color: metrics.avgLatency <= 1000 ? METRIC_COLORS.success : metrics.avgLatency <= 3000 ? METRIC_COLORS.warning : METRIC_COLORS.error }} />}
          color={metrics.avgLatency <= 1000 ? METRIC_COLORS.success : metrics.avgLatency <= 3000 ? METRIC_COLORS.warning : METRIC_COLORS.error}
          trend={metrics.avgLatency <= 1000 ? 'up' : 'down'}
          trendValue={`${metrics.totalRuns} samples`}
        />

        <MetricCard
          title="Events/Hour"
          value={metrics.eventsPerHour}
          icon={<BarChart3 className="h-5 w-5" style={{ color: METRIC_COLORS.info }} />}
          color={METRIC_COLORS.info}
          trend="neutral"
          trendValue="last hour"
        />

        <MetricCard
          title="Active Eyes"
          value={metrics.uniqueEyes}
          unit="eyes"
          icon={<Eye className="h-5 w-5" style={{ color: METRIC_COLORS.primary }} />}
          color={METRIC_COLORS.primary}
          trend="neutral"
          trendValue={`${metrics.totalEvents} events`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          title="Tokens In"
          value={metrics.totalTokensIn.toLocaleString()}
          icon={<ArrowDownToLine className="h-5 w-5" style={{ color: METRIC_COLORS.accent }} />}
          color={METRIC_COLORS.accent}
          trend="neutral"
          trendValue="total input"
        />

        <MetricCard
          title="Tokens Out"
          value={metrics.totalTokensOut.toLocaleString()}
          icon={<ArrowUpFromLine className="h-5 w-5" style={{ color: METRIC_COLORS.warning }} />}
          color={METRIC_COLORS.warning}
          trend="neutral"
          trendValue="total output"
        />

        {metrics.avgConfidence > 0 && (
          <MetricCard
            title="Avg Confidence"
            value={metrics.avgConfidence}
            unit="%"
            icon={<Brain className="h-5 w-5" style={{ color: metrics.avgConfidence >= 80 ? METRIC_COLORS.success : metrics.avgConfidence >= 60 ? METRIC_COLORS.warning : METRIC_COLORS.error }} />}
            color={metrics.avgConfidence >= 80 ? METRIC_COLORS.success : metrics.avgConfidence >= 60 ? METRIC_COLORS.warning : METRIC_COLORS.error}
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
            <div className="h-2 w-2 animate-pulse rounded-full ${STATUS_TEXT_COLORS.success}"></div>
            <p className="text-sm font-medium text-brand-outline">Pipeline Activity</p>
          </div>
          <p className="text-xs text-brand-outline">Last 24 hours</p>
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

        <div className="mt-2 flex justify-between text-xs text-brand-outline">
          <span>24h ago</span>
          <span>Now</span>
        </div>
      </motion.div>
    </div>
  );
}
