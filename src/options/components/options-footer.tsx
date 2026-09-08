import { t } from "~lib/i18n"
import type { Theme } from "~lib/theme"

const UPSTREAM_URL = "https://github.com/iemong/tegakari"
const UPSTREAM_LABEL = "iemong/tegakari"

export function OptionsFooter({ theme }: { theme: Theme }) {
  return (
    <div
      style={{
        paddingTop: 24,
        borderTop: `1px solid ${theme.border}`,
        fontSize: 12,
        color: theme.textSecondary,
        lineHeight: 1.7,
      }}
    >
      <p style={{ margin: 0 }}>
        {t("options_footer_attribution")}{" "}
        <a
          href={UPSTREAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: theme.accent, textDecoration: "none" }}
        >
          {UPSTREAM_LABEL}
        </a>
      </p>
    </div>
  )
}
