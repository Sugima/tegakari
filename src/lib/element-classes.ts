/**
 * Shared reading of an element's class list. The collector stores `class` as
 * the raw attribute string (see `getAttributes` in `contents/overlay-helpers`),
 * so both the `minimal` preset and the `{{classes}}` template placeholder need
 * the same whitespace-splitting and comma-joining rules.
 */
import type { ElementInfo } from "./types"

/** Individual class names, in source order, with blank runs dropped. */
export function classList(el: ElementInfo): string[] {
  const raw = el.attributes?.class
  if (!raw) return []
  return raw.trim().split(/\s+/).filter(Boolean)
}

/**
 * Class names as a comma-separated list (`"btn, btn-ghost"`), or an empty
 * string when the element carries no classes. Deliberately undecorated: the
 * caller decides whether to wrap it in Markdown code marks.
 */
export function formatClassList(el: ElementInfo): string {
  return classList(el).join(", ")
}
