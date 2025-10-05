import { useEffect, useMemo, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { useAdminStore } from '../store/adminStore';
import type { PersonaPromptVersion } from '../types/admin';

export interface PersonasPageProps {
  apiKey: string;
  disabled?: boolean;
}

function formatTimestamp(value?: number | null): string {
  if (!value) return '—';
  try {
    return new Date(value * 1000).toLocaleString();
  } catch (error) {
    return new Date(value * 1000).toISOString();
  }
}

export function PersonasPage({ apiKey, disabled = false }: PersonasPageProps) {
  const {
    personas,
    loadingPersonas,
    fetchPersonas,
    stagePersonaPrompt,
    publishPersonaPrompt,
    error,
  } = useAdminStore();

  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [draftContent, setDraftContent] = useState('');
  const [draftVersion, setDraftVersion] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || disabled) return;
    fetchPersonas(apiKey).catch(() => {});
  }, [apiKey, disabled, fetchPersonas]);

  useEffect(() => {
    if (!personas || !personas.length) {
      setSelectedPersona('');
      return;
    }
    if (!selectedPersona) {
      setSelectedPersona(personas[0].persona);
      return;
    }
    const match = personas.find((item) => item.persona === selectedPersona);
    if (!match) {
      setSelectedPersona(personas[0].persona);
    }
  }, [personas, selectedPersona]);

  const current = useMemo(() => personas?.find((item) => item.persona === selectedPersona) ?? null, [personas, selectedPersona]);

  useEffect(() => {
    if (!current) {
      setDraftContent('');
      setDraftVersion('');
      setDraftNotes('');
      return;
    }
    setDraftContent(current.active?.content_md ?? '');
    setDraftVersion('');
    setDraftNotes('');
  }, [current?.persona]);

  const stagedVersions = useMemo(() => current?.versions.filter((item) => item.staged) ?? [], [current]);

  const handleStage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!apiKey || !current || disabled) return;
    if (!draftContent.trim()) {
      setFeedback('Provide prompt content before staging.');
      return;
    }
    try {
      setFeedback(null);
      await stagePersonaPrompt(apiKey, current.persona, {
        content_md: draftContent,
        version: draftVersion || undefined,
        notes: draftNotes || undefined,
      });
      setDraftNotes('');
      setFeedback('Prompt staged successfully.');
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to stage prompt.');
    }
  };

  const handlePublish = async (version: PersonaPromptVersion) => {
    if (!apiKey || !current || disabled) return;
    try {
      setFeedback(null);
      await publishPersonaPrompt(apiKey, current.persona, version.id, { notes: draftNotes || undefined });
      setDraftNotes('');
      setFeedback(`Published version ${version.version}.`);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Failed to publish prompt.');
    }
  };

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-accent-primary">Personas</p>
        <h1 className="text-3xl font-semibold text-white">Persona Prompt Library</h1>
        <p className="text-sm text-slate-300">Stage and publish prompt updates for each Overseer eye with audit visibility and rollback history.</p>
      </header>

      {error && <p className="rounded-xl border border-accent-danger/40 bg-accent-danger/10 p-3 text-sm text-accent-danger">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[240px,1fr]">
        <aside className="space-y-2">
          <h2 className="text-sm font-semibold text-white">Personas</h2>
          <div className="space-y-2">
            {personas?.map((persona) => {
              const activeVersion = persona.active?.version ?? '—';
              return (
                <button
                  key={persona.persona}
                  type="button"
                  onClick={() => setSelectedPersona(persona.persona)}
                  className={clsx(
                    'w-full rounded-xl border px-3 py-2 text-left text-sm transition',
                    selectedPersona === persona.persona
                      ? 'border-accent-primary bg-accent-primary/10 text-white'
                      : 'border-surface-outline/60 bg-surface-base text-slate-300 hover:border-accent-primary/60',
                  )}
                >
                  <span className="block font-semibold text-white">{persona.label}</span>
                  <span className="text-xs text-slate-400">Active v{activeVersion}</span>
                </button>
              );
            })}
            {loadingPersonas && (!personas || personas.length === 0) && <div className="h-10 animate-pulse rounded-xl border border-surface-outline/60 bg-surface-raised/70" />}
          </div>
        </aside>

        <div className="space-y-6">
          {(!current || loadingPersonas) && (
            <div className="space-y-3">
              <div className="h-12 animate-pulse rounded-xl border border-surface-outline/60 bg-surface-raised/70" />
              <div className="h-64 animate-pulse rounded-xl border border-surface-outline/60 bg-surface-raised/70" />
            </div>
          )}

          {current && (
            <>
              <section className="space-y-3 rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-5">
                <header className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Active Prompt</h2>
                    <p className="text-xs text-slate-400">Version {current.active?.version ?? '—'} · Checksum {current.active?.checksum ?? '—'}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    <p>Created by {current.active?.created_by ?? '—'}</p>
                    <p>Approved {formatTimestamp(current.active?.approved_at)}</p>
                  </div>
                </header>
                <pre className="max-h-72 overflow-auto rounded-xl border border-surface-outline/50 bg-surface-base/80 p-4 text-xs text-slate-200">
                  {current.active?.content_md ?? 'No active prompt yet.'}
                </pre>
              </section>

              <form className="space-y-4 rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-5" onSubmit={handleStage}>
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-white">Stage new version</h2>
                  <div className="text-xs text-slate-400">Staged versions: {stagedVersions.length}</div>
                </header>
                <label className="block text-xs uppercase tracking-[0.2em] text-slate-400">
                  Prompt content
                  <textarea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    rows={16}
                    className="mt-2 w-full rounded-xl border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                    placeholder="Write the persona prompt in Markdown"
                    disabled={disabled}
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Version label (optional)
                    <input
                      value={draftVersion}
                      onChange={(event) => setDraftVersion(event.target.value)}
                      className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                      placeholder="20240401"
                      disabled={disabled}
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-slate-400">
                    Notes (optional)
                    <input
                      value={draftNotes}
                      onChange={(event) => setDraftNotes(event.target.value)}
                      className="rounded-lg border border-surface-outline/50 bg-surface-base px-3 py-2 text-sm text-slate-100 focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/40"
                      placeholder="Why this change?"
                      disabled={disabled}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={disabled || loadingPersonas}
                  className="inline-flex items-center rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-surface-base transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingPersonas ? 'Staging…' : 'Stage prompt'}
                </button>
              </form>

              <section className="space-y-3 rounded-2xl border border-surface-outline/60 bg-surface-raised/70 p-5 text-sm text-slate-200">
                <header className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Version history</h2>
                  <span className="text-xs text-slate-400">Showing latest {current.versions.length}</span>
                </header>
                <div className="overflow-hidden rounded-xl border border-surface-outline/50">
                  <table className="min-w-full divide-y divide-surface-outline/60 text-sm">
                    <thead className="bg-surface-base/80 text-xs uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Version</th>
                        <th className="px-4 py-3 text-left">Status</th>
                        <th className="px-4 py-3 text-left">Created</th>
                        <th className="px-4 py-3 text-left">Approved</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-outline/60">
                      {current.versions.map((version) => (
                        <tr key={version.id} className="text-slate-200">
                          <td className="px-4 py-3 font-mono text-xs">{version.version}</td>
                          <td className="px-4 py-3 text-xs">
                            {version.active && <span className="mr-2 rounded-full border border-emerald-400/60 px-2 py-0.5 text-emerald-300">Active</span>}
                            {version.staged && <span className="rounded-full border border-amber-400/60 px-2 py-0.5 text-amber-300">Staged</span>}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-400">{formatTimestamp(version.created_at)}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{formatTimestamp(version.approved_at)}</td>
                          <td className="px-4 py-3 text-right">
                            {version.staged ? (
                              <button
                                type="button"
                                onClick={() => handlePublish(version)}
                                disabled={disabled || loadingPersonas}
                                className="rounded-full border border-accent-primary px-3 py-1 text-xs text-accent-primary transition hover:bg-accent-primary/10 disabled:opacity-50"
                              >
                                {loadingPersonas ? 'Publishing…' : 'Publish'}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {feedback && <p className="text-xs text-slate-400">{feedback}</p>}
    </section>
  );
}

export default PersonasPage;
