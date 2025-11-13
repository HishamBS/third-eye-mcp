import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/consts/api";
import {
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

interface StrictnessProfile {
  id: string;
  name: string;
  description?: string;
  ambiguityThreshold: number;
  citationCutoff: number;
  consistencyTolerance: number;
  mangekyoStrictness: "lenient" | "standard" | "strict";
  isBuiltIn: boolean;
}

export interface StrictnessProfileSelectorProps {
  onProfileSelect?: (profile: StrictnessProfile) => void;
  currentProfile?: StrictnessProfile | null;
}

const BUILT_IN_PROFILES: Partial<StrictnessProfile>[] = [
  {
    name: "Casual",
    description: "Relaxed validation for rapid prototyping",
    ambiguityThreshold: 50,
    citationCutoff: 50,
    consistencyTolerance: 60,
    mangekyoStrictness: "lenient",
    isBuiltIn: true,
  },
  {
    name: "Enterprise",
    description: "Balanced validation for production code",
    ambiguityThreshold: 30,
    citationCutoff: 70,
    consistencyTolerance: 80,
    mangekyoStrictness: "standard",
    isBuiltIn: true,
  },
  {
    name: "Security",
    description: "Maximum validation for critical systems",
    ambiguityThreshold: 10,
    citationCutoff: 95,
    consistencyTolerance: 95,
    mangekyoStrictness: "strict",
    isBuiltIn: true,
  },
];

export function StrictnessProfileSelector({
  onProfileSelect,
  currentProfile,
}: StrictnessProfileSelectorProps) {
  const [selected, setSelected] = useState<string | null>(
    currentProfile?.name || null,
  );
  const [customProfiles, setCustomProfiles] = useState<StrictnessProfile[]>([]);

  useEffect(() => {
    // Load custom profiles from API
    fetch(`${API_BASE_URL}/api/strictness`)
      .then((res) => res.json())
      .then((data) => {
        if (data.profiles) {
          setCustomProfiles(
            data.profiles.filter((p: StrictnessProfile) => !p.isBuiltIn),
          );
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
        const res = await fetch(`${API_BASE_URL}/api/strictness/${profile.id}`);
        const data = await res.json();
        if (onProfileSelect) {
          onProfileSelect(data.profile);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    }
  };

  const getProfileIcon = (name: string) => {
    switch (name) {
      case "Casual":
        return "🎯";
      case "Enterprise":
        return "🏢";
      case "Security":
        return "🔒";
      default:
        return "⚙️";
    }
  };

  const getProfileColor = (name: string) => {
    switch (name) {
      case "Casual":
        return `${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} hover:bg-semantic-success/20`;
      case "Enterprise":
        return `${STATUS_BORDER_COLORS_SUBTLE.info} ${STATUS_BG_COLORS_SUBTLE.info} hover:bg-semantic-info/20`;
      case "Security":
        return `${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} hover:bg-semantic-error/20`;
      default:
        return `${STATUS_BORDER_COLORS_SUBTLE.idle} ${STATUS_BG_COLORS_SUBTLE.idle} hover:bg-brand-paper-elev/20`;
    }
  };

  return (
    <section className="rounded-2xl border border-brand-outline/40 bg-brand-paperElev/70 p-4 text-sm">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
          Validation Strictness
        </p>
        <h3 className="text-lg font-semibold text-brand-foreground">
          Select Profile
        </h3>
      </header>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-semantic-muted mb-2">Built-in Profiles</p>
          <div className="grid gap-2 md:grid-cols-3">
            {BUILT_IN_PROFILES.map((profile) => (
              <button
                key={profile.name}
                onClick={() => handleProfileClick(profile)}
                className={`
                  p-3 rounded-lg border-2 transition text-left
                  ${selected === profile.name ? "ring-2 ring-brand-accent" : ""}
                  ${getProfileColor(profile.name!)}
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">
                    {getProfileIcon(profile.name!)}
                  </span>
                  <span className="font-semibold text-brand-foreground">
                    {profile.name}
                  </span>
                </div>
                <p className="text-xs text-semantic-muted">
                  {profile.description}
                </p>
                <div className="mt-2 flex gap-2 text-[10px] text-semantic-muted">
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
            <p className="text-xs text-semantic-muted mb-2">Custom Profiles</p>
            <div className="grid gap-2 md:grid-cols-3">
              {customProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleProfileClick(profile)}
                  className={`
                    p-3 rounded-lg border-2 transition text-left
                    ${selected === profile.name ? "ring-2 ring-brand-accent" : ""}
                    ${getProfileColor(profile.name)}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">
                      {getProfileIcon(profile.name)}
                    </span>
                    <span className="font-semibold text-brand-foreground">
                      {profile.name}
                    </span>
                  </div>
                  {profile.description && (
                    <p className="text-xs text-semantic-muted">
                      {profile.description}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2 text-[10px] text-semantic-muted">
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
            <p className="text-xs text-brand-accent font-semibold mb-2">
              Active Profile: {selected}
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-semantic-muted">
                  Ambiguity Threshold:
                </span>
                <span className="ml-2 text-brand-foreground">
                  {currentProfile.ambiguityThreshold}
                </span>
              </div>
              <div>
                <span className="text-semantic-muted">Citation Cutoff:</span>
                <span className="ml-2 text-brand-foreground">
                  {currentProfile.citationCutoff}
                </span>
              </div>
              <div>
                <span className="text-semantic-muted">Consistency:</span>
                <span className="ml-2 text-brand-foreground">
                  {currentProfile.consistencyTolerance}
                </span>
              </div>
              <div>
                <span className="text-semantic-muted">Mangekyō:</span>
                <span className="ml-2 text-brand-foreground capitalize">
                  {currentProfile.mangekyoStrictness}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default StrictnessProfileSelector;
