import { useCallback, useEffect, useRef, useState } from "react"

import { collectPageMetadata } from "~lib/annotation-store"
import {
  IFRAME_SELECTION_KEY,
  loadIframeSelection,
  loadPersistAnnotations,
  PERSIST_ANNOTATIONS_KEY,
} from "~lib/settings"
import { type ThemeMode, darkTheme, lightTheme } from "~lib/theme"
import type { PageMetadata } from "~lib/types"

import { isFromPlasmoUI } from "./overlay-helpers"
import { useAnnotations } from "./use-annotations"
import { useLinkMode } from "./use-link-mode"
import { type AddAnnotation, usePicking } from "./use-picking"

export function useOverlay() {
  const [isActive, setIsActive] = useState(false)
  const themeState = useOverlayTheme()
  const iframeEnabled = useIframeSelection()
  const persistEnabled = usePersistAnnotations()
  const ann = useAnnotations(persistEnabled)
  const picking = usePicking(isActive, iframeEnabled, ann.addAnnotation)
  const linkMode = useLinkMode()
  const [activeRelationId, setActiveRelationId] = useState<number | null>(null)

  const activate = useCallback(async () => {
    setIsActive(true)
    await ann.loadPersisted()
    ann.setMetadata(collectPageMetadata(null))
  }, [ann.loadPersisted, ann.setMetadata])

  useCrosshairCursor(isActive)
  useToggle(setIsActive, ann.loadPersisted, ann.setMetadata)
  useContextSelect(isActive, activate, ann.addAnnotation)
  useScrollTick(isActive, ann.annotations.length)

  const close = useCallback(() => {
    setIsActive(false)
    picking.clearHover()
    ann.setActiveId(null)
    setActiveRelationId(null)
    linkMode.cancelLink()
    linkMode.cancelPending()
  }, [picking.clearHover, ann.setActiveId, linkMode.cancelLink, linkMode.cancelPending])

  useEscape({
    isActive,
    count: ann.annotations.length,
    activeId: ann.activeId,
    setActiveId: ann.setActiveId,
    activeRelationId,
    setActiveRelationId,
    onClose: close,
  })

  return {
    isActive,
    ann,
    picking,
    close,
    linkMode,
    activeRelationId,
    setActiveRelationId,
    ...themeState,
  }
}

function useOverlayTheme() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark")

  useEffect(() => {
    chrome.storage.local.get("tegakariTheme", (result) => {
      if (result.tegakariTheme === "light" || result.tegakariTheme === "dark") {
        setThemeMode(result.tegakariTheme)
      }
    })
  }, [])

  const toggleMode = useCallback(() => {
    setThemeMode((m) => {
      const next = m === "dark" ? "light" : "dark"
      chrome.storage.local.set({ tegakariTheme: next })
      return next
    })
  }, [])

  const theme = themeMode === "dark" ? darkTheme : lightTheme
  return { theme, themeMode, toggleMode }
}

// Reads the persisted "select inside same-origin iframes" flag and keeps it in
// sync with changes made from the options page.
function useIframeSelection(): boolean {
  return useStoredFlag(IFRAME_SELECTION_KEY, false, loadIframeSelection)
}

// Reads the "keep annotations across page reloads" flag, kept in sync with the
// options page. Defaults to true — see `loadPersistAnnotations`.
function usePersistAnnotations(): boolean {
  return useStoredFlag(PERSIST_ANNOTATIONS_KEY, true, loadPersistAnnotations)
}

/** A boolean setting in `chrome.storage.local`, live-synced with the options page. */
function useStoredFlag(
  key: string,
  fallback: boolean,
  load: () => Promise<boolean>
): boolean {
  const [enabled, setEnabled] = useState(fallback)

  useEffect(() => {
    load().then(setEnabled)
    const onChanged = (changes: {
      [key: string]: chrome.storage.StorageChange
    }) => {
      if (!(key in changes)) return
      const next = changes[key].newValue
      setEnabled(typeof next === "boolean" ? next : fallback)
    }
    chrome.storage.onChanged.addListener(onChanged)
    return () => chrome.storage.onChanged.removeListener(onChanged)
  }, [key, fallback, load])

  return enabled
}

function useCrosshairCursor(isActive: boolean) {
  const cursorStyleRef = useRef<HTMLStyleElement | null>(null)

  useEffect(() => {
    if (isActive) {
      const style = document.createElement("style")
      style.id = "tegakari-cursor"
      style.textContent = "* { cursor: crosshair !important; }"
      document.head.appendChild(style)
      cursorStyleRef.current = style
    } else {
      cursorStyleRef.current?.remove()
      cursorStyleRef.current = null
    }
    return () => {
      cursorStyleRef.current?.remove()
      cursorStyleRef.current = null
    }
  }, [isActive])
}

function useToggle(
  setIsActive: (updater: (prev: boolean) => boolean) => void,
  loadPersisted: () => void,
  setMetadata: (meta: PageMetadata | null) => void
) {
  useEffect(() => {
    const handler = (message: { type?: string }) => {
      if (message?.type !== "TEGAKARI_TOGGLE") return
      setIsActive((prev) => {
        if (!prev) {
          loadPersisted()
          setMetadata(collectPageMetadata(null))
        }
        return !prev
      })
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [setIsActive, loadPersisted, setMetadata])
}

// Right-click → "tegakari: この要素を選択" (#37). The contextmenu listener runs
// even while the overlay is inactive, recording the last right-clicked element;
// when the menu item fires, the element is annotated (activating first if
// needed). Top frame only — right-clicks inside an iframe fire in the iframe
// document, which this top-frame listener doesn't observe.
function useContextSelect(
  isActive: boolean,
  activate: () => Promise<void>,
  addAnnotation: AddAnnotation
) {
  const lastRef = useRef<{ el: Element; pageX: number; pageY: number } | null>(
    null
  )
  const isActiveRef = useRef(isActive)

  useEffect(() => {
    isActiveRef.current = isActive
  }, [isActive])

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      if (isFromPlasmoUI(e)) return
      lastRef.current = { el: e.target as Element, pageX: e.pageX, pageY: e.pageY }
    }
    document.addEventListener("contextmenu", onContext, true)

    const onMessage = (msg: { type?: string }) => {
      if (msg?.type !== "TEGAKARI_CONTEXT_SELECT") return
      const last = lastRef.current
      if (!last) return
      const point = { pageX: last.pageX, pageY: last.pageY }
      const opts = { skipFramework: last.el.ownerDocument !== document }
      if (isActiveRef.current) {
        addAnnotation(last.el, point, opts)
      } else {
        // Load persisted annotations first so the new one isn't overwritten.
        activate().then(() => addAnnotation(last.el, point, opts))
      }
    }
    chrome.runtime.onMessage.addListener(onMessage)

    return () => {
      document.removeEventListener("contextmenu", onContext, true)
      chrome.runtime.onMessage.removeListener(onMessage)
    }
  }, [activate, addAnnotation])
}

function useScrollTick(isActive: boolean, count: number) {
  const [, setScrollTick] = useState(0)

  useEffect(() => {
    if (!isActive && count === 0) return
    const onScroll = () => setScrollTick((t) => t + 1)
    window.addEventListener("scroll", onScroll, { passive: true, capture: true })
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true })
      window.removeEventListener("resize", onScroll)
    }
  }, [isActive, count])
}

interface EscapeArgs {
  isActive: boolean
  count: number
  activeId: number | null
  setActiveId: (id: number | null) => void
  activeRelationId: number | null
  setActiveRelationId: (id: number | null) => void
  onClose: () => void
}

// Bubble-phase, so use-link-mode.ts's own capture-phase Escape handler (for
// link mode / a pending relation form) always wins when both are active.
function useEscape({
  isActive,
  count,
  activeId,
  setActiveId,
  activeRelationId,
  setActiveRelationId,
  onClose,
}: EscapeArgs) {
  useEffect(() => {
    if (!isActive && count === 0) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      if (activeRelationId !== null) setActiveRelationId(null)
      else if (activeId !== null) setActiveId(null)
      else onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isActive, count, activeId, setActiveId, activeRelationId, setActiveRelationId, onClose])
}
