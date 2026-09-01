import { describe, expect, it } from "vitest"

import type { OutputTemplate } from "../output-templates"
import { renderOutputTemplate } from "../template-renderer"
import type { Annotation, BatchInput } from "../types"

function makeTemplate(overrides: Partial<OutputTemplate> = {}): OutputTemplate {
  return {
    id: "tpl-1",
    name: "Test template",
    header: "",
    annotation: "",
    ...overrides,
  }
}

function makeAnnotation(overrides: Partial<Annotation> = {}): Annotation {
  return {
    id: 1,
    elementInfo: {
      selector: "#app > div",
      tag: "div",
      text: "Hello",
      attributes: { class: "app", "data-testid": "main" },
      styles: { display: "flex" },
    },
    frameworkInfo: {
      framework: "React",
      metaFramework: "Next.js (App Router)",
    },
    componentInfo: {
      framework: "react",
      hierarchy: ["App", "Layout", "Header"],
      props: { title: "Hi" },
      source: { file: "src/Header.tsx", line: 10 },
    },
    instruction: "Fix the spacing",
    pageX: 0,
    pageY: 0,
    createdAt: 0,
    tags: ["spacing", "color"],
    ...overrides,
  }
}

function makeInput(overrides: Partial<BatchInput> = {}): BatchInput {
  return {
    pageUrl: "https://example.com/page",
    pageTitle: "Example Page",
    annotations: [makeAnnotation()],
    ...overrides,
  }
}

describe("renderOutputTemplate: header placeholders", () => {
  it("substitutes every documented header placeholder", () => {
    const template = makeTemplate({
      header:
        "prefix=[{{prefix}}] url={{page.url}} title={{page.title}} fw={{page.framework}} meta={{page.metaFramework}} count={{annotationCount}}",
      annotation: "x",
    })
    const input = makeInput({ prefix: "[repo=my-app]" })

    const output = renderOutputTemplate(template, input)

    expect(output).toContain("prefix=[[repo=my-app]]")
    expect(output).toContain("url=https://example.com/page")
    expect(output).toContain("title=Example Page")
    expect(output).toContain("fw=React")
    expect(output).toContain("meta=Next.js (App Router)")
    expect(output).toContain("count=1")
  })

  it("resolves header placeholders to empty string when data is absent", () => {
    const template = makeTemplate({
      header: "[{{prefix}}][{{page.framework}}][{{page.metaFramework}}]",
      annotation: "x",
    })
    const input: BatchInput = {
      pageUrl: "https://example.com",
      pageTitle: "Example",
      annotations: [
        makeAnnotation({ frameworkInfo: null, componentInfo: null }),
      ],
    }

    const output = renderOutputTemplate(template, input)
    expect(output).toContain("[][][]")
  })
})

describe("renderOutputTemplate: annotation placeholders (values present)", () => {
  it("substitutes every documented annotation placeholder", () => {
    const template = makeTemplate({
      annotation: [
        "id={{id}}",
        "instruction={{instruction}}",
        "tags={{tags}}",
        "selector={{selector}}",
        "tag={{tag}}",
        "classes={{classes}}",
        "text={{text}}",
        "attributes={{attributes}}",
        "styles={{styles}}",
        "hierarchy={{component.hierarchy}}",
        "name={{component.name}}",
        "source={{component.source}}",
        "props={{component.props}}",
      ].join("\n"),
    })

    const output = renderOutputTemplate(template, makeInput())

    expect(output).toContain("id=1")
    expect(output).toContain("instruction=Fix the spacing")
    expect(output).toContain("tags=spacing, color")
    expect(output).toContain("selector=#app > div")
    expect(output).toContain("tag=div")
    expect(output).toContain("classes=app")
    expect(output).toContain("text=Hello")
    expect(output).toContain("attributes=class: app\ndata-testid: main")
    expect(output).toContain("styles=display: flex")
    expect(output).toContain("hierarchy=App → Layout → Header")
    expect(output).toContain("name=Header")
    expect(output).toContain("source=src/Header.tsx:10")
    expect(output).toContain('props={"title":"Hi"}')
  })
})

describe("renderOutputTemplate: annotation placeholders (values absent)", () => {
  it("resolves every annotation placeholder to empty string when its data is absent", () => {
    const template = makeTemplate({
      annotation: [
        "[{{instruction}}]",
        "[{{tags}}]",
        "[{{attributes}}]",
        "[{{styles}}]",
        "[{{component.hierarchy}}]",
        "[{{component.name}}]",
        "[{{component.source}}]",
        "[{{component.props}}]",
      ].join("\n"),
    })
    const input: BatchInput = {
      pageUrl: "https://example.com",
      pageTitle: "Example",
      annotations: [
        {
          id: 1,
          elementInfo: {
            selector: "#x",
            tag: "div",
            text: "",
            attributes: {},
          },
          frameworkInfo: null,
          componentInfo: null,
          instruction: "",
          pageX: 0,
          pageY: 0,
          createdAt: 0,
        },
      ],
    }

    const output = renderOutputTemplate(template, input)
    expect(output).toBe("[]\n[]\n[]\n[]\n[]\n[]\n[]\n[]")
  })
})

describe("renderOutputTemplate: unknown placeholders", () => {
  it("leaves an unrecognized placeholder untouched (typo protection)", () => {
    const template = makeTemplate({
      header: "{{selectr}}",
      annotation: "{{selector}}",
    })
    const output = renderOutputTemplate(template, makeInput())
    expect(output).toContain("{{selectr}}")
    expect(output).toContain("#app > div")
  })

  it("treats an annotation-only key used in the header as unknown (cross-context)", () => {
    const template = makeTemplate({ header: "{{selector}}", annotation: "x" })
    const output = renderOutputTemplate(template, makeInput())
    expect(output).toContain("{{selector}}")
  })

  it("treats a header-only key used in the annotation as unknown (cross-context)", () => {
    const template = makeTemplate({ header: "h", annotation: "{{prefix}}" })
    const output = renderOutputTemplate(template, makeInput())
    expect(output).toContain("{{prefix}}")
  })
})

describe("renderOutputTemplate: trim + join + empty-part filtering", () => {
  it("trims each rendered piece and joins header + annotations with a blank line", () => {
    const template = makeTemplate({
      header: "  HEADER  \n",
      annotation: "  BODY-{{id}}  \n",
    })
    const input = makeInput({
      annotations: [makeAnnotation({ id: 1 }), makeAnnotation({ id: 2 })],
    })

    expect(renderOutputTemplate(template, input)).toBe(
      "HEADER\n\nBODY-1\n\nBODY-2"
    )
  })

  it("drops a header that renders empty instead of leaving a leading blank line", () => {
    const template = makeTemplate({ header: "   ", annotation: "BODY" })
    const output = renderOutputTemplate(template, makeInput())
    expect(output).toBe("BODY")
  })

  it("drops an annotation that renders empty instead of inserting a blank block", () => {
    const template = makeTemplate({ header: "HEADER", annotation: "  " })
    const output = renderOutputTemplate(template, makeInput())
    expect(output).toBe("HEADER")
  })

  it("renders an empty string when both header and every annotation are empty", () => {
    const template = makeTemplate({ header: "", annotation: "" })
    const output = renderOutputTemplate(
      template,
      makeInput({ prefix: undefined })
    )
    expect(output).toBe("")
  })
})

describe("renderOutputTemplate: prefix auto-injection", () => {
  it("prepends the page prefix when the header has no {{prefix}} placeholder", () => {
    const template = makeTemplate({ header: "H", annotation: "A" })
    const input = makeInput({ prefix: "[repo=my-app]" })
    expect(renderOutputTemplate(template, input)).toBe(
      "[repo=my-app]\n\nH\n\nA"
    )
  })

  it("does not prepend the prefix when the header already places {{prefix}}", () => {
    const template = makeTemplate({
      header: "before {{prefix}} after",
      annotation: "A",
    })
    const input = makeInput({ prefix: "[repo=my-app]" })
    expect(renderOutputTemplate(template, input)).toBe(
      "before [repo=my-app] after\n\nA"
    )
  })

  it("respects {{ prefix }} with internal whitespace as the same placeholder", () => {
    const template = makeTemplate({ header: "{{ prefix }}", annotation: "A" })
    const input = makeInput({ prefix: "[repo=my-app]" })
    // Substituted inline exactly once, not also prepended.
    expect(renderOutputTemplate(template, input)).toBe("[repo=my-app]\n\nA")
  })

  it("does not prepend anything when there is no matched prefix", () => {
    const template = makeTemplate({ header: "H", annotation: "A" })
    const output = renderOutputTemplate(
      template,
      makeInput({ prefix: undefined })
    )
    expect(output).toBe("H\n\nA")
  })
})

describe("renderOutputTemplate: {{classes}}", () => {
  it("renders multiple classes comma-separated and undecorated", () => {
    const template = makeTemplate({ annotation: "{{classes}}" })
    const input = makeInput({
      annotations: [
        makeAnnotation({
          elementInfo: {
            selector: "button.btn",
            tag: "button",
            text: "",
            attributes: { class: "btn btn-ghost btn-lg" },
          },
        }),
      ],
    })

    expect(renderOutputTemplate(template, input)).toBe("btn, btn-ghost, btn-lg")
  })

  it("renders an empty string when the element has no class attribute", () => {
    const template = makeTemplate({ annotation: "classes=[{{classes}}]" })
    const input = makeInput({
      annotations: [
        makeAnnotation({
          elementInfo: {
            selector: "div",
            tag: "div",
            text: "",
            attributes: {},
          },
        }),
      ],
    })

    expect(renderOutputTemplate(template, input)).toBe("classes=[]")
  })
})
