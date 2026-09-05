import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"

import type { Annotation } from "~lib/types"

import { useAnnotations } from "../use-annotations"

vi.mock("../overlay-helpers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../overlay-helpers")>()
  return {
    ...actual,
    captureScreenshot: vi.fn(async () => "data:image/png;base64,full"),
    cropToElement: vi.fn(async () => "data:image/png;base64,cropped"),
  }
})

function makeTarget(id: string): HTMLElement {
  const el = document.createElement("div")
  el.id = id
  document.body.appendChild(el)
  return el
}

function point(x: number, y: number) {
  return { pageX: x, pageY: y }
}

function storedAnnotation(id: number): Annotation {
  return {
    id,
    elementInfo: { selector: `#stored-${id}`, tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: `stored ${id}`,
    pageX: 0,
    pageY: 0,
    createdAt: id,
  }
}

let saved: Record<string, unknown> = {}

function stubChrome(stored?: unknown) {
  saved = {}
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async () => (stored ? stored : {})),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(saved, items)
        }),
        remove: vi.fn(async () => {}),
      },
    },
    runtime: { sendMessage: vi.fn(async () => ({ success: false })) },
  })
}

beforeEach(() => {
  document.body.innerHTML = ""
  stubChrome()
})

it("numbers a new annotation 1 again after the only one was deleted", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.handleDeleteAnnotation(1))
  act(() => result.current.addAnnotation(makeTarget("b"), point(5, 5)))

  expect(result.current.annotations.map((a) => a.id)).toEqual([1])
  expect(result.current.activeId).toBe(1)
})

it("closes the gap a middle deletion leaves, keeping relations pointing at the same pins", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(1, 1)))
  act(() => result.current.addAnnotation(makeTarget("c"), point(2, 2)))
  act(() => {
    result.current.addRelation(1, 3, "Align these")
  })

  act(() => result.current.handleDeleteAnnotation(2))

  expect(result.current.annotations.map((a) => a.id)).toEqual([1, 2])
  expect(result.current.annotations.map((a) => a.elementInfo.selector)).toEqual([
    "#a",
    "#c",
  ])
  expect(result.current.relations).toEqual([
    { id: 1, fromId: 1, toId: 2, instruction: "Align these" },
  ])
})

it("renumbers after a reorder so the numbers follow the list, moving the selection with it", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(1, 1)))
  act(() => result.current.addAnnotation(makeTarget("c"), point(2, 2)))
  act(() => {
    result.current.addRelation(1, 3, "Align these")
  })
  act(() => result.current.setActiveId(1))

  // Drag the first row onto the last position → [b, c, a]
  act(() => result.current.handleReorderAnnotations(0, 2))

  expect(result.current.annotations.map((a) => a.elementInfo.selector)).toEqual([
    "#b",
    "#c",
    "#a",
  ])
  expect(result.current.annotations.map((a) => a.id)).toEqual([1, 2, 3])
  expect(result.current.activeId).toBe(3)
  expect(result.current.relations).toEqual([
    { id: 1, fromId: 3, toId: 2, instruction: "Align these" },
  ])
})

it("lands a pending screenshot on the annotation it was captured for, even after a renumbering delete", async () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))
  act(() => result.current.addAnnotation(makeTarget("b"), point(1, 1)))
  // Delete #1 while #2's capture is still in flight — #2 becomes #1.
  act(() => result.current.handleDeleteAnnotation(1))

  await waitFor(() => {
    expect(result.current.annotations[0].screenshot).toBe("data:image/png;base64,cropped")
  })
  expect(result.current.annotations).toHaveLength(1)
  expect(result.current.annotations[0].elementInfo.selector).toBe("#b")
})

it("renumbers gappy stored data on load", async () => {
  stubChrome({
    [`tegakariAnnotations:${location.href}`]: {
      url: location.href,
      metadata: null,
      annotations: [storedAnnotation(1), storedAnnotation(2), storedAnnotation(4)],
      relations: [{ id: 1, fromId: 2, toId: 4, instruction: "Align these" }],
    },
  })
  const { result } = renderHook(() => useAnnotations())

  await act(async () => {
    await result.current.loadPersisted()
  })

  expect(result.current.annotations.map((a) => a.id)).toEqual([1, 2, 3])
  expect(result.current.annotations.map((a) => a.instruction)).toEqual([
    "stored 1",
    "stored 2",
    "stored 4",
  ])
  expect(result.current.relations).toEqual([
    { id: 1, fromId: 2, toId: 3, instruction: "Align these" },
  ])
})

it("numbers imported annotations after the existing ones", () => {
  const { result } = renderHook(() => useAnnotations())
  act(() => result.current.addAnnotation(makeTarget("a"), point(0, 0)))

  act(() =>
    result.current.handleImportAnnotations(
      [storedAnnotation(7), storedAnnotation(9)],
      [{ id: 5, fromId: 7, toId: 9, instruction: "Imported link" }]
    )
  )

  expect(result.current.annotations.map((a) => a.id)).toEqual([1, 2, 3])
  expect(result.current.relations).toEqual([
    { id: 1, fromId: 2, toId: 3, instruction: "Imported link" },
  ])
})
