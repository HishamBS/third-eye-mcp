import { useState, useEffect } from 'react';

interface StrictnessProfile {
  id: string;
  name: string;
  description?: string;
  ambiguityThreshold: number;
  citationCutoff: number;
  consistencyTolerance: number;
  mangekyoStrictness: 'lenient' | 'standard' | 'strict';
  isBuiltIn: boolean;
}

export interface StrictnessProfileSelectorProps {
  onProfileSelect?: (profile: StrictnessProfile) => void;
  currentProfile?: StrictnessProfile | null;
}

const BUILT_IN_PROFILES: Partial<StrictnessProfile>[] = [
  {
    name: 'Casual',
    description: 'Relaxed validation for rapid prototyping',
    ambiguityThreshold: 50,
    citationCutoff: 50,
    consistencyTolerance: 60,
    mangekyoStrictness: 'lenient',
    isBuiltIn: true,
  },
  {
    name: 'Enterprise',
    description: 'Balanced validation for production code',
    ambiguityThreshold: 30,
    citationCutoff: 70,
    consistencyTolerance: 80,
    mangekyoStrictness: 'standard',
    isBuiltIn: true,
  },
  {
    name: 'Security',
    description: 'Maximum validation for critical systems',
    ambiguityThreshold: 10,
    citationCutoff: 95,
    consistencyTolerance: 95,
    mangekyoStrictness: 'strict',
    isBuiltIn: true,
  },
];

export function StrictnessProfileSelector({
  onProfileSelect,
  currentProfile,
}: StrictnessProfileSelectorProps) {
  const [selected, setSelected] = useState<string | null>(currentProfile?.name || null);
  const [customProfiles, setCustomProfiles] = useState<StrictnessProfile[]>([]);

  useEffect(() => {
    // Load custom profiles from API
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
    fetch(`${API_URL}/api/strictness`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profiles) {
          setCustomProfiles(data.profiles.filter((p: StrictnessProfile) => !p.isBuiltIn));
        }
      })
      .catch(console.error);
  }, []);

  const handleProfileClick = async (profile: Partial<StrictnessProfile>) => {
    setSelected(profile.name!);

    // If it's a built-in profile, we already have all the data
    if (profile.isBuiltIn && onProfileSelect) {
      onProfileSelect(profile as StrictnessProfile);
    } else {
      // Fetch full profile data from API
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';
        const res = await fetch(`${API_URL}/api/strictness/${profile.id}`);
        const data = await res.json();
        if (onProfileSelect) {
          onProfileSelect(data.profile);
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      }
    }
  };

  const getProfileIcon = (name: string) => {
    switch (name) {
      case 'Casual': return '🎯';
      case 'Enterprise': return '🏢';
      case 'Security': return '🔒';
      default: return '⚙️';
    }
  };

  const getProfileColor = (name: string) => {
    switch (name) {
      case 'Casual': return 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20';
      case 'Enterprise': return 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20';
      case 'Security': return 'border-rose-500/40 bg-rose-500/10 hover:bg-rose-500/20';
      default: return 'border-slate-500/40 bg-slate-500/10 hover:bg-slate-500/20';
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Validation Strictness</p>
        <h3 className="text-lg font-semibold text-white">Select Profile</h3>
      </header>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-slate-400 mb-2">Built-in Profiles</p>
          <div className="grid gap-2 md:grid-cols-3">
            {BUILT_IN_PROFILES.map((profile) => (
              <button
                key={profile.name}
                onClick={() => handleProfileClick(profile)}
                className={`
                  p-3 rounded-lg border-2 transition text-left
                  ${selected === profile.name ? 'ring-2 ring-brand-accent' : ''}
                  ${getProfileColor(profile.name!)}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{getProfileIcon(profile.name!)}</span>
                  <span className="font-semibold text-white">{profile.name}</span>
                </div>
                <p className="text-xs text-slate-300">{profile.description}</p>
                <div className="mt-2 flex gap-2 text-[10px] text-slate-400">
                  <span>Amb: {profile.ambiguityThreshold}</span>
                  <span>•</span>
                  <span>Cite: {profile.citationCutoff}</span>
                  <span>•</span>
                  <span>{profile.mangekyoStrictness}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {customProfiles.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-2">Custom Profiles</p>
            <div className="grid gap-2 md:grid-cols-3">
              {customProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleProfileClick(profile)}
                  className={`
                    p-3 rounded-lg border-2 transition text-left
                    ${selected === profile.name ? 'ring-2 ring-brand-accent' : ''}
                    ${getProfileColor(profile.name)}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{getProfileIcon(profile.name)}</span>
                    <span className="font-semibold text-white">{profile.name}</span>
                  </div>
                  {profile.description && (
                    <p className="text-xs text-slate-300">{profile.description}</p>
                  )}
                  <div className="mt-2 flex gap-2 text-[10px] text-slate-400">
                    <span>Amb: {profile.ambiguityThreshold}</span>
                    <span>•</span>
                    <span>Cite: {profile.citationCutoff}</span>
                    <span>•</span>
                    <span>{profile.mangekyoStrictness}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {selected && currentProfile && (
          <div className="rounded-lg border border-brand-accent/40 bg-brand-accent/10 p-3">
            <p className="text-xs text-brand-accent font-semibold mb-2">Active Profile: {selected}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400">Ambiguity Threshold:</span>
                <span className="ml-2 text-white">{currentProfile.ambiguityThreshold}</span>
              </div>
              <div>
                <span className="text-slate-400">Citation Cutoff:</span>
                <span className="ml-2 text-white">{currentProfile.citationCutoff}</span>
              </div>
              <div>
                <span className="text-slate-400">Consistency:</span>
                <span className="ml-2 text-white">{currentProfile.consistencyTolerance}</span>
              </div>
              <div>
                <span className="text-slate-400">Mangekyō:</span>
                <span className="ml-2 text-white capitalize">{currentProfile.mangekyoStrictness}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default StrictnessProfileSelector;
