import { generateBatchFeedback, generateFeedback } from "./feedback-generator"
import { generateBatchJsonl, generateJsonl } from "./jsonl-generator"
import { generateBatchMarkdown, generateMarkdown } from "./markdown-generator"
import {
  customPresetTemplateId,
  isCustomPresetValue,
  type OutputTemplate,
  type SelectedOutputPreset,
} from "./output-templates"
import { renderOutputTemplate } from "./template-renderer"
import type {
  BatchInput,
  MarkdownInput,
  MarkdownSectionOptions,
  OutputPreset,
} from "./types"
import { generateBatchXml, generateXml } from "./xml-generator"

/** All selectable presets, in the order they should appear in the UI. */
export const OUTPUT_PRESETS: OutputPreset[] = [
  "jsonl",
  "markdown",
  "claude-code",
  "cursor",
  "minimal",
]

export const OUTPUT_PRESET_LABELS: Record<OutputPreset, string> = {
  jsonl: "JSONL",
  markdown: "Markdown",
  "claude-code": "Claude Code",
  cursor: "Cursor",
  minimal: "Minimal",
}

const CURSOR_OPTIONS: MarkdownSectionOptions = {
  pageContext: "compact",
  component: "brief",
}

/** Render a single (non-batch) input for the given preset. */
export function generatePresetOutput(
  preset: OutputPreset,
  input: MarkdownInput
): string {
  switch (preset) {
    case "jsonl":
      return generateJsonl(input)
    case "markdown":
      return generateMarkdown(input)
    case "claude-code":
      return generateXml(input)
    case "cursor":
      return generateMarkdown(input, CURSOR_OPTIONS)
    case "minimal":
      return generateFeedback(input)
  }
}

/**
 * Render a batch input (also used for single pin copy, with one annotation)
 * for the given preset. `preset` may also be a `custom:<id>` reference to a
 * user-defined template (see `output-templates.ts`); pass the already-loaded
 * template list via `customTemplates` so it can be resolved without an extra
 * storage read per copy. Falls back to the `jsonl` preset when the
 * referenced template can't be found (e.g. it was deleted after being
 * selected).
 */
export function generateBatchPresetOutput(
  preset: SelectedOutputPreset,
  input: BatchInput,
  customTemplates: OutputTemplate[] = []
): string {
  if (isCustomPresetValue(preset)) {
    const templateId = customPresetTemplateId(preset)
    const template = customTemplates.find((t) => t.id === templateId)
    return template
      ? renderOutputTemplate(template, input)
      : generateBatchJsonl(input)
  }

  switch (preset) {
    case "jsonl":
      return generateBatchJsonl(input)
    case "markdown":
      return generateBatchMarkdown(input)
    case "claude-code":
      return generateBatchXml(input)
    case "cursor":
      return generateBatchMarkdown(input, CURSOR_OPTIONS)
    case "minimal":
      return generateBatchFeedback(input)
  }
}
