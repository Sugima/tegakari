import { act, renderHook } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"

import type { Annotation, Relation } from "~lib/types"

import { useAnnotations } from "../use-annotations"

function makeTarget(id: string): HTMLElement {
  const el = document.createElement("div")
  el.id = id
  document.body.appendChild(el)
  return el
}

function point(x: number, y: number) {
  return { pageX: x, pageY: y }
}

function importedAnnotation(id: number): Annotation {
  return {
    id,
    elementInfo: { selector: `#imported-${id}`, tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
  }
}

beforeEach(() => {
  document.body.innerHTML = ""
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => {}),
        remove: vi.fn(async () => {}),
      },
    },
    runtime: {
      sendMessage: vi.fn(async () => ({ success: false })),
    },
  })
})

it("useAnnotations: addRelation links two existing pins", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(10, 10)))
  const [a, b] = result.current.annotations

  let success: boolean | undefined
  act(() => {
    success = result.current.addRelation(a.id, b.id, "Align these")
  })

  expect(success).toBe(true)
  expect(result.current.relations).toEqual([
    { id: 1, fromId: a.id, toId: b.id, instruction: "Align these" },
  ])
})

it("useAnnotations: addRelation rejects a self-loop, a nonexistent pin, an empty instruction, and a duplicate pair", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(10, 10)))
  const [a, b] = result.current.annotations

  act(() => {
    expect(result.current.addRelation(a.id, a.id, "Self")).toBe(false)
    expect(result.current.addRelation(a.id, 999, "Dangling")).toBe(false)
    expect(result.current.addRelation(a.id, b.id, "   ")).toBe(false)
  })
  expect(result.current.relations).toEqual([])

  act(() => result.current.addRelation(a.id, b.id, "First"))
  act(() => {
    expect(result.current.addRelation(b.id, a.id, "Duplicate, reversed")).toBe(false)
  })
  expect(result.current.relations).toHaveLength(1)
})

it("useAnnotations: updateRelationInstruction edits the text; an empty edit is a no-op", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(10, 10)))
  const [a, b] = result.current.annotations
  act(() => result.current.addRelation(a.id, b.id, "Old"))
  const relationId = result.current.relations[0].id

  act(() => result.current.updateRelationInstruction(relationId, "New"))
  expect(result.current.relations[0].instruction).toBe("New")

  act(() => result.current.updateRelationInstruction(relationId, "   "))
  expect(result.current.relations[0].instruction).toBe("New")
})

it("useAnnotations: deleteRelation removes it", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(10, 10)))
  const [a, b] = result.current.annotations
  act(() => result.current.addRelation(a.id, b.id, "Link"))
  const relationId = result.current.relations[0].id

  act(() => result.current.deleteRelation(relationId))
  expect(result.current.relations).toEqual([])
})

it("useAnnotations: deleting an annotation cascades to its relations", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(10, 10)))
  act(() => result.current.addAnnotation(makeTarget("c"), point(20, 20)))
  const [a, b, c] = result.current.annotations
  act(() => result.current.addRelation(a.id, b.id, "a-b"))
  act(() => result.current.addRelation(b.id, c.id, "b-c"))

  act(() => result.current.handleDeleteAnnotation(b.id))

  // What's left is renumbered to 1..N (see `~lib/annotation-order`), so `c`
  // takes over `b`'s number.
  expect(result.current.annotations.map((x) => x.elementInfo.selector)).toEqual([
    a.elementInfo.selector,
    c.elementInfo.selector,
  ])
  expect(result.current.annotations.map((x) => x.id)).toEqual([1, 2])
  expect(result.current.relations).toEqual([])
})

it("useAnnotations: handleClearAll clears both annotations and relations", async () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(10, 10)))
  const [a, b] = result.current.annotations
  act(() => result.current.addRelation(a.id, b.id, "Link"))

  await act(async () => {
    await result.current.handleClearAll()
  })

  expect(result.current.annotations).toEqual([])
  expect(result.current.relations).toEqual([])
})

it("useAnnotations: handleImportAnnotations remaps imported relations through the id-renumbering map", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("existing"), point(0, 0)))

  const imported = [importedAnnotation(1), importedAnnotation(2)]
  const importedRelations: Relation[] = [
    { id: 1, fromId: 1, toId: 2, instruction: "Linked on import" },
  ]

  act(() => result.current.handleImportAnnotations(imported, importedRelations))

  expect(result.current.annotations).toHaveLength(3)
  const [, importedA, importedB] = result.current.annotations
  expect(result.current.relations).toEqual([
    { id: 1, fromId: importedA.id, toId: importedB.id, instruction: "Linked on import" },
  ])
})
