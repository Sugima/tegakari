// Chrome runtime message (background → content script)
export interface ToggleMessage {
  type: "TEGAKARI_TOGGLE"
}

// PostMessage types (Isolated World ↔ Main World)
export interface CollectRequest {
  type: "TEGAKARI_COLLECT"
  selector: string
}

export interface CollectResult {
  type: "TEGAKARI_RESULT"
  framework: FrameworkInfo | null
  component: ComponentInfo | null
}

export interface FrameworkInfo {
  framework: string | null // "React" | "Vue" | "Svelte" | "Svelte 5" | "Svelte 4"
  metaFramework: string | null // "Next.js (App Router)" | "Nuxt" | "SvelteKit"
}

/** Source location of the selected element's JSX/SFC (dev builds only) */
export interface SourceLocation {
  file: string
  line?: number
}

export interface ComponentInfo {
  framework: "react" | "vue" | "svelte"
  hierarchy: string[]
  props?: Record<string, unknown>
  state?: Record<string, unknown>
  source?: SourceLocation
}

/**
 * A same-origin CSS rule (from `document.styleSheets`) that matches the
 * selected element, i.e. its "provenance" — which file/selector a computed
 * style value actually came from. See `~lib/css-provenance`.
 */
export interface CssRuleInfo {
  /** The rule's `selectorText`, e.g. ".btn-primary:hover" */
  selector: string
  /** Stylesheet filename (e.g. "app.css") or "inline" for `<style>` tags */
  source: string
  /** "property: value" pairs the rule declares (`!important` kept in the value) */
  declarations: string[]
  /** `@media`/`@supports` condition text, if the rule is nested inside one */
  media?: string
}

export interface ElementInfo {
  selector: string
  tag: string
  text: string
  attributes: Record<string, string>
  /** Effective styles diffed against tag defaults (curated subset) */
  styles?: Record<string, string>
  /** Same-origin CSS rules matching this element, newest-first (max 10) */
  cssRules?: CssRuleInfo[]
  /** Resolved values for CSS custom properties referenced by cssRules (max 10) */
  customProperties?: Record<string, string>
}

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface CaptureRequest {
  type: "TEGAKARI_CAPTURE"
}

export interface CaptureResponse {
  success: boolean
  dataUrl?: string
  error?: string
}

// Page metadata collected automatically
export interface PageMetadata {
  url: string
  title: string
  viewport: { width: number; height: number }
  userAgent: string
  language: string
  timestamp: number
  frameworkInfo: FrameworkInfo | null
}

/** A single property adjusted via the "Adjust styles" panel on a pin popover. */
export interface StyleDelta {
  property: string // CSS property name (kebab-case)
  before: string // computed value before the adjustment
  after: string // value the user set
}

export interface Annotation {
  /**
   * Display number. Always `index + 1` in list order — deleting or reordering
   * renumbers every annotation so the numbering has no gaps (see
   * `~lib/annotation-order`). Use `uid` when a stable reference is needed.
   */
  id: number
  /**
   * Stable identity, unaffected by renumbering. Backfilled on load/import, so
   * it is always present at runtime and optional only for legacy stored data.
   */
  uid?: string
  elementInfo: ElementInfo
  frameworkInfo: FrameworkInfo | null
  componentInfo: ComponentInfo | null
  instruction: string
  /** Click position relative to document (pageX/pageY) */
  pageX: number
  pageY: number
  /** Auto-captured screenshot (data URL) */
  screenshot?: string
  /** Creation timestamp */
  createdAt: number
  /**
   * Selected quick-instruction chip ids, in selection order (e.g.
   * `["spacing", "color"]`). Omitted or empty means "no tags" — both are
   * treated identically by generators/UI.
   */
  tags?: string[]
  /**
   * Style adjustments made via the pin popover's "Adjust styles" panel.
   * `property` is unique per entry; array order mirrors edit order. Omitted
   * or empty means "no style changes" — both are treated identically by
   * generators/UI.
   */
  styleDelta?: StyleDelta[]
}

/**
 * A user-authored link between two annotations (pins), e.g. "make the
 * spacing between these equal". `fromId`/`toId` reference `Annotation.id`;
 * order is not semantically meaningful (an unordered pair). `instruction`
 * must be non-empty — an empty instruction means "don't create this
 * relation" (see `~lib/relations`).
 */
export interface Relation {
  id: number
  fromId: number
  toId: number
  instruction: string
}

/** Stored per URL */
export interface AnnotationStore {
  url: string
  metadata: PageMetadata
  annotations: Annotation[]
  /** Omitted (or empty) means "no relations" — also the legacy shape predating this field. */
  relations?: Relation[]
}

export interface MarkdownInput {
  instruction: string
  pageUrl: string
  pageTitle: string
  frameworkInfo: FrameworkInfo | null
  elementInfo: ElementInfo
  componentInfo: ComponentInfo | null
}

/**
 * Output preset id. `jsonl`/`markdown` are the original full-fidelity
 * formats; `claude-code` wraps the same information in an XML contract used
 * to auto-trigger the tegakari-fix skill; `cursor`/`minimal` are trimmed
 * Markdown variants for token-conscious editors.
 */
export type OutputPreset = "jsonl" | "markdown" | "claude-code" | "cursor" | "minimal"

export interface BatchInput {
  pageUrl: string
  pageTitle: string
  annotations: Annotation[]
  prefix?: string
  metadata?: PageMetadata
  /** Batch-only concept (see `Relation`) — omitted/empty means "no relations". */
  relations?: Relation[]
}

/**
 * Section inclusion/depth knobs used by the Markdown generator to derive the
 * `cursor`/`minimal` presets from the full (`markdown`) output without a
 * second generator. Omitted keys default to the fullest, backward-compatible
 * behavior.
 */
export interface MarkdownSectionOptions {
  /** Page Context fields. "compact" drops batch metadata; "url-only" keeps only the URL. */
  pageContext?: "full" | "compact" | "url-only"
  /** Selected Element fields. "minimal" keeps selector/tag/class/text only. */
  element?: "full" | "minimal"
  /** Component Tree depth. "brief" keeps name (last 3 levels) + source only; "none" omits the section. */
  component?: "full" | "brief" | "none"
}

export interface PrefixRule {
  pattern: string // URL pattern (e.g., "localhost:3000", "example.com") or regex
  prefix: string // Free text prefix (e.g., "[repo=my-app]")
  isRegex?: boolean // If true, pattern is a regex matched against the full URL
}
