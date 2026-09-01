import type { CSSProperties } from "react"

import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

// Placeholder identifiers are literal template syntax (not user-facing
// prose), so they're listed verbatim rather than run through t().
const HEADER_PLACEHOLDERS = [
  "{{prefix}}",
  "{{page.url}}",
  "{{page.title}}",
  "{{page.framework}}",
  "{{page.metaFramework}}",
  "{{annotationCount}}",
]

const ANNOTATION_PLACEHOLDERS = [
  "{{id}}",
  "{{instruction}}",
  "{{tags}}",
  "{{selector}}",
  "{{tag}}",
  "{{classes}}",
  "{{text}}",
  "{{attributes}}",
  "{{styles}}",
  "{{component.hierarchy}}",
  "{{component.name}}",
  "{{component.source}}",
  "{{component.props}}",
]

export function TemplatePlaceholderLegend({ theme }: { theme: Theme }) {
  return (
    <div style={{ marginBottom: 16, fontSize: 12, color: theme.textMuted }}>
      <div
        style={{ fontWeight: 600, marginBottom: 8, color: theme.textSecondary }}
      >
        {t("options_templates_legend_title")}
      </div>
      <PlaceholderGroup
        label={t("options_templates_label_header")}
        tokens={HEADER_PLACEHOLDERS}
        theme={theme}
      />
      <PlaceholderGroup
        label={t("options_templates_label_annotation")}
        tokens={ANNOTATION_PLACEHOLDERS}
        theme={theme}
      />
    </div>
  )
}

function PlaceholderGroup({
  label,
  tokens,
  theme,
}: {
  label: string
  tokens: string[]
  theme: Theme
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 6,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <span style={{ flexShrink: 0, minWidth: 70 }}>{label}:</span>
      {tokens.map((token) => (
        <code key={token} style={chipStyle(theme)}>
          {token}
        </code>
      ))}
    </div>
  )
}

function chipStyle(theme: Theme): CSSProperties {
  return {
    backgroundColor: theme.codeBg,
    padding: "1px 5px",
    borderRadius: 3,
    fontFamily: theme.fontMono,
    fontSize: 11,
    border: `1px solid ${theme.border}`,
  }
}
