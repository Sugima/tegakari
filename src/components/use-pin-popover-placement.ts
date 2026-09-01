import { type CSSProperties, useLayoutEffect, useRef, useState } from "react"

import { popoverStyle } from "./annotation-pin-styles"

interface Point {
  x: number
  y: number
}

/**
 * Places a pin's popover from its *measured* height rather than a guess.
 *
 * The height is not knowable up front — it depends on whether a screenshot was
 * captured, how many chip rows wrap, and whether the style panel is expanded —
 * so the popover is laid out once with an estimate, measured, and re-placed on
 * the same frame (`useLayoutEffect` runs before paint, so no visible jump). A
 * `ResizeObserver` keeps it placed as the content grows, e.g. when "Adjust
 * styles" is opened.
 *
 * Attach `ref` to the popover element and spread `style` onto it. `active`
 * mirrors whether the popover is currently rendered — the element only exists
 * while the pin is selected, so measuring has to start when it appears and the
 * stale height has to be dropped when it goes away.
 */
export function usePinPopoverPlacement(pos: Point, active: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!active) {
      setHeight(null)
      return
    }
    const el = ref.current
    if (!el) return

    // `popoverStyle` caps the popover at the viewport height, so the measured
    // value settles instead of feeding itself a bigger number each pass.
    const measure = () => {
      const next = el.offsetHeight
      setHeight((prev) => (prev === next ? prev : next))
    }
    measure()

    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [active])

  return { ref, style: popoverStyle(pos, height) }
}
