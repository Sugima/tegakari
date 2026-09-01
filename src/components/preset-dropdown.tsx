import {
  type CSSProperties,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react"

import { ChevronDownIcon } from "~components/icons"
import { OUTPUT_PRESETS, OUTPUT_PRESET_LABELS } from "~lib/output-presets"
import {
  customPresetTemplateId,
  isCustomPresetValue,
  toCustomPresetValue,
  type OutputTemplate,
  type SelectedOutputPreset,
} from "~lib/output-templates"
import type { Theme } from "~lib/theme"

interface Props {
  theme: Theme
  preset: SelectedOutputPreset
  customTemplates: OutputTemplate[]
  onPresetChange: (preset: SelectedOutputPreset) => void
}

/** Resolve the trigger/selected label for a preset value, built-in or custom. */
function presetLabel(
  preset: SelectedOutputPreset,
  customTemplates: OutputTemplate[]
): string {
  if (!isCustomPresetValue(preset)) return OUTPUT_PRESET_LABELS[preset]
  const templateId = customPresetTemplateId(preset)
  return customTemplates.find((t) => t.id === templateId)?.name ?? "Custom template"
}

/** Dropdown selecting an output preset: the 5 built-ins (jsonl/markdown/claude-code/cursor/minimal) plus any user-defined custom templates. */
export function PresetDropdown({ theme, preset, customTemplates, onPresetChange }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  useCloseOnOutsideClick(containerRef, open, () => setOpen(false))

  return (
    <div
      ref={containerRef}
      onClick={(e) => e.stopPropagation()}
      style={containerStyle}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={triggerStyle(theme, open)}
        title="Output preset">
        {presetLabel(preset, customTemplates)}
        <ChevronDownIcon color={theme.textMuted} />
      </button>
      {open && (
        <PresetMenu
          theme={theme}
          preset={preset}
          customTemplates={customTemplates}
          onSelect={(next) => {
            onPresetChange(next)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

function PresetMenu({
  theme,
  preset,
  customTemplates,
  onSelect,
}: {
  theme: Theme
  preset: SelectedOutputPreset
  customTemplates: OutputTemplate[]
  onSelect: (preset: SelectedOutputPreset) => void
}) {
  return (
    <div role="listbox" style={menuStyle(theme)}>
      {OUTPUT_PRESETS.map((p) => (
        <button
          key={p}
          role="option"
          aria-selected={p === preset}
          onClick={() => onSelect(p)}
          style={menuItemStyle(theme, p === preset)}>
          {OUTPUT_PRESET_LABELS[p]}
        </button>
      ))}
      {customTemplates.map((template) => {
        const value = toCustomPresetValue(template.id)
        return (
          <button
            key={template.id}
            role="option"
            aria-selected={value === preset}
            onClick={() => onSelect(value)}
            style={menuItemStyle(theme, value === preset)}>
            {template.name}
          </button>
        )
      })}
    </div>
  )
}

// Close the menu on any click outside the trigger/menu, e.g. picking a page
// element while the dropdown was left open.
//
// The check has to walk `composedPath()`, not `e.target`: this listener sits on
// the document while the menu lives in Plasmo's shadow DOM, so `e.target` is
// retargeted to the shadow host. Comparing against that host classified every
// in-menu mousedown as "outside" and closed the menu before the click could
// reach an option — the menu opened but nothing could be selected.
function useCloseOnOutsideClick(
  ref: RefObject<HTMLElement>,
  active: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (!active) return
    const handler = (e: MouseEvent) => {
      const container = ref.current
      if (container && !e.composedPath().includes(container)) onClose()
    }
    document.addEventListener("mousedown", handler, true)
    return () => document.removeEventListener("mousedown", handler, true)
  }, [ref, active, onClose])
}

const containerStyle: CSSProperties = {
  position: "relative",
  display: "flex",
}

function triggerStyle(theme: Theme, open: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    backgroundColor: open ? theme.accentMuted : "transparent",
    color: theme.textPrimary,
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 11,
    fontFamily: theme.fontFamily,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }
}

function menuStyle(theme: Theme): CSSProperties {
  return {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "column",
    minWidth: 130,
    padding: 4,
    backgroundColor: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 10,
    boxShadow: theme.shadowStrong,
    zIndex: 1,
  }
}

function menuItemStyle(theme: Theme, selected: boolean): CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    padding: "6px 10px",
    backgroundColor: selected ? theme.accentMuted : "transparent",
    color: selected ? theme.accent : theme.textPrimary,
    border: "none",
    borderRadius: 6,
    fontWeight: selected ? 700 : 500,
    fontSize: 12,
    fontFamily: theme.fontFamily,
    textAlign: "left",
    cursor: "pointer",
  }
}
