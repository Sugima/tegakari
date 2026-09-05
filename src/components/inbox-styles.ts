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

export function panelStyle(theme: Theme): CSSProperties {
  return {
    position: "fixed",
    bottom: 68,
    left: "50%",
    transform: "translateX(-50%)",
    width: 380,
    maxHeight: "60vh",
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 14,
    boxShadow: theme.shadowStrong,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: theme.fontFamily,
    fontSize: 13,
    pointerEvents: "auto",
    zIndex: 2147483646,
  }
}

export function headerStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: `1px solid ${theme.border}`,
    flexShrink: 0,
  }
}

export function tabGroupStyle(theme: Theme): CSSProperties {
  return {
    display: "flex",
    gap: 0,
    backgroundColor: theme.inputBg,
    borderRadius: 8,
    padding: 2,
  }
}

export function tabButtonStyle(theme: Theme, selected: boolean): CSSProperties {
  return {
    padding: "4px 12px",
    backgroundColor: selected ? theme.surface : "transparent",
    color: selected ? theme.textPrimary : theme.textMuted,
    border: "none",
    borderRadius: 6,
    fontWeight: 600,
    fontSize: 11,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    boxShadow: selected ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
  }
}

export function clearButtonStyle(theme: Theme, color: string): CSSProperties {
  return {
    ...btnBase,
    padding: "4px 8px",
    fontSize: 11,
    color: color ?? theme.textMuted,
    gap: 4,
  }
}

export function prefixRowStyle(theme: Theme): CSSProperties {
  return {
    padding: "8px 16px",
    borderBottom: `1px solid ${theme.border}`,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  }
}

export function prefixInputStyle(theme: Theme, matched: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "5px 10px",
    backgroundColor: theme.inputBg,
    color: theme.textPrimary,
    border: `1px solid ${matched ? theme.accent : theme.border}`,
    borderRadius: 8,
    fontSize: 11,
    fontFamily: theme.fontMono,
    boxSizing: "border-box",
    outline: "none",
  }
}

export const listStyle: CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "4px 0",
}

export function emptyStyle(theme: Theme): CSSProperties {
  return {
    padding: "32px 16px",
    textAlign: "center",
    color: theme.textMuted,
    fontSize: 12,
    lineHeight: 1.6,
  }
}

/** Where the drop indicator line sits relative to the hovered row. */
export type DropEdge = "top" | "bottom" | null

export interface RowDragState {
  /** This row is the one being dragged. */
  dragging: boolean
  dropEdge: DropEdge
}

export function rowStyle(
  theme: Theme,
  selected: boolean,
  drag: RowDragState = { dragging: false, dropEdge: null }
): CSSProperties {
  return {
    padding: "10px 16px",
    margin: "2px 6px",
    borderRadius: 8,
    backgroundColor: selected ? theme.activeRowBg : "transparent",
    borderLeft: selected
      ? `3px solid ${theme.activeIndicator}`
      : "3px solid transparent",
    // The drop line is drawn as a box-shadow so it never shifts the row's
    // height while the pointer moves across the list.
    boxShadow:
      drag.dropEdge === "top"
        ? `inset 0 2px 0 0 ${theme.accent}`
        : drag.dropEdge === "bottom"
          ? `inset 0 -2px 0 0 ${theme.accent}`
          : "none",
    cursor: "pointer",
    transition: "background-color 0.12s",
    opacity: drag.dragging ? 0.4 : 1,
  }
}

export const gripStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  flexShrink: 0,
  cursor: "grab",
  marginLeft: -6,
}

export function rowHeaderStyle(hasInstruction: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: hasInstruction ? 4 : 0,
  }
}

export function idBadgeStyle(theme: Theme, selected: boolean): CSSProperties {
  return {
    width: 20,
    height: 20,
    borderRadius: "50%",
    backgroundColor: selected ? theme.pinActiveBg : theme.pinBg,
    color: selected ? theme.pinActiveText : theme.pinText,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    fontFamily: theme.fontMono,
    flexShrink: 0,
  }
}

export function codeStyle(theme: Theme): CSSProperties {
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

export function rowTextStyle(theme: Theme): CSSProperties {
  return {
    fontSize: 11,
    color: theme.textMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    flex: 1,
  }
}

export function thumbStyle(theme: Theme): CSSProperties {
  return {
    width: 32,
    height: 24,
    borderRadius: 4,
    objectFit: "cover",
    border: `1px solid ${theme.border}`,
    flexShrink: 0,
  }
}

export const rowIconButtonStyle: CSSProperties = { ...btnBase, padding: 4 }

export function instructionStyle(theme: Theme): CSSProperties {
  return {
    fontSize: 11,
    color: theme.textSecondary,
    marginLeft: 28,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }
}

export function relationsSectionStyle(theme: Theme): CSSProperties {
  return {
    borderTop: `1px solid ${theme.border}`,
    padding: "6px 0",
    flexShrink: 0,
  }
}

export function relationsHeaderStyle(theme: Theme): CSSProperties {
  return {
    padding: "4px 16px",
    fontSize: 11,
    fontWeight: 600,
    color: theme.textMuted,
  }
}

export function relationRowStyle(): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 16px",
  }
}

export function relationPairStyle(theme: Theme): CSSProperties {
  return {
    fontFamily: theme.fontMono,
    fontSize: 11,
    color: theme.textSecondary,
    flexShrink: 0,
  }
}

export function relationInstructionStyle(theme: Theme): CSSProperties {
  return {
    flex: 1,
    fontSize: 11,
    color: theme.textPrimary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  }
}
