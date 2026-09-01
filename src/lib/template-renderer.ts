/**
 * Rendering engine for user-defined `OutputTemplate`s (see
 * `output-templates.ts`). Deliberately minimal: `{{key}}` substitution only,
 * no conditionals or loops.
 */
import { formatClassList } from "./element-classes"
import type { OutputTemplate } from "./output-templates"
import { formatSourceLocation } from "./source-location"
import type { Annotation, BatchInput } from "./types"

// Matches {{key}} / {{ key }} where key is letters/digits/underscore/dot
// (e.g. "page.url", "component.hierarchy"). Shared by the substitution pass
// and the {{prefix}} presence check below so both agree on what counts as
// "the header places {{prefix}} itself".
const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g

function renderPlaceholders(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(PLACEHOLDER_PATTERN, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  )
}

/** True when `template` contains a `{{key}}` placeholder for the given key. */
function containsPlaceholder(template: string, key: string): boolean {
  const matches = template.matchAll(PLACEHOLDER_PATTERN)
  for (const match of matches) {
    if (match[1] === key) return true
  }
  return false
}

function keyValueLines(entries: Record<string, string> | undefined): string {
  if (!entries) return ""
  return Object.entries(entries)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")
}

/** Every `header`-scoped placeholder value, always present (empty string when unknown). */
function buildHeaderValues(input: BatchInput): Record<string, string> {
  const firstFramework = input.annotations.find(
    (a) => a.frameworkInfo
  )?.frameworkInfo
  return {
    prefix: input.prefix ?? "",
    "page.url": input.pageUrl,
    "page.title": input.pageTitle,
    "page.framework": firstFramework?.framework ?? "",
    "page.metaFramework": firstFramework?.metaFramework ?? "",
    annotationCount: String(input.annotations.length),
  }
}

/** Every `annotation`-scoped placeholder value, always present (empty string when unknown). */
function buildAnnotationValues(annotation: Annotation): Record<string, string> {
  const comp = annotation.componentInfo
  return {
    id: String(annotation.id),
    instruction: annotation.instruction.trim(),
    tags: annotation.tags?.join(", ") ?? "",
    selector: annotation.elementInfo.selector,
    tag: annotation.elementInfo.tag,
    classes: formatClassList(annotation.elementInfo),
    text: annotation.elementInfo.text,
    attributes: keyValueLines(annotation.elementInfo.attributes),
    styles: keyValueLines(annotation.elementInfo.styles),
    "component.hierarchy": comp ? comp.hierarchy.join(" → ") : "",
    "component.name":
      comp && comp.hierarchy.length > 0
        ? comp.hierarchy[comp.hierarchy.length - 1]
        : "",
    "component.source": comp?.source ? formatSourceLocation(comp.source) : "",
    "component.props": comp?.props ? JSON.stringify(comp.props) : "",
  }
}

/**
 * Render a custom `OutputTemplate` against a batch of annotations.
 *
 * Output = header (rendered once) + each annotation (rendered in order).
 * Each rendered piece is trimmed; pieces that are empty after trimming are
 * dropped so an empty header/annotation template never introduces a stray
 * blank line. The remaining pieces are joined with a blank line (`\n\n`).
 *
 * The page-level prefix rule (`[repo=...]`) is auto-prepended the same way
 * the built-in presets do it — UNLESS the header template already places
 * `{{prefix}}` itself, in which case the user's placement is respected and
 * no further prepending happens.
 */
export function renderOutputTemplate(
  template: OutputTemplate,
  input: BatchInput
): string {
  const renderedHeader = renderPlaceholders(
    template.header,
    buildHeaderValues(input)
  ).trim()
  const renderedAnnotations = input.annotations.map((annotation) =>
    renderPlaceholders(
      template.annotation,
      buildAnnotationValues(annotation)
    ).trim()
  )

  const body = [renderedHeader, ...renderedAnnotations]
    .filter((part) => part.length > 0)
    .join("\n\n")

  const hasPrefixPlaceholder = containsPlaceholder(template.header, "prefix")
  if (!hasPrefixPlaceholder && input.prefix) {
    return `${input.prefix}\n\n${body}`
  }
  return body
}
