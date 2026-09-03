import { afterEach, expect, it } from "vitest"

import {
  ESTIMATED_POPOVER_HEIGHT,
  POPOVER_WIDTH,
  popoverStyle,
} from "../annotation-pin-styles"

const originalWidth = window.innerWidth
const originalHeight = window.innerHeight

function setViewport(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", { value: width, writable: true })
  Object.defineProperty(window, "innerHeight", {
    value: height,
    writable: true,
  })
}

afterEach(() => setViewport(originalWidth, originalHeight))

it("popoverStyle: opens below the pin when the measured height fits there", () => {
  setViewport(1200, 900)
  const style = popoverStyle({ x: 100, y: 100 }, 400)
  expect(style.top).toBe(128)
  expect(style.left).toBe(128)
  expect(style.width).toBe(POPOVER_WIDTH)
})

it("popoverStyle: flips above the pin when there is no room below", () => {
  setViewport(1200, 900)
  // 700 + 28 + 400 + 8 > 900 below, but 700 - 8 - 400 = 292 fits above.
  const style = popoverStyle({ x: 100, y: 700 }, 400)
  expect(style.top).toBe(292)
})

it("popoverStyle: keeps the popover on screen when neither side has room", () => {
  // A short viewport: 400px tall popover fits neither below y=200 nor above it.
  setViewport(1200, 420)
  const style = popoverStyle({ x: 100, y: 200 }, 400)
  expect(style.top).toBe(12)
  expect(Number(style.top) + 400).toBeLessThanOrEqual(420)
})

it("popoverStyle: clamps to the top margin when the popover is taller than the viewport", () => {
  setViewport(1200, 360)
  const style = popoverStyle({ x: 100, y: 40 }, 500)
  expect(style.top).toBe(8)
  expect(style.maxHeight).toBe(344)
})

it("popoverStyle: caps the height to the viewport and allows vertical scrolling", () => {
  setViewport(1200, 500)
  const style = popoverStyle({ x: 100, y: 100 }, 400)
  expect(style.maxHeight).toBe(484)
  expect(style.overflowY).toBe("auto")
})

// `overflow-y: auto` promotes a visible `overflow-x` to `auto` as well, which
// showed a horizontal scrollbar under the Save button.
it("popoverStyle: never scrolls horizontally", () => {
  setViewport(1200, 900)
  expect(popoverStyle({ x: 100, y: 100 }, 400).overflowX).toBe("hidden")
  setViewport(1200, 360)
  expect(popoverStyle({ x: 100, y: 40 }, 500).overflowX).toBe("hidden")
})

it("popoverStyle: falls back to the estimated height before measurement", () => {
  setViewport(1200, 900)
  const measured = popoverStyle({ x: 100, y: 100 }, ESTIMATED_POPOVER_HEIGHT)
  const unmeasured = popoverStyle({ x: 100, y: 100 })
  expect(unmeasured.top).toBe(measured.top)
})

it("popoverStyle: the estimate is tall enough to flip a pin near the bottom edge", () => {
  setViewport(1200, 500)
  // Regression guard: the old 200px estimate left the popover opening
  // downwards here, pushing the Save button below the fold.
  const style = popoverStyle({ x: 100, y: 420 })
  expect(Number(style.top)).toBeLessThan(420)
})

it("popoverStyle: flips to the left of the pin near the right edge", () => {
  setViewport(400, 900)
  const style = popoverStyle({ x: 380, y: 100 }, 400)
  expect(style.left).toBeUndefined()
  expect(style.right).toBe(28)
})
