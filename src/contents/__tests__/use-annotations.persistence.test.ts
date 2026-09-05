import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, expect, it, vi } from "vitest"

import type { Annotation } from "~lib/types"

import { useAnnotations } from "../use-annotations"

function makeTarget(id: string): HTMLElement {
  const el = document.createElement("div")
  el.id = id
  document.body.appendChild(el)
  return el
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

const STORAGE_KEY = `tegakariAnnotations:${location.href}`

let storage: Record<string, unknown> = {}
const storageSet = vi.fn()

beforeEach(() => {
  document.body.innerHTML = ""
  storage = {}
  storageSet.mockReset()
  storageSet.mockImplementation(async (items: Record<string, unknown>) => {
    Object.assign(storage, items)
  })
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn(async (key: string) => ({ [key]: storage[key] })),
        set: storageSet,
        remove: vi.fn(async () => {}),
      },
    },
    runtime: { sendMessage: vi.fn(async () => ({ success: false })) },
  })
})

it("writes annotations to storage while persistence is on", async () => {
  const { result } = renderHook(() => useAnnotations(true))

  act(() => result.current.addAnnotation(makeTarget("a"), { pageX: 0, pageY: 0 }))

  await waitFor(() => expect(storageSet).toHaveBeenCalled())
  const stored = storage[STORAGE_KEY] as { annotations: Annotation[] }
  expect(stored.annotations).toHaveLength(1)
})

it("keeps annotations in memory only while persistence is off", async () => {
  const { result } = renderHook(() => useAnnotations(false))

  act(() => result.current.addAnnotation(makeTarget("a"), { pageX: 0, pageY: 0 }))

  expect(result.current.annotations).toHaveLength(1)
  await waitFor(() => expect(result.current.annotations[0].screenshot).toBeUndefined())
  expect(storageSet).not.toHaveBeenCalled()
  expect(storage[STORAGE_KEY]).toBeUndefined()
})

it("ignores already-stored annotations while persistence is off, without deleting them", async () => {
  storage[STORAGE_KEY] = {
    url: location.href,
    metadata: null,
    annotations: [storedAnnotation(1)],
    relations: [],
  }
  const { result } = renderHook(() => useAnnotations(false))

  await act(async () => {
    await result.current.loadPersisted()
  })

  expect(result.current.annotations).toEqual([])
  expect(storage[STORAGE_KEY]).toBeDefined()
})

it("restores stored annotations once persistence is back on", async () => {
  storage[STORAGE_KEY] = {
    url: location.href,
    metadata: null,
    annotations: [storedAnnotation(1)],
    relations: [],
  }
  const { result } = renderHook(() => useAnnotations(true))

  await act(async () => {
    await result.current.loadPersisted()
  })

  expect(result.current.annotations.map((a) => a.instruction)).toEqual(["stored 1"])
})
