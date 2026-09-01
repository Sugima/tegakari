/**
 * The `minimal` preset: a compact review-comment report. One heading per
 * annotation, the user's instruction as a blockquote, the selected
 * quick-instruction tags, and just enough element identity underneath to find
 * the node again (element / selector / classes / text). Everything the full
 * Markdown output carries beyond that — attributes, styles, CSS provenance,
 * component tree, relations — is deliberately dropped.
 *
 * See `docs/output-spec.md#minimal-プリセットの形式` for the contract.
 */
import { formatClassList } from "./element-classes"
import type { BatchInput, ElementInfo, MarkdownInput } from "./types"

const HEADER = "---\n\n# Feedback Report"

/** `> line` for every line of the instruction, so multi-line text stays quoted. */
function blockquote(instruction: string): string | null {
  const trimmed = instruction.trim()
  if (!trimmed) return null
  return trimmed
    .split("\n")
    .map((line) => `> ${line.trim()}`)
    .join("\n")
}

/** The `- key: value` identity lines; each is omitted when its value is empty. */
function elementLines(el: ElementInfo): string[] {
  const classes = formatClassList(el)
  const text = el.text.trim()
  return [
    `- Element: \`<${el.tag}>\``,
    `- Selector: \`${el.selector}\``,
    ...(classes ? [`- Classes: \`${classes}\``] : []),
    ...(text ? [`- Text: "${text}"`] : []),
  ]
}

interface Section {
  index: number
  instruction: string
  elementInfo: ElementInfo
  /** Quick-instruction chip ids; omitted or empty means "no tags". */
  tags?: string[]
}

function feedbackSection({
  index,
  instruction,
  elementInfo,
  tags,
}: Section): string {
  const quote = blockquote(instruction)
  const head = quote
    ? `## Feedback #${index}\n${quote}`
    : `## Feedback #${index}`
  const tagList = tags?.join(", ") ?? ""
  const lines = [
    ...(tagList ? [`- Tags: \`${tagList}\``] : []),
    ...elementLines(elementInfo),
  ]
  return `${head}\n\n${lines.join("\n")}`
}

function header(pageUrl: string): string {
  return `${HEADER}\nURL: ${pageUrl}`
}

/**
 * Single-element output. Always numbered `#1` — there is only one section.
 * `MarkdownInput` carries no tags, so no Tags line is emitted on this path.
 */
export function generateFeedback(input: MarkdownInput): string {
  return [
    header(input.pageUrl),
    feedbackSection({
      index: 1,
      instruction: input.instruction,
      elementInfo: input.elementInfo,
    }),
  ].join("\n\n")
}

/**
 * Batch output (also used for single-pin copy, with one annotation). Sections
 * are numbered by the annotation's own id so the report matches the pin
 * numbers on the page. A matched prefix rule goes above everything, the same
 * way the Markdown preset places it.
 */
export function generateBatchFeedback(input: BatchInput): string {
  const sections = input.annotations.map((annotation) =>
    feedbackSection({
      index: annotation.id,
      instruction: annotation.instruction,
      elementInfo: annotation.elementInfo,
      tags: annotation.tags,
    })
  )
  const body = [header(input.pageUrl), ...sections].join("\n\n")
  return input.prefix ? `${input.prefix}\n\n${body}` : body
}
