interface PlanNode {
  title: string;
  items: string[];
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

export interface PlanRendererProps {
  planMd?: string;
}

export function PlanRenderer({ planMd }: PlanRendererProps) {
  const nodes = parsePlan(planMd);
  if (!nodes.length) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-300">
        No plan detected. Once Rinnegan issues a scaffold, it will render here.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-slate-200">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Visual Plan</p>
        <h3 className="text-lg font-semibold text-white">Rinnegan file impact</h3>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {nodes.map((node) => (
          <article key={node.title} className="rounded-xl border border-brand-outline/30 bg-brand-paper/80 p-3">
            <h4 className="text-sm font-semibold text-white">{node.title}</h4>
            <ul className="mt-2 space-y-1 text-xs text-slate-300">
              {node.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 text-brand-accent">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default PlanRenderer;
