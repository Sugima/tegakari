import { expect, it } from "vitest"

import { classList, formatClassList } from "../element-classes"
import type { ElementInfo } from "../types"

function makeElement(attributes: Record<string, string>): ElementInfo {
  return { selector: "div", tag: "div", text: "", attributes }
}

it("classList: splits the raw class attribute on whitespace runs", () => {
  const el = makeElement({ class: "btn   btn-ghost\n btn-lg" })
  expect(classList(el)).toEqual(["btn", "btn-ghost", "btn-lg"])
})

it("classList: returns an empty array when there is no class attribute", () => {
  expect(classList(makeElement({ id: "x" }))).toEqual([])
})

it("classList: treats a whitespace-only class attribute as no classes", () => {
  expect(classList(makeElement({ class: "   " }))).toEqual([])
})

it("formatClassList: joins classes with a comma and no code marks", () => {
  const el = makeElement({ class: "btn btn-ghost btn-lg btn-block" })
  expect(formatClassList(el)).toBe("btn, btn-ghost, btn-lg, btn-block")
})

it("formatClassList: returns an empty string when there are no classes", () => {
  expect(formatClassList(makeElement({}))).toBe("")
})
