/** Persisted user settings stored in `chrome.storage.local`. */

import { OUTPUT_PRESETS } from "./output-presets"
import {
  isCustomPresetValue,
  type SelectedOutputPreset,
} from "./output-templates"
import type { OutputPreset } from "./types"

export const IFRAME_SELECTION_KEY = "tegakariIframeSelection"
// Key name kept as-is (predates the preset system) so existing "jsonl"/
// "markdown" values persisted by earlier versions keep loading correctly.
export const OUTPUT_FORMAT_KEY = "tegakariOutputFormat"

function isOutputPreset(value: unknown): value is OutputPreset {
  return (
    typeof value === "string" &&
    (OUTPUT_PRESETS as readonly string[]).includes(value)
  )
}

// Accepts the 5 built-in preset ids as well as a `custom:<templateId>`
// reference. The referenced template itself is resolved lazily at copy time
// (see `generateBatchPresetOutput`) — an id for a template that no longer
// exists is still a *valid* stored value here, it just falls back to jsonl
// once rendering is attempted.
function isSelectedOutputPreset(value: unknown): value is SelectedOutputPreset {
  return (
    typeof value === "string" &&
    (isOutputPreset(value) || isCustomPresetValue(value))
  )
}

/** Read the "select inside same-origin iframes" flag (defaults to false). */
export async function loadIframeSelection(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.storage.local.get(IFRAME_SELECTION_KEY, (result) => {
      resolve(result[IFRAME_SELECTION_KEY] === true)
    })
  })
}

/** Persist the iframe-selection flag. */
export function setIframeSelection(enabled: boolean): void {
  chrome.storage.local.set({ [IFRAME_SELECTION_KEY]: enabled })
}

/**
 * Read the preferred output preset (defaults to "minimal"). Accepts any of the
 * 5 built-in preset ids or a `custom:<templateId>` reference; a value
 * persisted by an older build ("jsonl"/"markdown") is still valid and loads
 * unchanged. Unknown/corrupt values fall back to minimal.
 */
export async function loadOutputPreset(): Promise<SelectedOutputPreset> {
  return new Promise((resolve) => {
    chrome.storage.local.get(OUTPUT_FORMAT_KEY, (result) => {
      const value = result[OUTPUT_FORMAT_KEY]
      resolve(isSelectedOutputPreset(value) ? value : "minimal")
    })
  })
}

/** Persist the preferred output preset. */
export function setOutputPreset(preset: SelectedOutputPreset): void {
  chrome.storage.local.set({ [OUTPUT_FORMAT_KEY]: preset })
}
