import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

export const btnBase: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px",
  borderRadius: 8,
  transition: "background-color 0.12s",
}

export function toolbarBarStyle(theme: Theme): CSSProperties {
  return {
    position: "fixed",
    inset: "auto auto 16px 50%",
    margin: 0,
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 2,
    padding: "4px 6px",
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 50,
    // The bar is promoted to the top layer via `popover="manual"`, and the UA
    // stylesheet's `[popover]` rule brings `overflow: auto` with it. That
    // clips the preset dropdown, which opens upward outside the bar — and an
    // upward overflow can't even be scrolled to, so the menu is simply
    // invisible. Restore `visible` so the menu escapes the bar.
    overflow: "visible",
    boxShadow: theme.shadowStrong,
    fontFamily: theme.fontFamily,
    fontSize: 13,
    pointerEvents: "auto",
    zIndex: 2147483647,
    userSelect: "none",
  }
}

export function inboxButtonStyle(theme: Theme, open: boolean): CSSProperties {
  return {
    ...btnBase,
    backgroundColor: open ? theme.accentMuted : "transparent",
    position: "relative",
  }
}

export function inboxBadgeStyle(theme: Theme): CSSProperties {
  return {
    position: "absolute",
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    fontSize: 9,
    fontWeight: 700,
    color: theme.accentText,
    backgroundColor: theme.accent,
    borderRadius: "50%",
    fontFamily: theme.fontMono,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  }
}

export function copyButtonStyle(copied: boolean): CSSProperties {
  return {
    ...btnBase,
    backgroundColor: copied ? "rgba(78, 203, 113, 0.15)" : "transparent",
  }
}

export function dividerStyle(theme: Theme): CSSProperties {
  return { width: 1, height: 20, backgroundColor: theme.border }
}
