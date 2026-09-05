import type { CSSProperties } from "react"

import { type OptionsMessageKey, t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

import { StoredAnnotationsRow } from "./stored-annotations-row"

interface Props {
  theme: Theme
  iframeEnabled: boolean
  onToggleIframe: () => void
  persistEnabled: boolean
  onTogglePersist: () => void
}

export function BehaviorSection({
  theme,
  iframeEnabled,
  onToggleIframe,
  persistEnabled,
  onTogglePersist,
}: Props) {
  const s = behaviorStyles(theme)

  return (
    <div style={s.card}>
      <ToggleRow
        theme={theme}
        styles={s}
        labelKey="options_behavior_iframe_label"
        helpKey="options_behavior_iframe_help"
        on={iframeEnabled}
        onToggle={onToggleIframe}
      />
      <div style={s.divider} />
      <ToggleRow
        theme={theme}
        styles={s}
        labelKey="options_behavior_persist_label"
        helpKey="options_behavior_persist_help"
        on={persistEnabled}
        onToggle={onTogglePersist}
      />
      <div style={s.divider} />
      <StoredAnnotationsRow theme={theme} styles={s} />
    </div>
  )
}

interface ToggleRowProps {
  theme: Theme
  styles: Record<string, CSSProperties>
  labelKey: OptionsMessageKey
  helpKey: OptionsMessageKey
  on: boolean
  onToggle: () => void
}

function ToggleRow({ theme, styles, labelKey, helpKey, on, onToggle }: ToggleRowProps) {
  return (
    <div style={styles.row}>
      <div>
        <div style={styles.label}>{t(labelKey)}</div>
        <div style={styles.help}>{t(helpKey)}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t(labelKey)}
        onClick={onToggle}
        style={switchTrackStyle(theme, on)}>
        <span style={switchThumbStyle(on)} />
      </button>
    </div>
  )
}

function behaviorStyles(theme: Theme): Record<string, CSSProperties> {
  return {
    card: {
      padding: "16px 20px",
      backgroundColor: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: 10,
    },
    row: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      margin: "14px -20px",
    },
    label: { fontSize: 13, color: theme.textPrimary, marginBottom: 2 },
    help: { fontSize: 12, color: theme.textMuted, lineHeight: 1.5 },
  }
}

function switchTrackStyle(theme: Theme, on: boolean): CSSProperties {
  return {
    position: "relative",
    flexShrink: 0,
    width: 40,
    height: 22,
    borderRadius: 999,
    border: "none",
    padding: 0,
    cursor: "pointer",
    backgroundColor: on ? theme.accent : theme.inputBg,
    transition: "background-color 0.15s",
  }
}

function switchThumbStyle(on: boolean): CSSProperties {
  return {
    position: "absolute",
    top: 3,
    left: on ? 21 : 3,
    width: 16,
    height: 16,
    borderRadius: "50%",
    backgroundColor: "#fff",
    boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
    transition: "left 0.15s",
  }
}
