import { useState } from 'react';

interface PlanNode {
  title: string;
  items: string[];
}

interface FileImpact {
  path: string;
  action: 'create' | 'modify' | 'delete';
  phase?: 'scaffold' | 'impl' | 'tests' | 'docs';
}

function parsePlan(planMd?: string): PlanNode[] {
  if (!planMd) return [];
  const lines = planMd.split('\n');
  const nodes: PlanNode[] = [];
  let current: PlanNode | null = null;
  for (const line of lines) {
    if (line.startsWith('### ')) {
      if (current) nodes.push(current);
      current = { title: line.replace(/^###\s*/, ''), items: [] };
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      current?.items.push(line.replace(/^[-*]\s*/, ''));
    }
  }
  if (current) nodes.push(current);
  return nodes;
}

function extractFileImpacts(planMd?: string): FileImpact[] {
  if (!planMd) return [];

  const impacts: FileImpact[] = [];
  const lines = planMd.split('\n');

  for (const line of lines) {
    // Match patterns like: "- Create src/components/Foo.tsx"
    const createMatch = line.match(/create\s+([^\s]+\.\w+)/i);
    const modifyMatch = line.match(/modify|update|edit\s+([^\s]+\.\w+)/i);
    const deleteMatch = line.match(/delete|remove\s+([^\s]+\.\w+)/i);

    if (createMatch) {
      impacts.push({ path: createMatch[1], action: 'create' });
    } else if (modifyMatch) {
      impacts.push({ path: modifyMatch[1], action: 'modify' });
    } else if (deleteMatch) {
      impacts.push({ path: deleteMatch[1], action: 'delete' });
    }
  }

  return impacts;
}

function buildFileTree(impacts: FileImpact[]): Record<string, FileImpact[]> {
  const tree: Record<string, FileImpact[]> = {};

  for (const impact of impacts) {
    const parts = impact.path.split('/');
    const dir = parts.slice(0, -1).join('/') || 'root';

    if (!tree[dir]) tree[dir] = [];
    tree[dir].push(impact);
  }

  return tree;
}

export interface PlanRendererProps {
  planMd?: string;
}

export function PlanRenderer({ planMd }: PlanRendererProps) {
  const [view, setView] = useState<'plan' | 'files' | 'kanban'>('plan');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['root']));

  const nodes = parsePlan(planMd);
  const fileImpacts = extractFileImpacts(planMd);
  const fileTree = buildFileTree(fileImpacts);

  if (!nodes.length && !fileImpacts.length) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-300">
        No plan detected. Once Rinnegan issues a scaffold, it will render here.
      </section>
    );
  }

  const toggleDir = (dir: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dir)) {
        next.delete(dir);
      } else {
        next.add(dir);
      }
      return next;
    });
  };

  const getActionColor = (action: FileImpact['action']) => {
    switch (action) {
      case 'create': return 'text-emerald-400';
      case 'modify': return 'text-amber-400';
      case 'delete': return 'text-rose-400';
    }
  };

  const getActionIcon = (action: FileImpact['action']) => {
    switch (action) {
      case 'create': return '+';
      case 'modify': return '~';
      case 'delete': return '-';
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-200">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Visual Plan</p>
          <h3 className="text-lg font-semibold text-white">Implementation Roadmap</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('plan')}
            className={`px-3 py-1 rounded text-xs ${view === 'plan' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Plan
          </button>
          <button
            onClick={() => setView('files')}
            className={`px-3 py-1 rounded text-xs ${view === 'files' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Files ({fileImpacts.length})
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`px-3 py-1 rounded text-xs ${view === 'kanban' ? 'bg-brand-accent text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Kanban
          </button>
        </div>
      </header>

      {view === 'plan' && (
        <div className="grid gap-3 md:grid-cols-2">
          {nodes.map((node) => (
            <article key={node.title} className="rounded-xl border border-brand-outline/30 bg-brand-paper/80 p-3">
              <h4 className="text-sm font-semibold text-white">{node.title}</h4>
              <ul className="mt-2 space-y-1 text-xs text-slate-300">
                {node.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 text-brand-accent">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}

      {view === 'files' && (
        <div className="space-y-2">
          {Object.entries(fileTree).map(([dir, impacts]) => (
            <div key={dir} className="rounded-lg border border-brand-outline/30 bg-brand-paper/60 p-2">
              <button
                onClick={() => toggleDir(dir)}
                className="flex items-center gap-2 w-full text-left text-xs font-semibold text-white hover:text-brand-accent transition"
              >
                <span>{expandedDirs.has(dir) ? '▼' : '▶'}</span>
                <span>📁 {dir}</span>
                <span className="text-slate-500">({impacts.length})</span>
              </button>
              {expandedDirs.has(dir) && (
                <ul className="mt-2 ml-6 space-y-1">
                  {impacts.map((impact, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs">
                      <span className={`font-bold ${getActionColor(impact.action)}`}>
                        {getActionIcon(impact.action)}
                      </span>
                      <span className="text-slate-300">{impact.path.split('/').pop()}</span>
                      <span className={`ml-auto ${getActionColor(impact.action)}`}>
                        {impact.action}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {view === 'kanban' && (
        <div className="grid grid-cols-5 gap-2 overflow-x-auto">
          {['Plan', 'Scaffold', 'Implementation', 'Tests', 'Documentation'].map((phase) => (
            <div key={phase} className="min-w-[150px]">
              <div className="rounded-t-lg bg-brand-accent/20 border border-brand-accent/40 px-2 py-1 text-xs font-semibold text-white text-center">
                {phase}
              </div>
              <div className="rounded-b-lg border border-brand-outline/30 bg-brand-paper/40 p-2 min-h-[100px] space-y-1">
                {fileImpacts
                  .filter((impact) => {
                    // Simple heuristic for phase detection
                    if (phase === 'Tests' && impact.path.includes('test')) return true;
                    if (phase === 'Documentation' && (impact.path.includes('docs') || impact.path.endsWith('.md'))) return true;
                    if (phase === 'Scaffold' && impact.action === 'create') return true;
                    if (phase === 'Implementation' && impact.action === 'modify') return true;
                    return false;
                  })
                  .slice(0, 3)
                  .map((impact, idx) => (
                    <div key={idx} className="rounded bg-brand-paperElev/80 p-1.5 text-xs border border-brand-outline/20">
                      <div className={`font-semibold ${getActionColor(impact.action)}`}>
                        {impact.path.split('/').pop()}
                      </div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{impact.action}</div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default PlanRenderer;
