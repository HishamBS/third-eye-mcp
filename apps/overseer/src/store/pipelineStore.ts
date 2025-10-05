import { create } from 'zustand';
import type {
  EyeState,
  PipelineEvent,
  PipelineStore,
  SessionSettingsPayload,
  EvidenceClaim,
} from '../types/pipeline';

const MAX_EVENTS = 500;

function normalizeEye(name?: string | null): string {
  if (!name) return 'UNKNOWN';
  return name.toUpperCase();
}

export const usePipelineStore = create<PipelineStore>((set, _get) => ({
  sessionId: null,
  connected: false,
  connectionAttempts: 0,
  eyes: {},
  events: [],
  settings: null,
  claims: [],
  error: null,

  setSessionId: (sessionId) => set({ sessionId }),
  switchSession: (sessionId) =>
    set((state) => ({
      sessionId,
      eyes: {},
      events: [],
      settings: null,
      claims: [],
      error: null,
      connected: state.connected,
      connectionAttempts: state.connectionAttempts,
    })),
  reset: () =>
    set({
      eyes: {},
      events: [],
      settings: null,
      claims: [],
      error: null,
      connected: false,
      connectionAttempts: 0,
    }),
  addEvent: (event: PipelineEvent) =>
    set(({ events }) => {
      const trimmed = [...events, event];
      if (trimmed.length > MAX_EVENTS) {
        trimmed.splice(0, trimmed.length - MAX_EVENTS);
      }
      return { events: trimmed };
    }),
  setEyeState: (eye, state) =>
    set(({ eyes }) => ({
      eyes: {
        ...eyes,
        [normalizeEye(eye)]: state,
      },
    })),
  setSettings: (settings: SessionSettingsPayload) => set({ settings }),
  setClaims: (claims: EvidenceClaim[]) => set({ claims }),
  setConnectionState: (connected) => set({ connected }),
  setError: (message) => set({ error: message }),
  incrementAttempts: () => set(({ connectionAttempts }) => ({ connectionAttempts: connectionAttempts + 1 })),
}));

export function selectEyeStates(): Record<string, EyeState> {
  return usePipelineStore.getState().eyes;
}

export function selectEvents(): PipelineEvent[] {
  return usePipelineStore.getState().events;
}

export function selectSettings(): SessionSettingsPayload | null {
  return usePipelineStore.getState().settings;
}

export function selectClaims(): EvidenceClaim[] {
  return usePipelineStore.getState().claims;
}
