import { describe, expect, it } from "vitest"
import {
  generateBatchPresetOutput,
  generatePresetOutput,
  OUTPUT_PRESET_LABELS,
  OUTPUT_PRESETS,
} from "../output-presets"
import type { BatchInput, MarkdownInput, OutputPreset } from "../types"
import { CLAUDE_CODE_MARKER } from "../xml-generator"

const singleInput: MarkdownInput = {
  instruction: "Fix this",
  pageUrl: "https://example.com",
  pageTitle: "Example",
  frameworkInfo: { framework: "React", metaFramework: null },
  elementInfo: {
    selector: "#app",
    tag: "div",
    text: "Hi",
    attributes: { class: "app" },
  },
  componentInfo: {
    framework: "react",
    hierarchy: ["App", "Header"],
    props: { a: 1 },
  },
}

const batchInput: BatchInput = {
  pageUrl: "https://example.com",
  pageTitle: "Example",
  annotations: [
    {
      id: 1,
      elementInfo: singleInput.elementInfo,
      frameworkInfo: singleInput.frameworkInfo,
      componentInfo: singleInput.componentInfo,
      instruction: "Fix this",
      pageX: 0,
      pageY: 0,
      createdAt: 0,
    },
  ],
}

describe("OUTPUT_PRESETS / OUTPUT_PRESET_LABELS", () => {
  it("lists exactly the 5 supported presets", () => {
    expect(OUTPUT_PRESETS).toEqual([
      "jsonl",
      "markdown",
      "claude-code",
      "cursor",
      "minimal",
    ])
  })

  it("has a display label for every preset", () => {
    for (const preset of OUTPUT_PRESETS) {
      expect(typeof OUTPUT_PRESET_LABELS[preset]).toBe("string")
      expect(OUTPUT_PRESET_LABELS[preset].length).toBeGreaterThan(0)
    }
  })
})

describe("generatePresetOutput", () => {
  it("jsonl routes to JSON Lines output", () => {
    const lines = generatePresetOutput("jsonl", singleInput).split("\n")
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow()
  })

  it("markdown routes to full Markdown output", () => {
    const result = generatePresetOutput("markdown", singleInput)
    expect(result).toContain("## Page Context")
    expect(result).toContain("- **Props**:")
  })

  it("claude-code routes to the XML wrapper", () => {
    const result = generatePresetOutput("claude-code", singleInput)
    expect(result.startsWith(CLAUDE_CODE_MARKER)).toBe(true)
  })

  it("cursor routes to trimmed Markdown (brief component, compact context)", () => {
    const result = generatePresetOutput("cursor", singleInput)
    expect(result).toContain("## Page Context")
    expect(result).not.toContain("**Props**")
  })

  it("minimal routes to the Feedback Report format", () => {
    const result = generatePresetOutput("minimal", singleInput)
    expect(result.startsWith("---\n\n# Feedback Report\n")).toBe(true)
    expect(result).toContain("## Feedback #1")
    expect(result).not.toContain("## Component Tree")
    expect(result).not.toContain("- **Attributes**:")
  })
})

describe("generateBatchPresetOutput", () => {
  it("jsonl routes to batch JSON Lines output", () => {
    const lines = generateBatchPresetOutput("jsonl", batchInput).split("\n")
    for (const line of lines) expect(() => JSON.parse(line)).not.toThrow()
  })

  it("markdown routes to full batch Markdown output", () => {
    const result = generateBatchPresetOutput("markdown", batchInput)
    expect(result).toContain("## Annotation #1")
  })

  it("claude-code routes to the batch XML wrapper", () => {
    const result = generateBatchPresetOutput("claude-code", batchInput)
    expect(result.startsWith(CLAUDE_CODE_MARKER)).toBe(true)
    expect(result).toContain('<annotation id="1">')
  })

  it("cursor routes to trimmed batch Markdown", () => {
    const result = generateBatchPresetOutput("cursor", batchInput)
    expect(result).toContain("## Annotation #1")
    expect(result).not.toContain("**Props**")
  })

  it("minimal routes to the batch Feedback Report format", () => {
    const result = generateBatchPresetOutput("minimal", batchInput)
    expect(result.startsWith("---\n\n# Feedback Report\n")).toBe(true)
    expect(result).toContain("## Feedback #1")
    expect(result).not.toContain("- **Component**:")
  })

  it.each(
    OUTPUT_PRESETS
  )("single pin copy (%s): one annotation renders without throwing", (preset: OutputPreset) => {
    const singlePin: BatchInput = {
      pageUrl: batchInput.pageUrl,
      pageTitle: batchInput.pageTitle,
      annotations: [batchInput.annotations[0]],
    }
    expect(() => generateBatchPresetOutput(preset, singlePin)).not.toThrow()
  })
})
