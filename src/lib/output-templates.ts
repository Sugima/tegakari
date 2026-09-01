/**
 * User-defined output templates: a lightweight alternative to the 5 built-in
 * presets (`src/lib/output-presets.ts`). A template is rendered by
 * `template-renderer.ts` and selected from the Toolbar dropdown alongside
 * the built-in presets via a `custom:<id>` value.
 */
import type { OutputPreset } from "./types"

/** A single user-defined output template. */
export interface OutputTemplate {
  /** Unique id, generated with `createTemplateId()`. */
  id: string
  /** Display name shown in the Toolbar preset dropdown and Options list. */
  name: string
  /** Rendered once, at the top of the output. */
  header: string
  /** Rendered once per annotation, in order. */
  annotation: string
}

/** `chrome.storage.local` key holding the template list. Exported so
 * subscribers (e.g. the Toolbar dropdown) can narrow `storage.onChanged`
 * to template edits instead of reloading on every unrelated write. */
export const OUTPUT_TEMPLATES_KEY = "tegakariOutputTemplates"

/** Maximum number of templates that can be stored. */
export const MAX_OUTPUT_TEMPLATES = 10

/** Prefix marking a stored/selected preset value as a reference to a custom
 * template rather than one of the 5 built-in `OutputPreset` ids. */
export const CUSTOM_PRESET_PREFIX = "custom:"

export type CustomPresetValue = `${typeof CUSTOM_PRESET_PREFIX}${string}`

/** Value space accepted by the preset dropdown / persisted setting: a
 * built-in preset id, or `custom:<templateId>` referencing an OutputTemplate. */
export type SelectedOutputPreset = OutputPreset | CustomPresetValue

/** True when `value` is a `custom:<id>` reference rather than a built-in preset id. */
export function isCustomPresetValue(value: string): value is CustomPresetValue {
  return value.startsWith(CUSTOM_PRESET_PREFIX)
}

export function toCustomPresetValue(id: string): CustomPresetValue {
  return `${CUSTOM_PRESET_PREFIX}${id}`
}

export function customPresetTemplateId(value: CustomPresetValue): string {
  return value.slice(CUSTOM_PRESET_PREFIX.length)
}

export function createTemplateId(): string {
  return crypto.randomUUID()
}

export async function loadOutputTemplates(): Promise<OutputTemplate[]> {
  try {
    const result = await chrome.storage.local.get(OUTPUT_TEMPLATES_KEY)
    const value = result[OUTPUT_TEMPLATES_KEY]
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

/**
 * Persist the template list. Defensively caps at `MAX_OUTPUT_TEMPLATES` —
 * keeping the first N — so a caller that bypasses the Options UI's own
 * limit check (e.g. a bulk import) can never grow storage past the intended
 * limit.
 */
export async function saveOutputTemplates(
  templates: OutputTemplate[]
): Promise<void> {
  try {
    const capped = templates.slice(0, MAX_OUTPUT_TEMPLATES)
    await chrome.storage.local.set({ [OUTPUT_TEMPLATES_KEY]: capped })
  } catch {
    // silently fail
  }
}

/** Insert or update (by id) a single template and persist the result. */
export async function upsertOutputTemplate(
  template: OutputTemplate
): Promise<OutputTemplate[]> {
  const templates = await loadOutputTemplates()
  const idx = templates.findIndex((t) => t.id === template.id)
  const next =
    idx >= 0
      ? templates.map((t, i) => (i === idx ? template : t))
      : [...templates, template]
  await saveOutputTemplates(next)
  return next
}

export async function deleteOutputTemplate(
  id: string
): Promise<OutputTemplate[]> {
  const templates = await loadOutputTemplates()
  const next = templates.filter((t) => t.id !== id)
  await saveOutputTemplates(next)
  return next
}

/**
 * Serialize templates to a stable, human-editable JSON string. Keys are
 * emitted in a fixed order so diffs across exports stay readable.
 */
export function serializeOutputTemplates(templates: OutputTemplate[]): string {
  const ordered = templates.map((tpl) => ({
    id: tpl.id,
    name: tpl.name,
    header: tpl.header,
    annotation: tpl.annotation,
  }))
  return `${JSON.stringify(ordered, null, 2)}\n`
}

export type ParsedTemplatesResult = {
  templates: OutputTemplate[]
  errors: string[]
}

/**
 * Parse templates from a JSON string. Invalid individual entries are
 * skipped and collected into `errors` so the UI can surface a partial
 * success. Returns `{ templates: [], errors: [...] }` when the input isn't
 * even a JSON array.
 */
export function parseOutputTemplates(text: string): ParsedTemplatesResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch (e) {
    return { templates: [], errors: [`Invalid JSON: ${(e as Error).message}`] }
  }
  if (!Array.isArray(raw)) {
    return { templates: [], errors: ["Expected a JSON array of templates"] }
  }

  const templates: OutputTemplate[] = []
  const errors: string[] = []

  raw.forEach((entry, idx) => {
    const result = parseTemplateEntry(entry, `entry #${idx + 1}`)
    if ("error" in result) {
      errors.push(result.error)
    } else {
      templates.push(result.template)
    }
  })

  return { templates, errors }
}

type ParsedTemplateEntry = { template: OutputTemplate } | { error: string }

function parseTemplateEntry(
  entry: unknown,
  label: string
): ParsedTemplateEntry {
  if (typeof entry !== "object" || entry === null) {
    return { error: `${label}: not an object` }
  }
  const e = entry as Record<string, unknown>
  const name = typeof e.name === "string" ? e.name.trim() : ""
  if (!name) {
    return { error: `${label}: 'name' is a required string` }
  }
  const header = typeof e.header === "string" ? e.header : ""
  const annotation = typeof e.annotation === "string" ? e.annotation : ""
  const id =
    typeof e.id === "string" && e.id.trim() ? e.id.trim() : createTemplateId()
  return { template: { id, name, header, annotation } }
}

/**
 * Merge imported templates into existing ones. Templates sharing an `id` are
 * overwritten in place; new ids are appended, mirroring the prefix-rules
 * import merge semantics (`mergeRules` in `prefix-rules.ts`).
 */
export function mergeOutputTemplates(
  existing: OutputTemplate[],
  imported: OutputTemplate[]
): OutputTemplate[] {
  const byId = new Map<string, number>()
  existing.forEach((tpl, i) => byId.set(tpl.id, i))

  const merged = existing.map((tpl) => ({ ...tpl }))
  for (const tpl of imported) {
    const idx = byId.get(tpl.id)
    if (idx !== undefined) {
      merged[idx] = tpl
    } else {
      byId.set(tpl.id, merged.length)
      merged.push(tpl)
    }
  }
  return merged
}
