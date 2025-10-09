'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PlaygroundIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new session ID
    const newSessionId = `playground-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Redirect to the new playground session
    router.push(`/playground/${newSessionId}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-brand-ink flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-6xl">👁️</div>
        <h1 className="text-2xl font-semibold text-white mb-2">Creating Playground Session...</h1>
        <p className="text-slate-400">Redirecting you to the playground</p>
      </div>
    </div>
  );
}
