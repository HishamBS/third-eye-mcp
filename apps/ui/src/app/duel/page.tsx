'use client';

import { useState } from 'react';
import { DuelMode } from '@/components/DuelMode';
import { nanoid } from 'nanoid';

export default function DuelPage() {
  const [sessionId] = useState(() => `duel-${nanoid()}`);
  const [prompt, setPrompt] = useState('');
  const [showDuel, setShowDuel] = useState(false);

  const handleStartDuel = () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    setShowDuel(true);
  };

  const handleReset = () => {
    setPrompt('');
    setShowDuel(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-ink via-brand-paper to-brand-ink p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-brand-foreground">Duel Mode</h1>
          <p className="mt-2 text-lg text-brand-outline">
            Compare multiple AI models side-by-side with the same prompt
          </p>
        </div>

        {!showDuel ? (
          <div className="rounded-2xl border border-brand-outline/40 bg-brand-paper/50 p-8">
            <div className="mb-6">
              <label htmlFor="prompt" className="mb-2 block text-sm font-semibold text-brand-outline">
                Enter Your Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter a prompt to test across multiple models..."
                className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/60 px-4 py-3 text-brand-foreground placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
                rows={6}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-brand-outline">
                <p>Tips:</p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>Compare 2-4 models at once</li>
                  <li>Results are ranked by performance score</li>
                  <li>Each model runs independently</li>
                </ul>
              </div>

              <button
                onClick={handleStartDuel}
                disabled={!prompt.trim()}
                className={`rounded-lg px-6 py-3 font-semibold transition ${
                  prompt.trim()
                    ? 'bg-brand-accent text-brand-foreground hover:bg-brand-accent/90'
                    : 'cursor-not-allowed bg-gray-600 text-brand-outline'
                }`}
              >
                Configure Duel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg border border-brand-outline/40 bg-brand-paper/50 p-4 flex-1 mr-4">
                <p className="text-xs font-semibold uppercase text-brand-outline">Prompt</p>
                <p className="mt-1 text-sm text-brand-outline">{prompt}</p>
              </div>
              <button
                onClick={handleReset}
                className="rounded-lg border border-brand-outline/40 bg-brand-paper/50 px-4 py-2 text-sm font-semibold text-brand-outline hover:bg-brand-ink/60"
              >
                New Duel
              </button>
            </div>

            <DuelMode
              sessionId={sessionId}
              prompt={prompt}
              onComplete={(results) => {
                console.log('Duel completed:', results);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
