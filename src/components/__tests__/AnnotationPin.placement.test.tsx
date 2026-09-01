/**
 * The popover's height isn't knowable before layout (screenshot, wrapped chip
 * rows, expanded style panel), so it is measured and re-placed before paint.
 * jsdom reports 0 for every offsetHeight, so the measurement is stubbed here to
 * drive the real placement path.
 */
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import type { Annotation } from "~lib/types"

import AnnotationPin from "../AnnotationPin"

const POPOVER_HEIGHT = 400

const originalWidth = window.innerWidth
const originalHeight = window.innerHeight
let restoreOffsetHeight: (() => void) | null = null

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true })
  Object.defineProperty(window, "innerHeight", {
    value: height,
    writable: true,
  })
}

function stubOffsetHeight(value: number) {
  // jsdom implements offsetHeight on the prototype (always 0), so the original
  // descriptor is always there to put back.
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetHeight"
  )
  if (!original) throw new Error("offsetHeight descriptor not found")
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get: () => value,
  })
  restoreOffsetHeight = () => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", original)
  }
}

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: { selector: "#target", tag: "div", text: "", attributes: {} },
    frameworkInfo: null,
    componentInfo: null,
    instruction: "",
    pageX: 100,
    pageY: 100,
    createdAt: 0,
    ...overrides,
  }
}

function renderPin(annotation: Annotation) {
  render(
    <AnnotationPin
      annotation={annotation}
      isActive={true}
      onClick={vi.fn()}
      onUpdateInstruction={vi.fn()}
      onDelete={vi.fn()}
      onDeselect={vi.fn()}
      onStartLink={vi.fn()}
    />
  )
  return screen.getByTestId("tegakari-popover-1")
}

beforeEach(() => stubOffsetHeight(POPOVER_HEIGHT))

afterEach(() => {
  cleanup()
  restoreOffsetHeight?.()
  restoreOffsetHeight = null
  setViewport(originalWidth, originalHeight)
})

it("AnnotationPin: opens the popover below the pin when the measured height fits", () => {
  setViewport(1200, 900)
  const popover = renderPin(makeAnnotation({ pageY: 100 }))
  expect(popover.style.top).toBe("128px")
})

it("AnnotationPin: flips the popover above a pin near the bottom edge", () => {
  setViewport(1200, 900)
  const popover = renderPin(makeAnnotation({ pageY: 700 }))
  // Placed from the measured 400px, not the pre-measurement estimate.
  expect(popover.style.top).toBe("292px")
})

it("AnnotationPin: keeps the whole popover on screen in a short viewport", () => {
  setViewport(1200, 420)
  const popover = renderPin(makeAnnotation({ pageY: 200 }))

  const top = Number.parseInt(popover.style.top, 10)
  const maxHeight = Number.parseInt(popover.style.maxHeight, 10)
  expect(top).toBeGreaterThanOrEqual(0)
  expect(top + Math.min(POPOVER_HEIGHT, maxHeight)).toBeLessThanOrEqual(420)
  expect(popover.style.overflowY).toBe("auto")
})

it("AnnotationPin: accounts for page scroll when placing the popover", () => {
  setViewport(1200, 900)
  Object.defineProperty(window, "scrollY", { value: 500, writable: true })
  const popover = renderPin(makeAnnotation({ pageY: 600 }))
  Object.defineProperty(window, "scrollY", { value: 0, writable: true })
  // Viewport y is 100, so it opens below at 128 rather than flipping.
  expect(popover.style.top).toBe("128px")
})
