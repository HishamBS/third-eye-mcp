"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { useDialog } from "@/hooks/useDialog";
import { UI_HELP_TEXT } from "@third-eye/constants";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
  STATUS_BG_COLORS,
} from "@/constants/color-mappings";
import { API_BASE_URL } from "@/consts/api";

interface StrictnessProfile {
  id: string;
  name: string;
  description: string | null;
  ambiguityThreshold: number;
  citationCutoff: number;
  consistencyTolerance: number;
  mangekyoStrictness: "lenient" | "standard" | "strict";
  isBuiltIn: boolean;
  createdAt: string;
}

export default function StrictnessPage() {
  const dialog = useDialog();
  const [profiles, setProfiles] = useState<StrictnessProfile[]>([]);
  const [selectedProfile, setSelectedProfile] =
    useState<StrictnessProfile | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    ambiguityThreshold: 30,
    citationCutoff: 70,
    consistencyTolerance: 80,
    mangekyoStrictness: "standard" as "lenient" | "standard" | "strict",
  });

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/strictness`);
      if (response.ok) {
        const data = await response.json();
        setProfiles(data.data || data || []);
      }
    } catch (error) {
      console.error("Failed to fetch strictness profiles:", error);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    setIsEditing(false);
    setSelectedProfile(null);
    setFormData({
      name: "",
      description: "",
      ambiguityThreshold: 30,
      citationCutoff: 70,
      consistencyTolerance: 80,
      mangekyoStrictness: "standard",
    });
  };

  const handleEdit = async (profile: StrictnessProfile) => {
    if (profile.isBuiltIn) {
      await dialog.alert(
        UI_HELP_TEXT.STRICTNESS_DIALOG_CANNOT_EDIT_TITLE,
        UI_HELP_TEXT.STRICTNESS_DIALOG_CANNOT_EDIT_MESSAGE,
      );
      return;
    }

    setIsEditing(true);
    setIsCreating(false);
    setSelectedProfile(profile);
    setFormData({
      name: profile.name,
      description: profile.description || "",
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
      name: "",
      description: "",
      ambiguityThreshold: 30,
      citationCutoff: 70,
      consistencyTolerance: 80,
      mangekyoStrictness: "standard",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      await dialog.alert(
        UI_HELP_TEXT.STRICTNESS_DIALOG_VALIDATION_TITLE,
        UI_HELP_TEXT.STRICTNESS_DIALOG_VALIDATION_MESSAGE,
      );
      return;
    }

    setLoading(true);
    try {
      if (isCreating) {
        const response = await fetch(`${API_BASE_URL}/api/strictness`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        if (response.ok) {
          await fetchProfiles();
          handleCancel();
        } else {
          const error = await response.json();
          await dialog.alert(
            UI_HELP_TEXT.STRICTNESS_DIALOG_CREATE_FAILED_TITLE,
            UI_HELP_TEXT.STRICTNESS_DIALOG_CREATE_FAILED_MESSAGE.replace(
              "{error}",
              error.error || UI_HELP_TEXT.STRICTNESS_ERROR_UNKNOWN,
            ),
          );
        }
      } else if (isEditing && selectedProfile) {
        const response = await fetch(
          `${API_BASE_URL}/api/strictness/${selectedProfile.id}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(formData),
          },
        );

        if (response.ok) {
          await fetchProfiles();
          handleCancel();
        } else {
          const error = await response.json();
          await dialog.alert(
            UI_HELP_TEXT.STRICTNESS_DIALOG_UPDATE_FAILED_TITLE,
            UI_HELP_TEXT.STRICTNESS_DIALOG_UPDATE_FAILED_MESSAGE.replace(
              "{error}",
              error.error || UI_HELP_TEXT.STRICTNESS_ERROR_UNKNOWN,
            ),
          );
        }
      }
    } catch (error) {
      console.error("Failed to save profile:", error);
      await dialog.alert(
        UI_HELP_TEXT.STRICTNESS_DIALOG_ERROR_TITLE,
        UI_HELP_TEXT.STRICTNESS_DIALOG_ERROR_SAVE,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (profile: StrictnessProfile) => {
    if (profile.isBuiltIn) {
      await dialog.alert(
        UI_HELP_TEXT.STRICTNESS_DIALOG_CANNOT_DELETE_TITLE,
        UI_HELP_TEXT.STRICTNESS_DIALOG_CANNOT_DELETE_MESSAGE,
      );
      return;
    }

    const confirmed = await dialog.confirm(
      UI_HELP_TEXT.STRICTNESS_DIALOG_DELETE_TITLE,
      UI_HELP_TEXT.STRICTNESS_DIALOG_DELETE_MESSAGE.replace(
        "{name}",
        profile.name,
      ),
      UI_HELP_TEXT.STRICTNESS_DIALOG_DELETE_CONFIRM,
      UI_HELP_TEXT.STRICTNESS_DIALOG_DELETE_CANCEL,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/strictness/${profile.id}`,
        {
          method: "DELETE",
        },
      );

      if (response.ok) {
        await fetchProfiles();
        if (selectedProfile?.id === profile.id) {
          setSelectedProfile(null);
        }
      } else {
        const error = await response.json();
        await dialog.alert(
          UI_HELP_TEXT.STRICTNESS_DIALOG_DELETE_FAILED_TITLE,
          UI_HELP_TEXT.STRICTNESS_DIALOG_DELETE_FAILED_MESSAGE.replace(
            "{error}",
            error.error || UI_HELP_TEXT.STRICTNESS_ERROR_UNKNOWN,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to delete profile:", error);
      await dialog.alert(
        UI_HELP_TEXT.STRICTNESS_DIALOG_ERROR_TITLE,
        UI_HELP_TEXT.STRICTNESS_DIALOG_ERROR_DELETE,
      );
    }
  };

  const getProfileColor = (profile: StrictnessProfile) => {
    if (profile.isBuiltIn) {
      if (profile.name === "Casual")
        return `${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success}`;
      if (profile.name === "Enterprise")
        return "border-eye-jogan/40 bg-eye-jogan/5";
      if (profile.name === "Security")
        return "border-brand-primary/40 bg-brand-primary/5";
    }
    return "border-brand-accent/40 bg-brand-accent/5";
  };

  const getStrictnessLabel = (profile: StrictnessProfile) => {
    const avg =
      (profile.ambiguityThreshold +
        profile.citationCutoff +
        profile.consistencyTolerance) /
      3;
    if (avg < 40) return UI_HELP_TEXT.STRICTNESS_LABEL_VERY_STRICT;
    if (avg < 60) return UI_HELP_TEXT.STRICTNESS_LABEL_STRICT;
    if (avg < 75) return UI_HELP_TEXT.STRICTNESS_LABEL_BALANCED;
    return UI_HELP_TEXT.STRICTNESS_LABEL_LENIENT;
  };

  const builtInProfiles = profiles.filter((p) => p.isBuiltIn);
  const customProfiles = profiles.filter((p) => !p.isBuiltIn);

  return (
    <div className="min-h-screen bg-brand-paper">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="text-semantic-muted transition-colors hover:text-brand-accent"
              >
                {UI_HELP_TEXT.STRICTNESS_NAV_HOME}
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-brand-accent">
                  {UI_HELP_TEXT.STRICTNESS_SECTION_LABEL}
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-brand-foreground">
                  {UI_HELP_TEXT.STRICTNESS_HEADER_TITLE}
                </h1>
              </div>
            </div>
            <div className="flex gap-4">
              <Link
                href="/models"
                className="text-sm text-semantic-muted transition-colors hover:text-brand-foreground"
              >
                {UI_HELP_TEXT.STRICTNESS_NAV_MODELS}
              </Link>
              <Link
                href="/personas"
                className="text-sm text-semantic-muted transition-colors hover:text-brand-foreground"
              >
                {UI_HELP_TEXT.STRICTNESS_NAV_PERSONAS}
              </Link>
              <button
                onClick={handleCreate}
                className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent/50"
              >
                {UI_HELP_TEXT.STRICTNESS_BUTTON_CREATE}
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
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                {UI_HELP_TEXT.STRICTNESS_SECTION_BUILTIN}
              </h2>
              <div className="space-y-3">
                {builtInProfiles.map((profile, index) => (
                  <motion.div
                    key={profile.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all ${getProfileColor(profile)} ${
                      selectedProfile?.id === profile.id
                        ? "ring-2 ring-brand-accent"
                        : ""
                    }`}
                    onClick={() => setSelectedProfile(profile)}
                  >
                    <div className="text-brand-foreground">
                      <h3 className="font-bold">{profile.name}</h3>
                      <p className="mt-1 text-sm opacity-80">
                        {profile.description}
                      </p>
                      <p className="mt-2 text-xs opacity-70">
                        {getStrictnessLabel(profile)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Custom Profiles */}
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-brand-accent">
                {UI_HELP_TEXT.STRICTNESS_SECTION_CUSTOM}
              </h2>
              <div className="space-y-3">
                {customProfiles.length === 0 ? (
                  <p className="text-sm text-semantic-muted">
                    {UI_HELP_TEXT.STRICTNESS_EMPTY_CUSTOM}
                  </p>
                ) : (
                  customProfiles.map((profile, index) => (
                    <motion.div
                      key={profile.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: (builtInProfiles.length + index) * 0.05,
                      }}
                      className={`cursor-pointer rounded-2xl border p-4 transition-all ${getProfileColor(profile)} ${
                        selectedProfile?.id === profile.id
                          ? "ring-2 ring-brand-accent"
                          : ""
                      }`}
                      onClick={() => setSelectedProfile(profile)}
                    >
                      <div className="text-brand-foreground">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold">{profile.name}</h3>
                            <p className="mt-1 text-sm opacity-80">
                              {profile.description ||
                                UI_HELP_TEXT.STRICTNESS_NO_DESCRIPTION}
                            </p>
                            <p className="mt-2 text-xs opacity-70">
                              {getStrictnessLabel(profile)}
                            </p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(profile);
                            }}
                            className="ml-2 rounded-full bg-white/20 px-3 py-1 text-sm transition-colors hover:bg-white/30"
                          >
                            {UI_HELP_TEXT.STRICTNESS_BUTTON_EDIT}
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
                  <h2 className="text-xl font-semibold text-brand-foreground">
                    {isCreating
                      ? UI_HELP_TEXT.STRICTNESS_TITLE_CREATE
                      : UI_HELP_TEXT.STRICTNESS_TITLE_EDIT.replace(
                          "{name}",
                          formData.name,
                        )}
                  </h2>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCancel}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      {UI_HELP_TEXT.STRICTNESS_BUTTON_CANCEL}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary disabled:opacity-50"
                    >
                      {loading
                        ? UI_HELP_TEXT.STRICTNESS_BUTTON_SAVING
                        : UI_HELP_TEXT.STRICTNESS_BUTTON_SAVE}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-semantic-muted">
                      {UI_HELP_TEXT.STRICTNESS_LABEL_NAME}{" "}
                      <span className="text-brand-primary">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      placeholder={UI_HELP_TEXT.STRICTNESS_PLACEHOLDER_NAME}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-semantic-muted">
                      {UI_HELP_TEXT.STRICTNESS_LABEL_DESCRIPTION}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          description: e.target.value,
                        })
                      }
                      className="h-24 w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      placeholder={
                        UI_HELP_TEXT.STRICTNESS_PLACEHOLDER_DESCRIPTION
                      }
                    />
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_LABEL_AMBIGUITY}
                        <span className="ml-2 text-sm text-semantic-muted">
                          ({formData.ambiguityThreshold}%)
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.ambiguityThreshold}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ambiguityThreshold: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-brand-accent"
                      />
                      <p className="mt-1 text-xs text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_HELP_AMBIGUITY}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_LABEL_CITATION}
                        <span className="ml-2 text-sm text-semantic-muted">
                          ({formData.citationCutoff}%)
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.citationCutoff}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            citationCutoff: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-brand-accent"
                      />
                      <p className="mt-1 text-xs text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_HELP_CITATION}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_LABEL_CONSISTENCY}
                        <span className="ml-2 text-sm text-semantic-muted">
                          ({formData.consistencyTolerance}%)
                        </span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.consistencyTolerance}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            consistencyTolerance: parseInt(e.target.value),
                          })
                        }
                        className="w-full accent-brand-accent"
                      />
                      <p className="mt-1 text-xs text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_HELP_CONSISTENCY}
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_LABEL_MANGEKYO}
                      </label>
                      <select
                        value={formData.mangekyoStrictness}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            mangekyoStrictness: e.target.value as any,
                          })
                        }
                        className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                      >
                        <option value="lenient">
                          {UI_HELP_TEXT.STRICTNESS_OPTION_LENIENT}
                        </option>
                        <option value="standard">
                          {UI_HELP_TEXT.STRICTNESS_OPTION_STANDARD}
                        </option>
                        <option value="strict">
                          {UI_HELP_TEXT.STRICTNESS_OPTION_STRICT}
                        </option>
                      </select>
                      <p className="mt-1 text-xs text-semantic-muted">
                        {UI_HELP_TEXT.STRICTNESS_HELP_MANGEKYO}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.warning} ${STATUS_BG_COLORS_SUBTLE.warning} p-5`}
                  >
                    <h4 className={`font-medium ${STATUS_TEXT_COLORS.warning}`}>
                      {UI_HELP_TEXT.STRICTNESS_GUIDELINES_TITLE}
                    </h4>
                    <ul
                      className={`mt-3 space-y-1 text-sm ${STATUS_TEXT_COLORS.warning}`}
                    >
                      <li>{UI_HELP_TEXT.STRICTNESS_GUIDELINES_CASUAL}</li>
                      <li>{UI_HELP_TEXT.STRICTNESS_GUIDELINES_ENTERPRISE}</li>
                      <li>{UI_HELP_TEXT.STRICTNESS_GUIDELINES_SECURITY}</li>
                      <li>{UI_HELP_TEXT.STRICTNESS_GUIDELINES_CUSTOM}</li>
                    </ul>
                  </div>
                </div>
              </GlassCard>
            ) : selectedProfile ? (
              /* Profile Details */
              <GlassCard>
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-brand-foreground">
                      {selectedProfile.name}
                    </h2>
                    <p className="mt-1 text-semantic-muted">
                      {selectedProfile.description ||
                        UI_HELP_TEXT.STRICTNESS_NO_DESCRIPTION}
                    </p>
                    <div className="mt-2 flex items-center gap-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm ${
                          selectedProfile.isBuiltIn
                            ? "bg-eye-jogan/20 text-eye-jogan"
                            : "bg-brand-accent/20 text-brand-accent"
                        }`}
                      >
                        {selectedProfile.isBuiltIn
                          ? UI_HELP_TEXT.STRICTNESS_BADGE_BUILTIN
                          : UI_HELP_TEXT.STRICTNESS_BADGE_CUSTOM}
                      </span>
                      <span className="text-sm text-semantic-muted">
                        {getStrictnessLabel(selectedProfile)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!selectedProfile.isBuiltIn && (
                      <>
                        <button
                          onClick={() => handleEdit(selectedProfile)}
                          className="rounded-full bg-brand-accent px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary"
                        >
                          {UI_HELP_TEXT.STRICTNESS_BUTTON_EDIT}
                        </button>
                        <button
                          onClick={() => handleDelete(selectedProfile)}
                          className={`rounded-full ${STATUS_BG_COLORS.error} px-4 py-2 text-sm font-semibold text-brand-foreground transition hover:opacity-90`}
                        >
                          {UI_HELP_TEXT.STRICTNESS_BUTTON_DELETE}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-brand-foreground">
                      {UI_HELP_TEXT.STRICTNESS_DETAIL_AMBIGUITY}
                    </h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-brand-accent">
                        {selectedProfile.ambiguityThreshold}
                      </span>
                      <span className="mb-1 text-xl text-semantic-muted">
                        %
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-semantic-muted">
                      {UI_HELP_TEXT.STRICTNESS_DESC_AMBIGUITY}
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-brand-foreground">
                      {UI_HELP_TEXT.STRICTNESS_DETAIL_CITATION}
                    </h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-eye-jogan">
                        {selectedProfile.citationCutoff}
                      </span>
                      <span className="mb-1 text-xl text-semantic-muted">
                        %
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-semantic-muted">
                      {UI_HELP_TEXT.STRICTNESS_DESC_CITATION}
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-brand-foreground">
                      {UI_HELP_TEXT.STRICTNESS_DETAIL_CONSISTENCY}
                    </h3>
                    <div className="flex items-end gap-2">
                      <span
                        className={`text-4xl font-bold ${STATUS_TEXT_COLORS.success}`}
                      >
                        {selectedProfile.consistencyTolerance}
                      </span>
                      <span className="mb-1 text-xl text-semantic-muted">
                        %
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-semantic-muted">
                      {UI_HELP_TEXT.STRICTNESS_DESC_CONSISTENCY}
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/50 p-5">
                    <h3 className="mb-2 font-semibold text-brand-foreground">
                      {UI_HELP_TEXT.STRICTNESS_DETAIL_MANGEKYO}
                    </h3>
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold capitalize text-brand-primary">
                        {selectedProfile.mangekyoStrictness}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-semantic-muted">
                      {UI_HELP_TEXT.STRICTNESS_DESC_MANGEKYO}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-6 rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.warning} ${STATUS_BG_COLORS_SUBTLE.warning} p-5`}
                >
                  <h4 className={`font-medium ${STATUS_TEXT_COLORS.warning}`}>
                    {UI_HELP_TEXT.STRICTNESS_APPLIED_TITLE}
                  </h4>
                  <p className={`mt-2 text-sm ${STATUS_TEXT_COLORS.warning}`}>
                    {UI_HELP_TEXT.STRICTNESS_APPLIED_DESC}
                  </p>
                </div>
              </GlassCard>
            ) : (
              /* Welcome Screen */
              <GlassCard className="p-12 text-center">
                <h2 className="mb-4 text-2xl font-semibold text-brand-foreground">
                  {UI_HELP_TEXT.STRICTNESS_WELCOME_TITLE}
                </h2>
                <p className="mb-6 text-lg text-semantic-muted">
                  {UI_HELP_TEXT.STRICTNESS_WELCOME_SUBTITLE}
                </p>
                <div className="space-y-2 text-sm text-semantic-muted">
                  <p>{UI_HELP_TEXT.STRICTNESS_WELCOME_BULLET_1}</p>
                  <p>{UI_HELP_TEXT.STRICTNESS_WELCOME_BULLET_2}</p>
                  <p>{UI_HELP_TEXT.STRICTNESS_WELCOME_BULLET_3}</p>
                  <p>{UI_HELP_TEXT.STRICTNESS_WELCOME_BULLET_4}</p>
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
