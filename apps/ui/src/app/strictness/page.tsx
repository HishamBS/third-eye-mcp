'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';

interface StrictnessProfile {
  id: string;
  name: string;
  description: string | null;
  ambiguityThreshold: number;
  citationCutoff: number;
  consistencyTolerance: number;
  mangekyoStrictness: 'lenient' | 'standard' | 'strict';
  isBuiltIn: boolean;
  createdAt: string;
}

export default function StrictnessPage() {
  const dialog = useDialog();
  const [profiles, setProfiles] = useState<StrictnessProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<StrictnessProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ambiguityThreshold: 30,
    citationCutoff: 70,
    consistencyTolerance: 80,
    mangekyoStrictness: 'standard' as 'lenient' | 'standard' | 'strict',
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/strictness');
      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Failed to fetch strictness profiles:', error);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedProfile(null);
    setFormData({
      name: '',
      description: '',
      ambiguityThreshold: 30,
      citationCutoff: 70,
      consistencyTolerance: 80,
      mangekyoStrictness: 'standard',
    });
  };

  const handleEdit = async (profile: StrictnessProfile) => {
    if (profile.isBuiltIn) {
      await dialog.alert('Cannot Edit', 'Built-in profiles cannot be edited');
      return;
    }

    setIsEditing(true);
    setIsCreating(false);
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || '',
      ambiguityThreshold: profile.ambiguityThreshold,
      citationCutoff: profile.citationCutoff,
      consistencyTolerance: profile.consistencyTolerance,
      mangekyoStrictness: profile.mangekyoStrictness,
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
    setSelectedProfile(null);
    setFormData({
      name: '',
      description: '',
      ambiguityThreshold: 30,
      citationCutoff: 70,
      consistencyTolerance: 80,
      mangekyoStrictness: 'standard',
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      await dialog.alert('Validation Error', 'Please provide a profile name');
      return;
    }

    setLoading(true);
    try {
      if (isCreating) {
        const response = await fetch('/api/strictness', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await fetchProfiles();
          handleCancel();
        } else {
          const error = await response.json();
          await dialog.alert('Create Failed', `Failed to create profile: ${error.error || 'Unknown error'}`);
        }
      } else if (isEditing && selectedProfile) {
        const response = await fetch(`/api/strictness/${selectedProfile.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await fetchProfiles();
          handleCancel();
        } else {
          const error = await response.json();
          await dialog.alert('Update Failed', `Failed to update profile: ${error.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      await dialog.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (profile: StrictnessProfile) => {
    if (profile.isBuiltIn) {
      await dialog.alert('Cannot Delete', 'Built-in profiles cannot be deleted');
      return;
    }

    const confirmed = await dialog.confirm(
      'Delete Profile',
      `Are you sure you want to delete the profile "${profile.name}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`/api/strictness/${profile.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProfiles();
        if (selectedProfile?.id === profile.id) {
          setSelectedProfile(null);
        }
      } else {
        const error = await response.json();
        await dialog.alert('Delete Failed', `Failed to delete profile: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to delete profile:', error);
      await dialog.alert('Error', 'Failed to delete profile');
    }
  };

  const getProfileColor = (profile: StrictnessProfile) => {
    if (profile.isBuiltIn) {
      if (profile.name === 'Casual') return 'border-green-500/40 bg-green-500/5';
      if (profile.name === 'Enterprise') return 'border-eye-jogan/40 bg-eye-jogan/5';
      if (profile.name === 'Security') return 'border-brand-primary/40 bg-brand-primary/5';
    }
    return 'border-brand-accent/40 bg-brand-accent/5';
  };

  const getStrictnessLabel = (profile: StrictnessProfile) => {
    const avg = (profile.ambiguityThreshold + profile.citationCutoff + profile.consistencyTolerance) / 3;
    if (avg < 40) return 'Very Strict';
    if (avg < 60) return 'Strict';
    if (avg < 75) return 'Balanced';
    return 'Lenient';
  };

  const builtInProfiles = profiles.filter(p => p.isBuiltIn);
  const customProfiles = profiles.filter(p => !p.isBuiltIn);

  return (
    <div className="min-h-screen bg-brand-ink">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-slate-400 transition-colors hover:text-brand-accent">
                ← Home
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Validation</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Strictness Profiles</h1>
              </div>
            </div>
            <div className="flex gap-4">
              <Link href="/models" className="text-sm text-slate-400 transition-colors hover:text-white">
                Models
              </Link>
              <Link href="/personas" className="text-sm text-slate-400 transition-colors hover:text-white">
                Personas
              </Link>
              <button
                onClick={handleCreate}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                + Create Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-[360px,1fr]">
          {/* Profiles List */}
          <div className="space-y-6">
            {/* Built-in Profiles */}
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Built-in Profiles</h2>
              <div className="space-y-3">
                {builtInProfiles.map((profile, index) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${getProfileColor(profile)} ${
                      selectedProfile?.id === profile.id ? 'ring-2 ring-brand-accent' : ''
                    }`}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="text-white">
                      <h3 className="font-bold">{profile.name}</h3>
                      <p className="mt-1 text-sm opacity-80">{profile.description}</p>
                      <p className="mt-2 text-xs opacity-70">{getStrictnessLabel(profile)}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Custom Profiles */}
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">Custom Profiles</h2>
              <div className="space-y-3">
                {customProfiles.length === 0 ? (
                  <p className="text-sm text-slate-400">No custom profiles yet</p>
                ) : (
                  customProfiles.map((profile, index) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (builtInProfiles.length + index) * 0.05 }}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${getProfileColor(profile)} ${
                        selectedProfile?.id === profile.id ? 'ring-2 ring-brand-accent' : ''
                      }`}
                      onClick={() => setSelectedProfile(profile)}
                    >
                      <div className="text-white">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold">{profile.name}</h3>
                            <p className="mt-1 text-sm opacity-80">{profile.description || 'No description'}</p>
                            <p className="mt-2 text-xs opacity-70">{getStrictnessLabel(profile)}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(profile);
                            }}
                            className="ml-2 rounded-full bg-white/20 px-3 py-1 text-sm transition-colors hover:bg-white/30"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div>
            {isCreating || isEditing ? (
              /* Profile Editor */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">
                    {isCreating ? 'Create New Profile' : `Edit ${formData.name}`}
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Name <span className="text-brand-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      placeholder="My Custom Profile"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-300">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="h-24 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      placeholder="Describe when to use this profile..."
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Ambiguity Threshold
                        <span className="ml-2 text-sm text-slate-400">({formData.ambiguityThreshold}%)</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.ambiguityThreshold}
                        onChange={(e) => setFormData({ ...formData, ambiguityThreshold: parseInt(e.target.value) })}
                        className="w-full accent-brand-accent"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Lower = more questions asked by Sharingan
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Citation Cutoff
                        <span className="ml-2 text-sm text-slate-400">({formData.citationCutoff}%)</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.citationCutoff}
                        onChange={(e) => setFormData({ ...formData, citationCutoff: parseInt(e.target.value) })}
                        className="w-full accent-brand-accent"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Higher = requires more citations (Tenseigan)
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Consistency Tolerance
                        <span className="ml-2 text-sm text-slate-400">({formData.consistencyTolerance}%)</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.consistencyTolerance}
                        onChange={(e) => setFormData({ ...formData, consistencyTolerance: parseInt(e.target.value) })}
                        className="w-full accent-brand-accent"
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        Higher = more tolerant of inconsistencies (Byakugan)
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Mangekyo Strictness
                      </label>
                      <select
                        value={formData.mangekyoStrictness}
                        onChange={(e) => setFormData({ ...formData, mangekyoStrictness: e.target.value as any })}
                        className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-white focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      >
                        <option value="lenient">Lenient</option>
                        <option value="standard">Standard</option>
                        <option value="strict">Strict</option>
                      </select>
                      <p className="mt-1 text-xs text-slate-400">
                        Code review strictness level
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
                    <h4 className="font-medium text-yellow-300">Profile Guidelines</h4>
                    <ul className="mt-3 space-y-1 text-sm text-yellow-100">
                      <li>• Casual: Relaxed validation for prototyping (50/50/60)</li>
                      <li>• Enterprise: Balanced for production (30/70/80)</li>
                      <li>• Security: Maximum validation for critical systems (10/90/95)</li>
                      <li>• Custom: Tailor thresholds to your needs</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            ) : selectedProfile ? (
              /* Profile Details */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedProfile.name}</h2>
                    <p className="mt-1 text-slate-400">{selectedProfile.description || 'No description'}</p>
                    <div className="mt-2 flex items-center gap-4">
                      <span className={`rounded-full px-3 py-1 text-sm ${
                        selectedProfile.isBuiltIn
                          ? 'bg-eye-jogan/20 text-eye-jogan'
                          : 'bg-brand-accent/20 text-brand-accent'
                      }`}>
                        {selectedProfile.isBuiltIn ? 'Built-in' : 'Custom'}
                      </span>
                      <span className="text-sm text-slate-400">{getStrictnessLabel(selectedProfile)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!selectedProfile.isBuiltIn && (
                      <>
                        <button
                          onClick={() => handleEdit(selectedProfile)}
                          className="rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedProfile)}
                          className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-white">Ambiguity Threshold</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-brand-accent">{selectedProfile.ambiguityThreshold}</span>
                      <span className="mb-1 text-xl text-slate-400">%</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Controls how many clarification questions Sharingan asks
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-white">Citation Cutoff</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-eye-jogan">{selectedProfile.citationCutoff}</span>
                      <span className="mb-1 text-xl text-slate-400">%</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Minimum score for Tenseigan evidence validation
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-white">Consistency Tolerance</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-green-400">{selectedProfile.consistencyTolerance}</span>
                      <span className="mb-1 text-xl text-slate-400">%</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      How much inconsistency Byakugan tolerates
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-white">Mangekyo Strictness</h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold capitalize text-brand-primary">{selectedProfile.mangekyoStrictness}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      Code review validation level
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-xl border border-yellow-700/50 bg-yellow-900/10 p-5">
                  <h4 className="font-medium text-yellow-300">Applied To</h4>
                  <p className="mt-2 text-sm text-yellow-100">
                    This profile affects: Sharingan (ambiguity), Tenseigan (citations),
                    Byakugan (consistency), Mangekyo (code review), Rinnegan (planning)
                  </p>
                </div>
              </GlassCard>
            ) : (
              /* Welcome Screen */
              <GlassCard className="p-12 text-center">
                <h2 className="mb-4 text-2xl font-semibold text-white">Strictness Configuration</h2>
                <p className="mb-6 text-lg text-slate-400">
                  Select a profile from the left to view details or create a custom profile
                </p>
                <div className="space-y-2 text-sm text-slate-500">
                  <p>• Control validation thresholds across all Eyes</p>
                  <p>• Built-in profiles: Casual, Enterprise, Security</p>
                  <p>• Create custom profiles for specific workflows</p>
                  <p>• Fine-tune ambiguity, citations, and consistency checks</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
