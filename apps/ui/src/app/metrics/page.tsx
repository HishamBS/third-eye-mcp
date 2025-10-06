'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import MetricsOverview from '@/components/MetricsOverview';
import type { MetricsData } from '@/components/MetricsOverview';

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    setError(null);
    try {
      const response = await fetch('/api/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      fetchMetrics();
    }, 30_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Observability</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Provider & Budget Metrics</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-brand-primary/40 bg-brand-primary/10 p-4 text-sm text-brand-primary"
          >
            {error}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <MetricsOverview metrics={metrics} loading={loadingMetrics} />
        </motion.div>
      </div>
    </div>
  );
}
