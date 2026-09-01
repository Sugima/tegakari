import type { CSSProperties } from "react"

import type { Theme } from "~lib/theme"

interface Point {
  x: number
  y: number
}

export const POPOVER_WIDTH = 280

/** Gap kept between the popover and the viewport edges. */
const VIEWPORT_MARGIN = 8

/** Horizontal offset from the pin marker to the popover. */
const PIN_OFFSET_X = 28

/** Vertical offset used when the popover opens below the pin. */
const PIN_OFFSET_Y = 28

/**
 * Height assumed before the popover has been measured, used for the very first
 * paint only. Intentionally generous: the real popover is roughly this tall
 * once the screenshot, chips, textarea, style panel and Save button are laid
 * out, and over-estimating flips it to a spot where it fits, while
 * under-estimating leaves the Save button below the fold.
 */
export const ESTIMATED_POPOVER_HEIGHT = 400

/**
 * Fixed-position placement for a pin's popover.
 *
 * `height` is the popover's measured height (see `usePinPopoverPlacement`);
 * pass `null` before the first measurement. Placement prefers below the pin,
 * flips above when it doesn't fit there, and — when neither side has room, e.g.
 * a short viewport — clamps into the viewport and lets the popover scroll, so
 * the Save button is always reachable.
 */
export function popoverStyle(
  { x, y }: Point,
  height: number | null = null
): CSSProperties {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  // Horizontal placement is unchanged: to the right of the pin, flipping to
  // its left when the popover would run past the right edge.
  const flipLeft = x + 30 + POPOVER_WIDTH > viewportWidth
  const maxHeight = Math.max(0, viewportHeight - VIEWPORT_MARGIN * 2)

  return {
    position: "fixed",
    width: POPOVER_WIDTH,
    ...(flipLeft
      ? { right: viewportWidth - x + VIEWPORT_MARGIN }
      : { left: x + PIN_OFFSET_X }),
    top: resolveTop(y, height ?? ESTIMATED_POPOVER_HEIGHT, viewportHeight),
    maxHeight,
    overflowY: "auto",
  }
}

/**
 * Vertical position: below the pin when it fits, above when that fits instead,
 * otherwise clamped so the whole popover (capped at the viewport height) stays
 * on screen.
 */
function resolveTop(y: number, height: number, viewportHeight: number): number {
  const below = y + PIN_OFFSET_Y
  if (below + height + VIEWPORT_MARGIN <= viewportHeight) return below

  const above = y - VIEWPORT_MARGIN - height
  if (above >= VIEWPORT_MARGIN) return above

  const capped = Math.min(height, viewportHeight - VIEWPORT_MARGIN * 2)
  const bottomAligned = viewportHeight - VIEWPORT_MARGIN - capped
  return Math.max(VIEWPORT_MARGIN, bottomAligned)
}

export interface PinMarkerState {
  isActive: boolean
  /** This pin is the current "Link" source — see `use-link-mode.ts`. */
  isLinkSource?: boolean
  /** Link mode is active (for some pin, not necessarily this one). */
  linkModeActive?: boolean
}

export function pinMarkerStyle(
  theme: Theme,
  { x, y }: Point,
  state: PinMarkerState
): CSSProperties {
  const { isActive, isLinkSource, linkModeActive } = state
  return {
    position: "fixed",
    top: y - 12,
    left: x - 12,
    width: 24,
    height: 24,
    borderRadius: "50%",
    backgroundColor: isActive || isLinkSource ? theme.pinActiveBg : theme.pinBg,
    color: isActive || isLinkSource ? theme.pinActiveText : theme.pinText,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    fontFamily: theme.fontMono,
    cursor: linkModeActive && !isLinkSource ? "crosshair" : "pointer",
    zIndex: 2147483646,
    border: isLinkSource
      ? `2px dashed ${theme.accent}`
      : isActive
        ? "2px solid rgba(255,255,255,0.25)"
        : "2px solid rgba(0,0,0,0.15)",
    boxShadow: isLinkSource
      ? `0 0 0 4px ${theme.accentMuted}, 0 2px 12px rgba(0,0,0,0.3)`
      : isActive
        ? `0 0 0 4px ${theme.accentMuted}, 0 2px 12px rgba(0,0,0,0.3)`
        : "0 2px 8px rgba(0,0,0,0.25)",
    transition: "background-color 0.15s, box-shadow 0.2s, border-color 0.15s",
    pointerEvents: "auto",
    userSelect: "none",
  }
}

export function popoverContainerStyle(theme: Theme): CSSProperties {
  return {
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 12,
    boxShadow: theme.shadowStrong,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    zIndex: 2147483647,
    pointerEvents: "auto",
    fontFamily: theme.fontFamily,
  }
}

export function idBadgeStyle(theme: Theme): CSSProperties {
  return {
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: theme.accent,
    color: theme.accentText,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: theme.fontMono,
    flexShrink: 0,
  }
}

export function tagCodeStyle(theme: Theme): CSSProperties {
  return {
    backgroundColor: theme.codeBg,
    color: theme.textSecondary,
    padding: "2px 6px",
    borderRadius: 4,
    fontSize: 11,
    fontFamily: theme.fontMono,
    border: `1px solid ${theme.border}`,
  }
}

export function headerTextStyle(theme: Theme): CSSProperties {
  return {
    fontSize: 11,
    color: theme.textMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  }
}

export const headerActionsStyle: CSSProperties = {
  display: "flex",
  gap: 2,
  flexShrink: 0,
  marginLeft: "auto",
}

export const iconButtonStyle: CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 4,
  display: "flex",
  borderRadius: 4,
}

export function linkButtonStyle(theme: Theme): CSSProperties {
  return {
    background: "none",
    border: `1px solid ${theme.border}`,
    borderRadius: 4,
    cursor: "pointer",
    padding: "2px 6px",
    fontSize: 10,
    fontWeight: 600,
    color: theme.textMuted,
    fontFamily: theme.fontFamily,
  }
}

export function thumbnailStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    maxHeight: 120,
    objectFit: "cover",
    borderRadius: 8,
    border: `1px solid ${theme.border}`,
  }
}

export function popoverTextareaStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${theme.border}`,
    borderRadius: 8,
    padding: "8px 10px",
    resize: "vertical",
    fontFamily: theme.fontFamily,
    fontSize: 12,
    lineHeight: 1.5,
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
  }
}

export function saveButtonStyle(theme: Theme): CSSProperties {
  return {
    width: "100%",
    padding: "7px 0",
    backgroundColor: theme.accent,
    color: theme.accentText,
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 12,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    transition: "background-color 0.15s",
    letterSpacing: "0.02em",
  }
}
