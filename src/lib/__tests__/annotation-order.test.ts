import { describe, expect, it } from "vitest"

import {
  createAnnotationUid,
  idAfterDelete,
  idAfterMove,
  moveAnnotation,
  normalizeAnnotationOrder,
  remapRelationIds,
  renumberAnnotations,
} from "~lib/annotation-order"
import type { Annotation, Relation } from "~lib/types"

function annotation(id: number, uid?: string): Annotation {
  return {
    id,
    ...(uid ? { uid } : {}),
    elementInfo: { selector: `#e${id}`, tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: 0,
    pageY: 0,
    createdAt: id,
  }
}

function relation(id: number, fromId: number, toId: number): Relation {
  return { id, fromId, toId, instruction: "Align" }
}

describe("renumberAnnotations", () => {
  it("closes gaps left by deletions, numbering 1..N in list order", () => {
    const { annotations, idMap } = renumberAnnotations([
      annotation(1),
      annotation(2),
      annotation(4),
      annotation(5),
      annotation(8),
    ])

    expect(annotations.map((a) => a.id)).toEqual([1, 2, 3, 4, 5])
    expect(idMap.get(4)).toBe(3)
    expect(idMap.get(8)).toBe(5)
  })

  it("backfills a uid and keeps an existing one across renumbering", () => {
    const { annotations } = renumberAnnotations([annotation(3, "keep-me"), annotation(7)])

    expect(annotations[0].uid).toBe("keep-me")
    expect(annotations[1].uid).toBeTypeOf("string")
    expect(annotations[1].uid).not.toBe("keep-me")
  })

  it("is idempotent — renumbering twice changes nothing the second time", () => {
    const once = renumberAnnotations([annotation(2), annotation(9)])
    const twice = renumberAnnotations(once.annotations)

    expect(twice.annotations).toEqual(once.annotations)
    expect(twice.annotations[0]).toBe(once.annotations[0])
  })
})

describe("remapRelationIds", () => {
  it("moves endpoints onto the new numbering", () => {
    const { idMap } = renumberAnnotations([annotation(1), annotation(4), annotation(8)])

    expect(remapRelationIds([relation(1, 4, 8)], idMap)).toEqual([
      { id: 1, fromId: 2, toId: 3, instruction: "Align" },
    ])
  })

  it("drops a relation whose annotation is gone", () => {
    const { idMap } = renumberAnnotations([annotation(1), annotation(2)])

    expect(remapRelationIds([relation(1, 2, 99)], idMap)).toEqual([])
  })
})

describe("normalizeAnnotationOrder", () => {
  it("renumbers and remaps in one pass", () => {
    const result = normalizeAnnotationOrder(
      [annotation(2), annotation(5), annotation(9)],
      [relation(1, 5, 9)]
    )

    expect(result.annotations.map((a) => a.id)).toEqual([1, 2, 3])
    expect(result.relations).toEqual([{ id: 1, fromId: 2, toId: 3, instruction: "Align" }])
  })
})

describe("moveAnnotation", () => {
  const items = [annotation(1), annotation(2), annotation(3), annotation(4)]

  it("moves an item down, shifting the ones it passes up", () => {
    expect(moveAnnotation(items, 0, 2).map((a) => a.id)).toEqual([2, 3, 1, 4])
  })

  it("moves an item up", () => {
    expect(moveAnnotation(items, 3, 1).map((a) => a.id)).toEqual([1, 4, 2, 3])
  })

  it("returns the input untouched for a no-op or out-of-range move", () => {
    expect(moveAnnotation(items, 1, 1)).toBe(items)
    expect(moveAnnotation(items, 0, 9)).toBe(items)
    expect(moveAnnotation(items, -1, 0)).toBe(items)
  })
})

describe("idAfterMove", () => {
  it("follows the dragged item itself", () => {
    expect(idAfterMove(1, 0, 2)).toBe(3)
    expect(idAfterMove(4, 3, 1)).toBe(2)
  })

  it("shifts only the items the move passes over", () => {
    // [1,2,3,4] with 1 dragged to position 3 → [2,3,1,4]
    expect(idAfterMove(2, 0, 2)).toBe(1)
    expect(idAfterMove(3, 0, 2)).toBe(2)
    expect(idAfterMove(4, 0, 2)).toBe(4)
    // [1,2,3,4] with 4 dragged to position 2 → [1,4,2,3]
    expect(idAfterMove(2, 3, 1)).toBe(3)
    expect(idAfterMove(1, 3, 1)).toBe(1)
  })
})

describe("idAfterDelete", () => {
  it("drops the deleted id and pulls later ones down", () => {
    expect(idAfterDelete(2, 2)).toBeNull()
    expect(idAfterDelete(1, 2)).toBe(1)
    expect(idAfterDelete(5, 2)).toBe(4)
  })
})

describe("createAnnotationUid", () => {
  it("never repeats itself", () => {
    const uids = new Set(Array.from({ length: 100 }, createAnnotationUid))
    expect(uids.size).toBe(100)
  })
})
