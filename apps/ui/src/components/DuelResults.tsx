import type { WSPipelineEvent } from "../types/pipeline";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

export interface DuelResultsProps {
  events: WSPipelineEvent[];
}

function inferAgent(event: WSPipelineEvent): string | null {
  if (typeof event.data?.agent === "string") return event.data.agent;
  if (typeof event.data?.agent_name === "string") return event.data.agent_name;
  return null;
}

export function DuelResults({ events }: DuelResultsProps) {
  const duelEvents = events.filter((event) => inferAgent(event));
  if (!duelEvents.length) {
    return (
      <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-semantic-muted">
        Launch a duel to see per-agent verdicts.
      </section>
    );
  }

  const grouped = duelEvents.reduce<Record<string, WSPipelineEvent[]>>(
    (acc, event) => {
      const agent = inferAgent(event) ?? "unknown";
      acc[agent] = acc[agent] || [];
      acc[agent].push(event);
      return acc;
    },
    {},
  );

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm text-semantic-muted">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-brand-foreground">
          Duel verdicts
        </h3>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        {Object.entries(grouped).map(([agent, agentEvents]) => (
          <article
            key={agent}
            className="rounded-xl border border-brand-outline/30 bg-brand-paper/80 p-3"
          >
            <header className="flex items-center justify-between text-xs text-semantic-muted">
              <span className="font-mono text-sm text-brand-accent">
                {agent}
              </span>
              <span>{agentEvents.length} events</span>
            </header>
            <ul className="mt-2 space-y-1 text-xs text-semantic-muted">
              {agentEvents.slice(-6).map((event, index) => (
                <li
                  key={`${event.eye}-${event.ts}-${index}`}
                  className="flex items-center justify-between"
                >
                  <span>{event.eye}</span>
                  <span
                    className={
                      event.ok
                        ? "${STATUS_TEXT_COLORS.success}"
                        : event.ok === false
                          ? "${STATUS_TEXT_COLORS.error}"
                          : "${STATUS_TEXT_COLORS.warning}"
                    }
                  >
                    {event.code ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

export default DuelResults;
