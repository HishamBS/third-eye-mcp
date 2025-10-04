import type { ReactNode } from 'react';

type GuideSection = {
  id: string;
  title: string;
  lead?: string;
  body: ReactNode;
};

const sections: GuideSection[] = [
  {
    id: 'start-session',
    title: '1. Start a Session',
    lead: 'Connect the portal to your Overseer deployment and pick the workflow you want to monitor.',
    body: (
      <>
        <ul className="list-disc space-y-2 pl-5 text-slate-300">
          <li>Paste your Overseer API key on the landing page — it is stored in local storage only.</li>
          <li>The session dropdown is populated via <code className="rounded bg-brand-paper px-1">GET /sessions</code>, so you never have to copy raw IDs.</li>
          <li>Enable “auto-open latest” if you want the newest session to launch automatically when the backend emits a run.</li>
          <li>Inside the monitor header, toggle <strong>Auto-follow session</strong> to stay in sync with the pipeline. Disable it to inspect historical sessions while a new run streams.</li>
        </ul>
        <p className="mt-3 text-slate-400">Destination: <code className="rounded bg-brand-paper px-1">/session/:id</code> — the Truth Monitor with live telemetry, retry counts, and hero metrics.</p>
      </>
    ),
  },
  {
    id: 'eye-cards',
    title: '2. Read the Eye Cards',
    lead: 'Each Eye enforces a specific gate. The cards update in real time as envelopes arrive.',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Statuses: 🟢 Approved, 🔴 Blocked, 🟡 Pending.</li>
        <li>Open a card to review <strong>Summary</strong>, <strong>Why</strong>, <strong>Issues</strong>, <strong>Fixes</strong>, and an expert-only <strong>Raw</strong> tab.</li>
        <li>Use the persona voice toggle for localized voice-overs when explaining results to stakeholders.</li>
      </ul>
    ),
  },
  {
    id: 'clarifications',
    title: '3. Answer Clarifying Questions',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Sharingan surfaces an ambiguity score and open questions whenever the input prompt is vague.</li>
        <li>Submit answers in the Clarifications panel — the Overseer forwards everything to Prompt Helper.</li>
        <li>Strictness profiles (Casual, Enterprise, Security) in the header update the thresholds instantly.</li>
      </ul>
    ),
  },
  {
    id: 'plan-approvals',
    title: '4. Follow the Plan & Approvals',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li><strong>Rinnegan</strong> handles plan requirements, peer reviews, and final approval.</li>
        <li><strong>Mangekyō</strong> enforces scaffold → implementation → tests → docs for every coding task.</li>
        <li><strong>Tenseigan</strong> validates evidence; <strong>Byakugan</strong> checks for regressions and inconsistencies.</li>
        <li>Track progress in the visual plan renderer to understand remaining gates and file diffs.</li>
      </ul>
    ),
  },
  {
    id: 'novice-expert',
    title: '5. Novice vs. Expert Mode',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Novice mode hides structured JSON and focuses on plain-language guidance.</li>
        <li>Expert mode surfaces envelopes, tool versions, and raw telemetry for deep dives.</li>
        <li>The toggle is remembered per browser, so operators can choose their preferred experience once.</li>
      </ul>
    ),
  },
  {
    id: 'evidence-lens',
    title: '6. Evidence Lens',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Draft viewer highlights claims: 🟢 supported, 🔴 unsupported.</li>
        <li>Hover to inspect citation URLs and confidence scores.</li>
        <li>Use filters to focus on unsupported claims when triaging documentation debt.</li>
      </ul>
    ),
  },
  {
    id: 'kill-switch',
    title: '7. Kill Switch (Re-validate)',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Trigger Re-validate to re-run evidence and consistency checks on demand.</li>
        <li>Failures display a red overlay with remediation steps; approvals clear blockers instantly.</li>
      </ul>
    ),
  },
  {
    id: 'strictness',
    title: '8. Strictness & Settings',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Use the quick toggles or open the session settings drawer to adjust ambiguity, citation cutoff, consistency tolerance, rollback requirements, and Mangekyō strictness.</li>
        <li>Changes post back to the API immediately, refresh hero metrics, and are logged in the timeline.</li>
      </ul>
    ),
  },
  {
    id: 'duel',
    title: '9. Duel of Agents',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Select two agents (e.g., Claude vs GPT) in the Operations tab.</li>
        <li>Results are validated by the same Eye gates, so you can compare outputs safely.</li>
      </ul>
    ),
  },
  {
    id: 'replay',
    title: '10. Replay & Export',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Use the timeline replay to step through events with animation.</li>
        <li>Export sessions as PDF or interactive HTML packages for audits.</li>
      </ul>
    ),
  },
  {
    id: 'persona-voice',
    title: '11. Persona Voice',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li>Click the speaker icon on any Eye card to play short TTS explanations.</li>
        <li>Support for English and Arabic personas ships out of the box.</li>
        <li>Disable persona decorations from the header if you want a minimalist UI.</li>
      </ul>
    ),
  },
  {
    id: 'faq',
    title: '12. FAQ',
    body: (
      <dl className="space-y-4 text-slate-300">
        <div>
          <dt className="font-semibold text-white">Why was my plan rejected?</dt>
          <dd className="text-sm text-slate-400">Open the relevant Eye, review the Issues tab, and follow the suggested fixes.</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Can I bypass steps?</dt>
          <dd className="text-sm text-slate-400">No. The Overseer enforces every gate in order to protect quality.</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">Why is a claim red?</dt>
          <dd className="text-sm text-slate-400">It lacks a citation or the confidence score is below the configured cutoff.</dd>
        </div>
        <div>
          <dt className="font-semibold text-white">How do I change strictness?</dt>
          <dd className="text-sm text-slate-400">Use a preset profile or adjust session settings directly in the header.</dd>
        </div>
      </dl>
    ),
  },
  {
    id: 'troubleshooting',
    title: '13. Troubleshooting',
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-300">
        <li><strong>WebSocket disconnected</strong> — the portal retries automatically. If the badge keeps flashing red, check your network or rotate the API key.</li>
        <li><strong>Permission denied</strong> — confirm the key role or ask an admin for access.</li>
        <li><strong>Export failed</strong> — large sessions export in chunks; retry once or contact support.</li>
        <li><strong>Wrong session selected</strong> — toggle auto-follow off or pick the correct session from the roster sourced via <code className="rounded bg-brand-paper px-1">/sessions</code>.</li>
      </ul>
    ),
  },
  {
    id: 'support',
    title: '14. Support',
    body: (
      <p className="text-slate-300">
        Need help? Share the session ID from the footer with your administrator or open an ops ticket. Include screenshots of the relevant Eye cards so the team can respond quickly.
      </p>
    ),
  },
];

function UserGuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-10 text-sm text-slate-200">
      <header className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">User Guide</p>
        <h1 className="text-3xl font-semibold text-white">Onboarding &amp; Truth Monitor Playbook</h1>
        <p className="max-w-2xl text-sm text-slate-400">
          A concise, production-ready reference for operating the Third Eye Overseer portal. Every section below mirrors real workflows: session intake, Eye gate reviews, evidence handling, duels, and operator safety rails.
        </p>
      </header>

      <div className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-2xl border border-brand-outline/40 bg-brand-paper/80 px-6 py-8 shadow-glass"
          >
            <header className="space-y-1">
              <h2 className="text-xl font-semibold text-white">{section.title}</h2>
              {section.lead ? <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{section.lead}</p> : null}
            </header>
            <div className="mt-4 space-y-3 text-sm">{section.body}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default UserGuidePage;
