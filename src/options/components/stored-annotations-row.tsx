import { type CSSProperties, useCallback, useState } from "react"

import { clearAllStoredAnnotations } from "~lib/annotation-store"
import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

interface Props {
  theme: Theme
  styles: Record<string, CSSProperties>
}

/**
 * Deletes every page's stored annotations. Wholesale and irreversible, so it
 * asks for a second click first — the same confirmation the overlay's
 * "Clear all" uses.
 */
export function StoredAnnotationsRow({ theme, styles }: Props) {
  const { label, confirming, onClick } = useClearAll()

  return (
    <div style={styles.row}>
      <div>
        <div style={styles.label}>{t("options_behavior_clear_label")}</div>
        <div style={styles.help}>{t("options_behavior_clear_help")}</div>
      </div>
      <button type="button" onClick={onClick} style={clearButtonStyle(theme, confirming)}>
        {label}
      </button>
    </div>
  )
}

function useClearAll() {
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const onClick = useCallback(async () => {
    if (!confirming) {
      setConfirming(true)
      setResult(null)
      setTimeout(() => setConfirming(false), 3000)
      return
    }
    setConfirming(false)
    const count = await clearAllStoredAnnotations()
    setResult(
      count > 0
        ? t("options_behavior_clear_done", String(count))
        : t("options_behavior_clear_empty")
    )
  }, [confirming])

  const label = confirming
    ? t("options_behavior_clear_confirm")
    : (result ?? t("options_behavior_clear_button"))

  return { label, confirming, onClick }
}

function clearButtonStyle(theme: Theme, confirming: boolean): CSSProperties {
  return {
    flexShrink: 0,
    padding: "6px 12px",
    fontSize: 12,
    fontFamily: theme.fontFamily,
    color: confirming ? theme.danger : theme.textSecondary,
    backgroundColor: theme.inputBg,
    border: `1px solid ${confirming ? theme.danger : theme.border}`,
    borderRadius: 8,
    cursor: "pointer",
  }
}
