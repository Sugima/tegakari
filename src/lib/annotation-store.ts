import type { AnnotationStore, PageMetadata } from "./types"

const STORAGE_PREFIX = "tegakariAnnotations:"
const MAX_ANNOTATIONS = 50

/** Normalize URL to use as storage key (strip hash) */
function storageKey(url: string): string {
  try {
    const u = new URL(url)
    u.hash = ""
    return `${STORAGE_PREFIX}${u.toString()}`
  } catch {
    return `${STORAGE_PREFIX}${url}`
  }
}

export async function loadAnnotationStore(
  url: string
): Promise<AnnotationStore | null> {
  try {
    const key = storageKey(url)
    const result = await chrome.storage.local.get(key)
    return result[key] ?? null
  } catch {
    return null
  }
}

export async function saveAnnotationStore(
  store: AnnotationStore
): Promise<void> {
  try {
    const key = storageKey(store.url)
    // Enforce max limit — drop the oldest, keeping the user's list order
    // (annotations are ordered manually, see `~lib/annotation-order`).
    if (store.annotations.length > MAX_ANNOTATIONS) {
      const dropped = new Set(
        [...store.annotations]
          .sort((a, b) => a.createdAt - b.createdAt)
          .slice(0, store.annotations.length - MAX_ANNOTATIONS)
      )
      store.annotations = store.annotations.filter((a) => !dropped.has(a))
    }
    await chrome.storage.local.set({ [key]: store })
  } catch {
    // silently fail
  }
}

export async function updateAnnotations(
  url: string,
  data: Pick<AnnotationStore, "metadata" | "annotations" | "relations">
): Promise<void> {
  await saveAnnotationStore({ url, ...data, relations: data.relations ?? [] })
}

export async function clearAllAnnotations(url: string): Promise<void> {
  try {
    const key = storageKey(url)
    await chrome.storage.local.remove(key)
  } catch {
    // silently fail
  }
}

/**
 * `chrome.storage.local.get(null)` returns every stored item, a form the
 * bundled typings don't model.
 */
async function readAllStorage(): Promise<Record<string, unknown>> {
  const getAll = chrome.storage.local.get as unknown as (
    keys: null
  ) => Promise<Record<string, unknown>>
  return getAll(null)
}

function annotationKeys(all: Record<string, unknown>): string[] {
  return Object.keys(all).filter((key) => key.startsWith(STORAGE_PREFIX))
}

/**
 * Deletes every page's stored annotations (all URLs), returning how many
 * pages were dropped. Used by the Options page's explicit "delete all"
 * action — nothing else clears storage wholesale.
 */
export async function clearAllStoredAnnotations(): Promise<number> {
  try {
    const keys = annotationKeys(await readAllStorage())
    if (keys.length > 0) await chrome.storage.local.remove(keys)
    return keys.length
  } catch {
    return 0
  }
}

/** How many pages currently have stored annotations. */
export async function countStoredAnnotationPages(): Promise<number> {
  try {
    return annotationKeys(await readAllStorage()).length
  } catch {
    return 0
  }
}

export function collectPageMetadata(
  frameworkInfo: import("./types").FrameworkInfo | null
): PageMetadata {
  return {
    url: location.href,
    title: document.title,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    userAgent: navigator.userAgent,
    language: navigator.language,
    timestamp: Date.now(),
    frameworkInfo,
  }
}
