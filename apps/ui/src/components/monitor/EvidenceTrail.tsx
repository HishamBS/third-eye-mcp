'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Evidence {
  id: string;
  source: string;
  content: string;
  type: 'citation' | 'analysis' | 'validation' | 'contradiction' | 'fact';
  confidence?: number;
  timestamp: number;
  eyeSource: string;
  verified?: boolean;
  metadata?: Record<string, unknown>;
}

interface EvidenceTrailProps {
  events: Array<Record<string, unknown>>;
  sessionId: string;
}

export function EvidenceTrail({ events, sessionId }: EvidenceTrailProps) {
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const evidenceItems = useMemo(() => {
    const items: Evidence[] = [];

    events.forEach(event => {
      if (event.eye && event.md) {
        // Extract evidence from Tenseigan (fact-checking)
        if (event.eye === 'tenseigan') {
          items.push({
            id: `${event.id}-fact`,
            source: event.md,
            content: event.md,
            type: 'fact',
            confidence: event.dataJson?.confidence || 0,
            timestamp: new Date(event.createdAt).getTime(),
            eyeSource: 'tenseigan',
            verified: event.code === 'OK',
            metadata: event.dataJson
          });
        }

        // Extract evidence from Byakugan (consistency checking)
        if (event.eye === 'byakugan') {
          items.push({
            id: `${event.id}-validation`,
            source: event.md,
            content: event.md,
            type: 'validation',
            confidence: event.dataJson?.confidence || 0,
            timestamp: new Date(event.createdAt).getTime(),
            eyeSource: 'byakugan',
            verified: event.code === 'OK',
            metadata: event.dataJson
          });
        }

        // Extract citations from any eye that mentions sources
        if (event.md.includes('[') && event.md.includes(']')) {
          const citations = event.md.match(/\[([^\]]+)\]/g);
          citations?.forEach((citation, index) => {
            items.push({
              id: `${event.id}-citation-${index}`,
              source: citation,
              content: `Citation found: ${citation}`,
              type: 'citation',
              timestamp: new Date(event.createdAt).getTime(),
              eyeSource: event.eye,
              verified: true,
              metadata: { originalText: event.md }
            });
          });
        }

        // Extract contradictions from rejection codes
        if (event.code?.includes('REJECT_INCONSISTENT') || event.code?.includes('CONTRADICT')) {
          items.push({
            id: `${event.id}-contradiction`,
            source: event.md,
            content: event.md,
            type: 'contradiction',
            confidence: event.dataJson?.confidence || 0,
            timestamp: new Date(event.createdAt).getTime(),
            eyeSource: event.eye,
            verified: true,
            metadata: event.dataJson
          });
        }

        // Extract analysis from Rinnegan (planning) and Mangekyo (implementation)
        if (event.eye === 'rinnegan' || event.eye === 'mangekyo') {
          items.push({
            id: `${event.id}-analysis`,
            source: event.md,
            content: event.md,
            type: 'analysis',
            confidence: event.dataJson?.confidence || 0,
            timestamp: new Date(event.createdAt).getTime(),
            eyeSource: event.eye,
            verified: event.code === 'OK',
            metadata: event.dataJson
          });
        }
      }
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [events]);

  const filteredEvidence = useMemo(() => {
    let filtered = evidenceItems;

    if (selectedType !== 'all') {
      filtered = filtered.filter(item => item.type === selectedType);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.content.toLowerCase().includes(term) ||
        item.source.toLowerCase().includes(term) ||
        item.eyeSource.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [evidenceItems, selectedType, searchTerm]);

  const evidenceStats = useMemo(() => {
    const stats = {
      citation: 0,
      analysis: 0,
      validation: 0,
      contradiction: 0,
      fact: 0
    };

    evidenceItems.forEach(item => {
      stats[item.type]++;
    });

    return stats;
  }, [evidenceItems]);

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'citation': return '📖';
      case 'analysis': return '🧠';
      case 'validation': return '✅';
      case 'contradiction': return '⚠️';
      case 'fact': return '🔍';
      default: return '📄';
    }
  };

  const getEvidenceColor = (type: string, verified: boolean = true) => {
    const colors = {
      citation: verified ? '#3B82F6' : '#6B7280',
      analysis: verified ? '#8B5CF6' : '#6B7280',
      validation: verified ? '#10B981' : '#EF4444',
      contradiction: '#F59E0B',
      fact: verified ? '#14B8A6' : '#EF4444'
    };
    return colors[type as keyof typeof colors] || '#6B7280';
  };

  const getEyeIcon = (eye: string) => {
    const icons: Record<string, string> = {
      tenseigan: '🔍',
      byakugan: '👁️',
      rinnegan: '🧠',
      mangekyo: '⚡',
      sharingan: '🎯'
    };
    return icons[eye] || '👁️';
  };

  return (
    <div className="space-y-6">
      {/* Evidence Statistics */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(evidenceStats).map(([type, count]) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`cursor-pointer rounded-xl border p-3 text-center transition-all ${
              selectedType === type
                ? 'border-brand-accent bg-brand-accent/20'
                : 'border-brand-outline/30 bg-brand-paper/60 hover:bg-brand-paper/80'
            }`}
            onClick={() => setSelectedType(selectedType === type ? 'all' : type)}
          >
            <div className="text-lg">{getEvidenceIcon(type)}</div>
            <div className="mt-1 text-xs font-medium capitalize text-slate-300">{type}</div>
            <div className="text-lg font-bold text-white">{count}</div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search evidence..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-brand-outline/40 bg-brand-paper/60 px-4 py-2 text-white placeholder-slate-400 focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
          />
        </div>
        <button
          onClick={() => {
            setSelectedType('all');
            setSearchTerm('');
          }}
          className="rounded-lg border border-brand-outline/40 bg-brand-paper/60 px-4 py-2 text-sm text-slate-300 hover:bg-brand-paper/80"
        >
          Clear
        </button>
      </div>

      {/* Evidence List */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredEvidence.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border border-brand-outline/30 bg-brand-paper/60 p-8 text-center"
            >
              <p className="text-slate-400">
                {evidenceItems.length === 0
                  ? 'No evidence collected yet.'
                  : 'No evidence matches your filters.'}
              </p>
            </motion.div>
          ) : (
            filteredEvidence.map((evidence, index) => (
              <motion.div
                key={evidence.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-xl border border-brand-outline/30 bg-brand-paper/60 p-4 backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full text-sm"
                      style={{
                        backgroundColor: `${getEvidenceColor(evidence.type, evidence.verified)}20`,
                        color: getEvidenceColor(evidence.type, evidence.verified)
                      }}
                    >
                      {getEvidenceIcon(evidence.type)}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium capitalize text-white">
                          {evidence.type}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-xs">{getEyeIcon(evidence.eyeSource)}</span>
                          <span className="text-xs text-slate-400">{evidence.eyeSource}</span>
                        </div>
                        {evidence.confidence !== undefined && (
                          <>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs text-slate-400">
                              {Math.round(evidence.confidence)}% confidence
                            </span>
                          </>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                        {evidence.content}
                      </p>

                      {evidence.metadata && Object.keys(evidence.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
                            View metadata
                          </summary>
                          <pre className="mt-1 overflow-x-auto rounded bg-black/40 p-2 text-xs text-slate-400">
                            {JSON.stringify(evidence.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-1">
                    <span className="text-xs text-slate-500">
                      {new Date(evidence.timestamp).toLocaleTimeString()}
                    </span>
                    {evidence.verified !== undefined && (
                      <span className={`text-xs ${evidence.verified ? 'text-green-400' : 'text-red-400'}`}>
                        {evidence.verified ? '✓ Verified' : '✗ Unverified'}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Evidence Summary */}
      {evidenceItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-brand-outline/30 bg-brand-paper/60 p-4 backdrop-blur-sm"
        >
          <h3 className="text-sm font-medium text-white mb-3">Evidence Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Total Evidence Items</p>
              <p className="text-lg font-bold text-white">{evidenceItems.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Verification Rate</p>
              <p className="text-lg font-bold text-white">
                {Math.round(
                  (evidenceItems.filter(e => e.verified).length / evidenceItems.length) * 100
                )}%
              </p>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-brand-outline/30">
            <p className="text-xs text-slate-400">
              Evidence is automatically collected from Eyes as they process your requests.
              Tenseigan validates facts, Byakugan checks consistency, and other Eyes contribute analysis.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}