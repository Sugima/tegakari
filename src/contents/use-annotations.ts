import {
  type MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import {
  createAnnotationUid,
  normalizeAnnotationOrder,
  remapRelationIds,
  renumberAnnotations,
} from "~lib/annotation-order"
import {
  collectPageMetadata,
  loadAnnotationStore,
  updateAnnotations,
} from "~lib/annotation-store"
import { generateSelector } from "~lib/selector"
import type { Annotation, CollectResult, PageMetadata, Rect, Relation } from "~lib/types"

import { buildElementInfo, captureScreenshot, cropToElement } from "./overlay-helpers"
import { useAnnotationActions } from "./use-annotation-actions"
import type { AddAnnotationOptions, Point } from "./use-picking"
import { useRelationActions, useRelationState } from "./use-relations"

type Persist = (anns: Annotation[], relations: Relation[]) => Promise<void>
export type Mutate = (
  annTransform: (prev: Annotation[]) => Annotation[],
  relTransform?: (prev: Relation[]) => Relation[]
) => void

/**
 * @param persistEnabled Mirrors the "keep annotations across page reloads"
 *   setting. While it is false nothing is written to or read from
 *   `chrome.storage` — annotations live only in this tab's memory, so a
 *   reload starts empty. Already-stored pages are left untouched.
 */
export function useAnnotations(persistEnabled = true) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [metadata, setMetadata] = useState<PageMetadata | null>(null)
  const pendingUidRef = useRef<string | null>(null)
  const { relations, setRelations, nextRelationIdRef } = useRelationState()

  const persist = usePersist(metadata, persistEnabled)
  const mutate = useMutate({ setAnnotations, setRelations, persist })
  const mutateRelations = useCallback(
    (transform: (prev: Relation[]) => Relation[]) => mutate((a) => a, transform),
    [mutate]
  )
  const loadPersisted = useLoadPersisted({
    setAnnotations,
    setRelations,
    setMetadata,
    nextRelationIdRef,
    persistEnabled,
  })
  const addAnnotation = useAddAnnotation({
    mutate,
    setActiveId,
    pendingUidRef,
    count: annotations.length,
  })
  const actions = useAnnotationActions({
    mutate,
    setAnnotations,
    setRelations,
    setActiveId,
    nextRelationIdRef,
    annotations,
    relations,
  })
  const relationActions = useRelationActions({
    mutateRelations,
    annotations,
    relations,
    nextRelationIdRef,
  })
  useResultListener({ mutate, setMetadata, pendingUidRef })

  return {
    annotations,
    activeId,
    setActiveId,
    metadata,
    setMetadata,
    relations,
    loadPersisted,
    addAnnotation,
    ...actions,
    ...relationActions,
  }
}

function usePersist(metadata: PageMetadata | null, persistEnabled: boolean): Persist {
  return useCallback(
    async (anns: Annotation[], relations: Relation[]) => {
      if (!persistEnabled) return
      const meta = metadata ?? collectPageMetadata(null)
      await updateAnnotations(location.href, { metadata: meta, annotations: anns, relations })
    },
    [metadata, persistEnabled]
  )
}

interface MutateDeps {
  setAnnotations: (updater: (prev: Annotation[]) => Annotation[]) => void
  setRelations: (updater: (prev: Relation[]) => Relation[]) => void
  persist: Persist
}

/**
 * Applies an annotations transform and (optionally) a relations transform
 * together, renumbers the result, then persists both as a single atomic write
 * — this is what makes cross-cutting changes like
 * cascade-delete-on-annotation-delete correct without stale closures or extra
 * ref bookkeeping.
 *
 * Renumbering lives here so every path (add, delete, reorder, import, edit)
 * keeps the "`id` is the 1..N list position" invariant, with relation
 * endpoints remapped through the very same renumbering.
 */
function useMutate({ setAnnotations, setRelations, persist }: MutateDeps): Mutate {
  return useCallback(
    (
      annTransform: (prev: Annotation[]) => Annotation[],
      relTransform: (prev: Relation[]) => Relation[] = (r) => r
    ) => {
      setAnnotations((prevAnn) => {
        const { annotations: updatedAnn, idMap } = renumberAnnotations(
          annTransform(prevAnn)
        )
        setRelations((prevRel) => {
          const updatedRel = remapRelationIds(relTransform(prevRel), idMap)
          persist(updatedAnn, updatedRel)
          return updatedRel
        })
        return updatedAnn
      })
    },
    [setAnnotations, setRelations, persist]
  )
}

interface LoadPersistedDeps {
  setAnnotations: (anns: Annotation[]) => void
  setRelations: (rels: Relation[]) => void
  setMetadata: (meta: PageMetadata | null) => void
  nextRelationIdRef: MutableRefObject<number>
  persistEnabled: boolean
}

function useLoadPersisted({
  setAnnotations,
  setRelations,
  setMetadata,
  nextRelationIdRef,
  persistEnabled,
}: LoadPersistedDeps) {
  return useCallback(async () => {
    if (!persistEnabled) return
    const store = await loadAnnotationStore(location.href)
    if (store && store.annotations.length > 0) {
      // Data stored before renumbering existed can carry gaps (1, 2, 4, …);
      // normalizing on load is what closes them.
      const normalized = normalizeAnnotationOrder(
        store.annotations,
        store.relations ?? []
      )
      setAnnotations(normalized.annotations)
      setMetadata(store.metadata)
      setRelations(normalized.relations)
      nextRelationIdRef.current =
        normalized.relations.length > 0
          ? Math.max(...normalized.relations.map((r) => r.id)) + 1
          : 1
    }
  }, [setAnnotations, setRelations, setMetadata, nextRelationIdRef, persistEnabled])
}

interface AddDeps {
  mutate: Mutate
  setActiveId: (id: number) => void
  pendingUidRef: MutableRefObject<string | null>
  /** Current annotation count — a new pin is appended, so its id is count + 1. */
  count: number
}

function useAddAnnotation({ mutate, setActiveId, pendingUidRef, count }: AddDeps) {
  return useCallback(
    (target: Element, point: Point, options?: AddAnnotationOptions) => {
      const info = buildElementInfo(target, generateSelector(target))
      const uid = createAnnotationUid()
      const id = count + 1
      // For elements inside an iframe the caller passes a rect already
      // translated to top-viewport coords (matches the captured screenshot).
      const boundingRect = options?.viewportRect ?? target.getBoundingClientRect()
      const annotation: Annotation = {
        id,
        uid,
        elementInfo: info,
        frameworkInfo: null,
        componentInfo: null,
        instruction: "",
        pageX: point.pageX,
        pageY: point.pageY,
        createdAt: Date.now(),
      }
      mutate((prev) => [...prev, annotation])
      setActiveId(id)
      attachScreenshot(uid, boundingRect, mutate)

      // Main-World framework collection is not injected inside iframes, so skip
      // the round-trip for iframe elements (frameworkInfo stays null).
      if (options?.skipFramework) return
      pendingUidRef.current = uid
      window.postMessage(
        { type: "TEGAKARI_COLLECT", selector: info.selector },
        "*"
      )
    },
    [mutate, setActiveId, pendingUidRef, count]
  )
}

// Targets `uid`, not `id`: a delete or a reorder while the capture is in
// flight renumbers the list, and the id this started with would then land on
// somebody else's pin.
function attachScreenshot(uid: string, rect: Rect, mutate: Mutate) {
  captureScreenshot().then(async (full) => {
    if (!full) return
    const cropped = await cropToElement(full, rect)
    mutate((prev) =>
      prev.map((a) => (a.uid === uid ? { ...a, screenshot: cropped } : a))
    )
  })
}

interface ResultDeps {
  mutate: Mutate
  setMetadata: (updater: (prev: PageMetadata | null) => PageMetadata | null) => void
  pendingUidRef: MutableRefObject<string | null>
}

function useResultListener({ mutate, setMetadata, pendingUidRef }: ResultDeps) {
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.source !== window) return
      if (event.data?.type !== "TEGAKARI_RESULT") return
      const result = event.data as CollectResult
      const pendingUid = pendingUidRef.current
      if (pendingUid === null) return
      pendingUidRef.current = null

      mutate((prev) =>
        prev.map((a) =>
          a.uid === pendingUid
            ? { ...a, frameworkInfo: result.framework, componentInfo: result.component }
            : a
        )
      )
      if (result.framework) {
        setMetadata((m) => (m ? { ...m, frameworkInfo: result.framework } : m))
      }
    }
    window.addEventListener("message", handler)
    return () => window.removeEventListener("message", handler)
  }, [mutate, setMetadata, pendingUidRef])
}
