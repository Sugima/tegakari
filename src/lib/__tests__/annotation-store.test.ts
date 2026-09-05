import { beforeEach, expect, it, vi } from "vitest"

import type { Annotation, AnnotationStore, PageMetadata } from "../types"
import {
  clearAllAnnotations,
  clearAllStoredAnnotations,
  countStoredAnnotationPages,
  collectPageMetadata,
  loadAnnotationStore,
  saveAnnotationStore,
  updateAnnotations,
} from "../annotation-store"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}
const storageGet = vi.fn()
const storageSet = vi.fn()
const storageRemove = vi.fn()

const metadata: PageMetadata = {
  url: "https://example.com/page#hash",
  title: "Example",
  viewport: { width: 1280, height: 720 },
  userAgent: "vitest",
  language: "ja",
  timestamp: 1,
  frameworkInfo: null,
}

function annotation(id: number) {
  return {
    id,
    elementInfo: {
      selector: `#item-${id}`,
      tag: "button",
      text: `Item ${id}`,
      attributes: {},
    },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: id,
    pageY: id,
    createdAt: id,
  } satisfies Annotation
}

function storageKey(url: string) {
  const parsed = new URL(url)
  parsed.hash = ""
  return `tegakariAnnotations:${parsed.toString()}`
}

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  storageGet.mockImplementation(async (key: string | null) =>
    key === null ? { ...storage } : { [key]: storage[key] }
  )
  storageSet.mockImplementation(async (value: StorageRecord) => {
    Object.assign(storage, value)
  })
  storageRemove.mockImplementation(async (key: string | string[]) => {
    for (const k of Array.isArray(key) ? key : [key]) delete storage[k]
  })

  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: storageGet,
        set: storageSet,
        remove: storageRemove,
      },
    },
  })
})

it("annotation-store: saves and loads a store using a normalized URL key", async () => {
  const store: AnnotationStore = {
    url: metadata.url,
    metadata,
    annotations: [annotation(1)],
  }

  await saveAnnotationStore(store)

  expect(storage[storageKey(metadata.url)]).toEqual(store)
  await expect(loadAnnotationStore(metadata.url)).resolves.toEqual(store)
  await expect(
    loadAnnotationStore("https://example.com/page#other")
  ).resolves.toEqual(store)
})

it("annotation-store: limits saved annotations to the newest 50, keeping list order", async () => {
  // Reverse order: the list is ordered manually (see `~lib/annotation-order`),
  // so trimming must drop the oldest without re-sorting what's left.
  const annotations = Array.from({ length: 55 }, (_, idx) =>
    annotation(55 - idx)
  )
  await saveAnnotationStore({ url: metadata.url, metadata, annotations })

  const saved = storage[storageKey(metadata.url)] as AnnotationStore
  expect(saved.annotations).toHaveLength(50)
  expect(saved.annotations[0].id).toBe(55)
  expect(saved.annotations.at(-1)?.id).toBe(6)
})

it("annotation-store: updates and clears annotations", async () => {
  await updateAnnotations(metadata.url, {
    metadata,
    annotations: [annotation(1), annotation(2)],
  })

  const saved = storage[storageKey(metadata.url)] as AnnotationStore
  expect(saved.annotations.map((item) => item.id)).toEqual([1, 2])
  expect(saved.relations).toEqual([])

  await clearAllAnnotations(metadata.url)
  expect(storage[storageKey(metadata.url)]).toBeUndefined()
})

it("annotation-store: returns null and swallows storage errors", async () => {
  storageGet.mockRejectedValueOnce(new Error("boom"))
  storageSet.mockRejectedValueOnce(new Error("boom"))
  storageRemove.mockRejectedValueOnce(new Error("boom"))

  await expect(loadAnnotationStore("not a url")).resolves.toBeNull()
  await expect(
    saveAnnotationStore({ url: "not a url", metadata, annotations: [] })
  ).resolves.toBeUndefined()
  await expect(clearAllAnnotations("not a url")).resolves.toBeUndefined()
})

it("annotation-store: uses the raw URL when URL parsing fails", async () => {
  const store = {
    url: "not a url",
    metadata,
    annotations: [annotation(1)],
  }

  await saveAnnotationStore(store)

  expect(storage["tegakariAnnotations:not a url"]).toEqual(store)
  await expect(loadAnnotationStore("not a url")).resolves.toEqual(store)
})

it("annotation-store: loads legacy data saved before the tags field existed", async () => {
  // Simulates a store persisted by an older version of the extension, where
  // annotations never had a `tags` key at all.
  const legacyAnnotation = annotation(1)
  const key = storageKey(metadata.url)
  storage[key] = { url: metadata.url, metadata, annotations: [legacyAnnotation] }

  const loaded = await loadAnnotationStore(metadata.url)

  expect(loaded?.annotations[0].tags).toBeUndefined()
})

it("annotation-store: loads legacy data saved before the styleDelta field existed", async () => {
  // Simulates a store persisted by an older version of the extension, where
  // annotations never had a `styleDelta` key at all.
  const legacyAnnotation = annotation(1)
  const key = storageKey(metadata.url)
  storage[key] = { url: metadata.url, metadata, annotations: [legacyAnnotation] }

  const loaded = await loadAnnotationStore(metadata.url)

  expect(loaded?.annotations[0].styleDelta).toBeUndefined()
})

it("annotation-store: collects page metadata from browser globals", () => {
  vi.setSystemTime(12345)
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 800,
  })
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 600,
  })
  Object.defineProperty(navigator, "language", {
    configurable: true,
    value: "ja-JP",
  })

  const frameworkInfo = { framework: "React", metaFramework: "Next.js" }
  const collected = collectPageMetadata(frameworkInfo)

  expect(collected).toMatchObject({
    url: location.href,
    title: document.title,
    viewport: { width: 800, height: 600 },
    language: "ja-JP",
    timestamp: 12345,
    frameworkInfo,
  })
})

it("annotation-store: counts and clears every page's stored annotations, leaving other settings alone", async () => {
  await saveAnnotationStore({ url: "https://a.example/x", metadata, annotations: [annotation(1)] })
  await saveAnnotationStore({ url: "https://b.example/y", metadata, annotations: [annotation(1)] })
  storage.tegakariPrefixRules = [{ pattern: "a.example", prefix: "[repo=a]" }]

  await expect(countStoredAnnotationPages()).resolves.toBe(2)
  await expect(clearAllStoredAnnotations()).resolves.toBe(2)

  await expect(countStoredAnnotationPages()).resolves.toBe(0)
  expect(storage.tegakariPrefixRules).toEqual([
    { pattern: "a.example", prefix: "[repo=a]" },
  ])
})

it("annotation-store: clearing when nothing is stored reports zero", async () => {
  await expect(clearAllStoredAnnotations()).resolves.toBe(0)
})
