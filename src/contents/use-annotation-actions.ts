import { type MutableRefObject, useCallback } from "react"

import {
  createAnnotationUid,
  idAfterDelete,
  idAfterMove,
  moveAnnotation,
} from "~lib/annotation-order"
import { clearAllAnnotations } from "~lib/annotation-store"
import { cascadeDeleteRelations } from "~lib/relations"
import { revertAnnotationStylePreview } from "~lib/style-preview"
import type { Annotation, Relation, StyleDelta } from "~lib/types"

import type { Mutate } from "./use-annotations"
import { buildImportedRelations } from "./use-relations"

/** Payload for `handleUpdateInstruction`: the pin popover's full editable state, saved atomically. */
export interface AnnotationEditPayload {
  instruction: string
  tags?: string[]
  styleDelta?: StyleDelta[]
}

function nonEmpty<T>(arr: T[] | undefined): T[] | undefined {
  return arr && arr.length > 0 ? arr : undefined
}

function applyEditPayload(a: Annotation, payload: AnnotationEditPayload): Annotation {
  return {
    ...a,
    instruction: payload.instruction,
    tags: nonEmpty(payload.tags),
    styleDelta: nonEmpty(payload.styleDelta),
  }
}

interface ActionDeps {
  mutate: Mutate
  setAnnotations: (anns: Annotation[]) => void
  setRelations: (rels: Relation[]) => void
  setActiveId: (updater: (prev: number | null) => number | null) => void
  nextRelationIdRef: MutableRefObject<number>
  annotations: Annotation[]
  relations: Relation[]
}

export function useAnnotationActions({
  mutate,
  setAnnotations,
  setRelations,
  setActiveId,
  nextRelationIdRef,
  annotations,
  relations,
}: ActionDeps) {
  const handleUpdateInstruction = useCallback(
    (id: number, payload: AnnotationEditPayload) => {
      mutate((prev) => prev.map((a) => (a.id === id ? applyEditPayload(a, payload) : a)))
    },
    [mutate]
  )

  const handleDeleteAnnotation = useCallback(
    (id: number) => {
      const target = annotations.find((a) => a.id === id)
      if (target) revertAnnotationStylePreview(target)
      // `mutate` renumbers what's left to 1..N, so the ids the rest of the UI
      // holds move down with it (see `~lib/annotation-order`).
      mutate(
        (prev) => prev.filter((a) => a.id !== id),
        (prev) => cascadeDeleteRelations(prev, id)
      )
      setActiveId((prev) => (prev === null ? null : idAfterDelete(prev, id)))
    },
    [mutate, setActiveId, annotations]
  )

  const handleReorderAnnotations = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      mutate((prev) => moveAnnotation(prev, fromIndex, toIndex))
      setActiveId((prev) => (prev === null ? null : idAfterMove(prev, fromIndex, toIndex)))
    },
    [mutate, setActiveId]
  )

  const handleClearAll = useCallback(async () => {
    for (const a of annotations) revertAnnotationStylePreview(a)
    setAnnotations([])
    setRelations([])
    setActiveId(() => null)
    nextRelationIdRef.current = 1
    await clearAllAnnotations(location.href)
  }, [setAnnotations, setRelations, setActiveId, nextRelationIdRef, annotations])

  const handleImportAnnotations = useImportAnnotations({
    mutate,
    relations,
    nextRelationIdRef,
  })

  return {
    handleUpdateInstruction,
    handleDeleteAnnotation,
    handleReorderAnnotations,
    handleClearAll,
    handleImportAnnotations,
  }
}

interface ImportDeps {
  mutate: Mutate
  relations: Relation[]
  nextRelationIdRef: MutableRefObject<number>
}

function useImportAnnotations({ mutate, relations, nextRelationIdRef }: ImportDeps) {
  // Append imported annotations and any relations among them. Imported ids are
  // first staged as negatives — they cannot collide with the existing (always
  // positive) ids, which keeps the relation remapping unambiguous — and
  // `mutate` then renumbers the whole list into 1..N.
  return useCallback(
    (imported: Annotation[], importedRelations: Relation[] = []) => {
      const idMap = new Map<number, number>()
      const renumbered = imported.map((a, index) => {
        const stagedId = -(index + 1)
        idMap.set(a.id, stagedId)
        return { ...a, id: stagedId, uid: a.uid ?? createAnnotationUid() }
      })
      const remapped = buildImportedRelations({
        importedRelations,
        idMap,
        existingRelations: relations,
        nextRelationIdRef,
      })
      mutate(
        (prev) => [...prev, ...renumbered],
        (prev) => [...prev, ...remapped]
      )
    },
    [mutate, relations, nextRelationIdRef]
  )
}
