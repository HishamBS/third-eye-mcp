'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

interface Persona {
  id: string;
  eyeId: string;
  name: string;
  description: string;
  version: string;
  capabilities: string[];
  iconPath: string;
  mission: string;
  phases: any;
  envelopeContract: any;
  reminders: readonly string[];
  notes?: string;
}

export default function PersonasPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPersonas();
  }, []);

  const fetchPersonas = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/personas/blueprints');
      if (response.ok) {
        const result = await response.json();
        const personasArray = Array.isArray(result.data) ? result.data : [];
        setPersonas(personasArray as Persona[]);
      }
    } catch (error) {
      console.error('Failed to fetch personas:', error);
      setError('Failed to load personas');
    } finally {
      setLoading(false);
    }
  };


  const getEyeIconPath = (eye: string) => {
    return `/eyes/${eye}.svg`;
  };

  const getEyeIconPath = (eye: string) => {
    return `/eyes/${eye}.svg`;
  };

  const getEyeColor = (eye: string) => {
    // All cards use the same Byakugan color scheme
    return 'border-white/40 bg-white/10';
  };

  const toHumanReadable = (text: string) => {
    return text
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

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
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">Personas</p>
                <h1 className="mt-1 text-2xl font-semibold text-white">Eye Personas</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400">
            {error}
          </div>
        </div>
      )}

      {/* Eye Cards Grid */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <p className="text-slate-400">Loading personas...</p>
          </div>
        ) : personas.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <p className="text-slate-400">No personas found</p>
              <button
                onClick={fetchPersonas}
                className="mt-4 rounded-full bg-brand-accent px-6 py-2 text-sm font-semibold text-brand-ink transition hover:bg-brand-primary"
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {personas.map((persona, index) => {
            const eye = persona.id;
            const isSelected = selectedPersona === eye;

                return (
                  <motion.div
                    key={eye}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedPersona(isSelected ? null : eye)}
                className={`rounded-2xl border-2 transition-all ${getEyeColor(eye)} ${
                  isSelected ? 'ring-4 ring-brand-accent' : ''
                } hover:scale-105 cursor-pointer`}
              >
                <div className="p-6 text-white">
                  {/* SVG Icon */}
                  <div className="mb-4 flex justify-center">
                    <img 
                      src={getEyeIconPath(eye)} 
                      alt={`${persona.name} icon`}
                      className="h-16 w-16"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
          </div>

                  {/* Title */}
                  <h3 className="mb-2 text-center text-xl font-bold">
                    {persona.name}
                  </h3>
                  
                  {/* Version Tag */}
                  <div className="mb-3 flex justify-center">
                    <span className="rounded-full bg-brand-paper/50 px-3 py-1 text-xs text-slate-300">
                      v{persona.version} built-in
                    </span>
                  </div>

                  {/* Description */}
                  <p className="mb-4 min-h-[3em] text-center text-sm text-slate-400">
                    {persona.description}
                  </p>
                  
                  {/* Capabilities Pills */}
                  {persona.capabilities && persona.capabilities.length > 0 && (
                    <div className="mb-4 flex flex-wrap justify-center gap-2">
                      {persona.capabilities.map((cap, idx) => (
                        <span 
                          key={idx} 
                          className="rounded-full bg-brand-accent/20 px-2 py-1 text-xs text-brand-accent"
                        >
                          {toHumanReadable(cap)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
}
