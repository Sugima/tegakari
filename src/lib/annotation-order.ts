// Annotation numbering & ordering.
//
// An annotation carries two identities:
//   - `id`  … its display number. Always `index + 1` in list order, so the
//             numbers a user sees (pin badge, inbox row, generated output)
//             never contain a gap and always match the list order.
//   - `uid` … a stable identity that survives renumbering. In-flight async
//             updates (screenshot capture, Main-World framework collection)
//             target this, because the `id` they started with may belong to a
//             different annotation by the time they resolve.
//
// `Relation.fromId`/`toId` reference `Annotation.id`, so every renumbering
// remaps them in the same pass — see `normalizeAnnotationOrder`.

import type { Annotation, Relation } from "./types"

let uidCounter = 0

/** Creates a process-unique, collision-resistant annotation identity. */
export function createAnnotationUid(): string {
  uidCounter += 1
  return `a-${Date.now().toString(36)}-${uidCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export interface Renumbered {
  annotations: Annotation[]
  /** Previous `id` → new `id`. Feed it to `remapRelationIds`. */
  idMap: Map<number, number>
}

/**
 * Renumbers annotations to 1..N in list order (filling any gap left by a
 * deletion) and backfills missing `uid`s.
 *
 * Idempotent: renumbering an already-renumbered list returns equal values,
 * which is what makes it safe to run inside a React state updater.
 */
export function renumberAnnotations(annotations: Annotation[]): Renumbered {
  const idMap = new Map<number, number>()
  const renumbered = annotations.map((annotation, index) => {
    const id = index + 1
    idMap.set(annotation.id, id)
    if (annotation.id === id && annotation.uid) return annotation
    return { ...annotation, id, uid: annotation.uid ?? createAnnotationUid() }
  })
  return { annotations: renumbered, idMap }
}

/**
 * Moves relation endpoints onto the renumbered ids. A relation referencing an
 * id the map doesn't know (its annotation is gone) is dropped.
 */
export function remapRelationIds(
  relations: Relation[],
  idMap: Map<number, number>
): Relation[] {
  const remapped: Relation[] = []
  for (const relation of relations) {
    const fromId = idMap.get(relation.fromId)
    const toId = idMap.get(relation.toId)
    if (fromId === undefined || toId === undefined) continue
    if (fromId === relation.fromId && toId === relation.toId) {
      remapped.push(relation)
      continue
    }
    remapped.push({ ...relation, fromId, toId })
  }
  return remapped
}

/** Renumbers annotations and remaps relations in one pass. */
export function normalizeAnnotationOrder(
  annotations: Annotation[],
  relations: Relation[]
): { annotations: Annotation[]; relations: Relation[] } {
  const { annotations: renumbered, idMap } = renumberAnnotations(annotations)
  return { annotations: renumbered, relations: remapRelationIds(relations, idMap) }
}

/**
 * Where the annotation numbered `id` ends up after `moveAnnotation(fromIndex,
 * toIndex)` — index math only, so callers holding an id (the selected pin) can
 * follow the move without consulting the list.
 */
export function idAfterMove(id: number, fromIndex: number, toIndex: number): number {
  const from = fromIndex + 1
  const to = toIndex + 1
  if (id === from) return to
  if (from < to) return id > from && id <= to ? id - 1 : id
  return id >= to && id < from ? id + 1 : id
}

/** Where the annotation numbered `id` ends up after `deletedId` is removed. */
export function idAfterDelete(id: number, deletedId: number): number | null {
  if (id === deletedId) return null
  return id > deletedId ? id - 1 : id
}

/**
 * Moves the annotation at `fromIndex` to `toIndex` (drag-and-drop reorder).
 * Out-of-range or no-op moves return the input array unchanged; the caller
 * renumbers afterwards via `normalizeAnnotationOrder`.
 */
export function moveAnnotation(
  annotations: Annotation[],
  fromIndex: number,
  toIndex: number
): Annotation[] {
  const last = annotations.length - 1
  if (fromIndex < 0 || fromIndex > last || toIndex < 0 || toIndex > last) {
    return annotations
  }
  if (fromIndex === toIndex) return annotations
  const next = [...annotations]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}
