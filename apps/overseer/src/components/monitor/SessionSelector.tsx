import type { SessionSettingsPayload, SessionOverview } from '../../types/pipeline';
import SessionHeader from '../SessionHeader';

export interface SessionSelectorProps {
  sessionId: string | null;
  apiKey: string | null;
  onChangeSession: (sessionId: string) => void;
  onApiKeyChange: (apiKey: string) => void;
  noviceMode: boolean;
  personaMode: boolean;
  onNoviceToggle: (value: boolean) => void;
  onPersonaToggle: (value: boolean) => void;
  settings: SessionSettingsPayload;
  connected: boolean;
  connectionAttempts: number;
  onSaveSettings: (settings: SessionSettingsPayload) => Promise<void> | void;
  settingsSaving?: boolean;
  sessions: SessionOverview[];
  sessionsLoading?: boolean;
  sessionsError?: string | null;
  onRefreshSessions: () => void;
  autoFollow: boolean;
  onAutoFollowChange: (value: boolean) => void;
}

export function SessionSelector({
  sessionId,
  apiKey,
  onChangeSession,
  onApiKeyChange,
  noviceMode,
  personaMode,
  onNoviceToggle,
  onPersonaToggle,
  settings,
  connected,
  connectionAttempts,
  onSaveSettings,
  settingsSaving = false,
  sessions,
  sessionsLoading = false,
  sessionsError = null,
  onRefreshSessions,
  autoFollow,
  onAutoFollowChange,
}: SessionSelectorProps) {
  return (
    <SessionHeader
      sessionId={sessionId ?? ''}
      onSessionSubmit={onChangeSession}
      apiKey={apiKey ?? ''}
      onApiKeyChange={onApiKeyChange}
      noviceMode={noviceMode}
      personaMode={personaMode}
      onNoviceToggle={onNoviceToggle}
      onPersonaToggle={onPersonaToggle}
      settings={settings}
      onSettingsSave={onSaveSettings}
      onApplyProfile={onSaveSettings}
      settingsSaving={settingsSaving}
      connected={connected}
      connectionAttempts={connectionAttempts}
      sessions={sessions}
      sessionsLoading={sessionsLoading}
      sessionsError={sessionsError}
      onRefreshSessions={onRefreshSessions}
      autoFollow={autoFollow}
      onAutoFollowChange={onAutoFollowChange}
    />
  );
}

export default SessionSelector;
