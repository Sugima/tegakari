import { expect, it } from "vitest"

import { generateBatchFeedback, generateFeedback } from "../feedback-generator"
import type {
  Annotation,
  BatchInput,
  ElementInfo,
  MarkdownInput,
} from "../types"

function makeElement(overrides: Partial<ElementInfo> = {}): ElementInfo {
  return {
    selector: "button.btn",
    tag: "button",
    text: "別のアカウントでログインする",
    attributes: { class: "btn btn-ghost btn-lg btn-block", type: "button" },
    ...overrides,
  }
}

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: makeElement(),
    frameworkInfo: null,
    componentInfo: null,
    instruction: "このボタンにもGoogleアイコンを出す。",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
    ...overrides,
  }
}

const PAGE_URL =
  "file:///Users/x/dev/ai-commons/docs/design/mocks/login/error-unregistered.html"

function makeBatch(overrides: Partial<BatchInput> = {}): BatchInput {
  return {
    pageUrl: PAGE_URL,
    pageTitle: "ログイン",
    annotations: [makeAnnotation()],
    ...overrides,
  }
}

function makeSingle(overrides: Partial<MarkdownInput> = {}): MarkdownInput {
  return {
    instruction: "このボタンにもGoogleアイコンを出す。",
    pageUrl: PAGE_URL,
    pageTitle: "ログイン",
    frameworkInfo: null,
    elementInfo: makeElement(),
    componentInfo: null,
    ...overrides,
  }
}

it("generateBatchFeedback: renders the full report shape for multiple annotations", () => {
  const result = generateBatchFeedback(
    makeBatch({
      annotations: [
        makeAnnotation({
          tags: ["spacing", "color"],
          styleDelta: [
            { property: "font-size", before: "13px", after: "16px" },
          ],
        }),
        makeAnnotation({
          id: 2,
          instruction: "連絡先メールアドレスは出さない。",
          elementInfo: makeElement({
            selector: "div.admin-contact",
            tag: "div",
            text: "管理者: AI・DX推進室（aidx@example.com）",
            attributes: { class: "admin-contact" },
          }),
        }),
      ],
    })
  )

  expect(result).toBe(
    [
      "---",
      "",
      "# Feedback Report",
      `URL: ${PAGE_URL}`,
      "",
      "## Feedback #1",
      "> このボタンにもGoogleアイコンを出す。",
      "",
      "- Tags: `spacing, color`",
      "- Element: `<button>`",
      "- Selector: `button.btn`",
      "- Classes: `btn, btn-ghost, btn-lg, btn-block`",
      '- Text: "別のアカウントでログインする"',
      "",
      "### Style Changes",
      "- font-size: 13px → 16px",
      "",
      "## Feedback #2",
      "> 連絡先メールアドレスは出さない。",
      "",
      "- Element: `<div>`",
      "- Selector: `div.admin-contact`",
      "- Classes: `admin-contact`",
      '- Text: "管理者: AI・DX推進室（aidx@example.com）"',
    ].join("\n")
  )
})

it("generateBatchFeedback: numbers sections by annotation id, not by position", () => {
  const result = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation({ id: 7 })] })
  )
  expect(result).toContain("## Feedback #7")
})

it("generateBatchFeedback: omits the Classes line when the element has no class attribute", () => {
  const result = generateBatchFeedback(
    makeBatch({
      annotations: [
        makeAnnotation({ elementInfo: makeElement({ attributes: {} }) }),
      ],
    })
  )
  expect(result).not.toContain("- Classes:")
  expect(result).toContain("- Selector: `button.btn`")
})

it("generateBatchFeedback: omits the Text line when the element has no text", () => {
  const result = generateBatchFeedback(
    makeBatch({
      annotations: [
        makeAnnotation({ elementInfo: makeElement({ text: "   " }) }),
      ],
    })
  )
  expect(result).not.toContain("- Text:")
})

it("generateBatchFeedback: keeps the heading but drops the blockquote when there is no instruction", () => {
  const result = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation({ instruction: "" })] })
  )
  expect(result).toContain("## Feedback #1\n\n- Element:")
  expect(result.split("\n").some((line) => line.startsWith(">"))).toBe(false)
})

it("generateBatchFeedback: quotes every line of a multi-line instruction", () => {
  const result = generateBatchFeedback(
    makeBatch({
      annotations: [makeAnnotation({ instruction: "1行目\n2行目" })],
    })
  )
  expect(result).toContain("> 1行目\n> 2行目")
})

it("generateBatchFeedback: places a matched prefix rule above the report", () => {
  const result = generateBatchFeedback(makeBatch({ prefix: "[repo=my-app]" }))
  expect(result.startsWith("[repo=my-app]\n\n---\n\n# Feedback Report")).toBe(
    true
  )
})

it("generateBatchFeedback: drops the sections that the full Markdown output would carry", () => {
  const result = generateBatchFeedback(
    makeBatch({
      annotations: [
        makeAnnotation({
          componentInfo: {
            framework: "react",
            hierarchy: ["App", "LoginButton"],
          },
          elementInfo: makeElement({ styles: { display: "flex" } }),
        }),
      ],
    })
  )
  expect(result).not.toContain("Component")
  expect(result).not.toContain("display")
  expect(result).not.toContain("type")
})

it("generateBatchFeedback: renders only the header when there are no annotations", () => {
  const result = generateBatchFeedback(makeBatch({ annotations: [] }))
  expect(result).toBe(`---\n\n# Feedback Report\nURL: ${PAGE_URL}`)
})

it("generateFeedback: renders a single element as Feedback #1", () => {
  const result = generateFeedback(makeSingle())
  expect(result).toBe(
    [
      "---",
      "",
      "# Feedback Report",
      `URL: ${PAGE_URL}`,
      "",
      "## Feedback #1",
      "> このボタンにもGoogleアイコンを出す。",
      "",
      "- Element: `<button>`",
      "- Selector: `button.btn`",
      "- Classes: `btn, btn-ghost, btn-lg, btn-block`",
      '- Text: "別のアカウントでログインする"',
    ].join("\n")
  )
})

it("generateBatchFeedback: puts the Tags line above the element lines", () => {
  const result = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation({ tags: ["spacing", "color"] })] })
  )
  expect(result).toContain(
    "- Tags: `spacing, color`\n- Element: `<button>`\n- Selector:"
  )
})

it("generateBatchFeedback: omits the Tags line when no chip is selected", () => {
  const noTags = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation()] })
  )
  const emptyTags = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation({ tags: [] })] })
  )
  expect(noTags).not.toContain("- Tags:")
  expect(emptyTags).not.toContain("- Tags:")
})

it("generateBatchFeedback: emits tag ids verbatim, not their display labels", () => {
  const result = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation({ tags: ["remove"] })] })
  )
  expect(result).toContain("- Tags: `remove`")
})

it("generateBatchFeedback: puts Style Changes after the element lines as an h3 list", () => {
  const result = generateBatchFeedback(
    makeBatch({
      annotations: [
        makeAnnotation({
          instruction: "ホームの垂直中央位置がずれている",
          styleDelta: [
            { property: "font-size", before: "13px", after: "16px" },
            { property: "color", before: "rgb(51, 51, 51)", after: "#2563eb" },
          ],
        }),
      ],
    })
  )

  expect(result).toContain(
    [
      '- Text: "別のアカウントでログインする"',
      "",
      "### Style Changes",
      "- font-size: 13px → 16px",
      "- color: rgb(51, 51, 51) → #2563eb",
    ].join("\n")
  )
})

it("generateBatchFeedback: omits the Style Changes block when there is no styleDelta", () => {
  const absent = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation()] })
  )
  const empty = generateBatchFeedback(
    makeBatch({ annotations: [makeAnnotation({ styleDelta: [] })] })
  )
  expect(absent).not.toContain("### Style Changes")
  expect(empty).not.toContain("### Style Changes")
})

it("generateBatchFeedback: keeps Style Changes per annotation, not shared", () => {
  const result = generateBatchFeedback(
    makeBatch({
      annotations: [
        makeAnnotation({
          styleDelta: [{ property: "gap", before: "8px", after: "16px" }],
        }),
        makeAnnotation({ id: 2 }),
      ],
    })
  )
  const sections = result.split("## Feedback #")
  expect(sections[1]).toContain("### Style Changes")
  expect(sections[2]).not.toContain("### Style Changes")
})
