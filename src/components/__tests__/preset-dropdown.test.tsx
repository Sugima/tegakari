import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, expect, it, vi } from "vitest"
import type { OutputTemplate } from "~lib/output-templates"
import { darkTheme } from "~lib/theme"

import { PresetDropdown } from "../preset-dropdown"
import { toolbarBarStyle } from "../toolbar-styles"

afterEach(cleanup)

function makeTemplate(overrides: Partial<OutputTemplate> = {}): OutputTemplate {
  return {
    id: "tpl-1",
    name: "My Template",
    header: "# {{page.title}}",
    annotation: "- {{instruction}}",
    ...overrides,
  }
}

// The toolbar bar carries `popover="manual"`, and the UA stylesheet's
// `[popover]` rule ships `overflow: auto`. Since the dropdown menu opens
// upward outside the bar, leaving that inherited value in place clipped the
// menu into invisibility — jsdom doesn't apply UA popover styles, so the
// guard has to be asserted on the style object itself.
it("toolbarBarStyle: keeps overflow visible so the preset menu isn't clipped by the popover UA style", () => {
  expect(toolbarBarStyle(darkTheme).overflow).toBe("visible")
})

it("PresetDropdown: lists the built-in presets followed by custom templates", async () => {
  const user = userEvent.setup()

  render(
    <PresetDropdown
      theme={darkTheme}
      preset="jsonl"
      customTemplates={[
        makeTemplate(),
        makeTemplate({ id: "tpl-2", name: "Second" }),
      ]}
      onPresetChange={vi.fn()}
    />
  )

  await user.click(screen.getByTitle("Output preset"))

  const labels = screen.getAllByRole("option").map((el) => el.textContent)
  expect(labels).toEqual([
    "JSONL",
    "Markdown",
    "Claude Code",
    "Cursor",
    "Minimal",
    "My Template",
    "Second",
  ])
})

it("PresetDropdown: selecting a custom template reports it as a custom: reference", async () => {
  const user = userEvent.setup()
  const onPresetChange = vi.fn()

  render(
    <PresetDropdown
      theme={darkTheme}
      preset="jsonl"
      customTemplates={[makeTemplate()]}
      onPresetChange={onPresetChange}
    />
  )

  await user.click(screen.getByTitle("Output preset"))
  await user.click(screen.getByRole("option", { name: "My Template" }))

  expect(onPresetChange).toHaveBeenCalledWith("custom:tpl-1")
})

it("PresetDropdown: shows the template name on the trigger when one is selected", () => {
  render(
    <PresetDropdown
      theme={darkTheme}
      preset="custom:tpl-1"
      customTemplates={[makeTemplate()]}
      onPresetChange={vi.fn()}
    />
  )

  expect(screen.getByTitle("Output preset").textContent).toContain(
    "My Template"
  )
})

// The overlay renders inside Plasmo's shadow DOM, so a document-level
// listener sees events retargeted to the shadow host — never to the node
// inside the menu that was actually clicked. An outside-click check based on
// `contains(e.target)` therefore treated every in-menu mousedown as "outside",
// closing the menu before the click could land on an option.
function renderInShadowDom(ui: Parameters<typeof render>[0]) {
  const host = document.createElement("div")
  document.body.appendChild(host)
  const shadow = host.attachShadow({ mode: "open" })
  const container = document.createElement("div")
  shadow.appendChild(container)
  render(ui, { container })
  return shadow
}

function optionIn(shadow: ShadowRoot, name: string): HTMLElement {
  const match = Array.from(
    shadow.querySelectorAll<HTMLElement>('[role="option"]')
  ).find((el) => el.textContent === name)
  if (!match) throw new Error(`no option named ${name}`)
  return match
}

it("PresetDropdown: selecting a preset works when rendered inside a shadow root", async () => {
  const user = userEvent.setup()
  const onPresetChange = vi.fn()

  const shadow = renderInShadowDom(
    <PresetDropdown
      theme={darkTheme}
      preset="minimal"
      customTemplates={[]}
      onPresetChange={onPresetChange}
    />
  )

  const trigger = shadow.querySelector<HTMLElement>('[title="Output preset"]')
  if (!trigger) throw new Error("no trigger")
  await user.click(trigger)

  await user.click(optionIn(shadow, "Markdown"))

  expect(onPresetChange).toHaveBeenCalledWith("markdown")
})

it("PresetDropdown: a click outside the shadow-hosted menu still closes it", async () => {
  const user = userEvent.setup()

  const shadow = renderInShadowDom(
    <PresetDropdown
      theme={darkTheme}
      preset="minimal"
      customTemplates={[]}
      onPresetChange={vi.fn()}
    />
  )

  const trigger = shadow.querySelector<HTMLElement>('[title="Output preset"]')
  if (!trigger) throw new Error("no trigger")
  await user.click(trigger)
  expect(shadow.querySelectorAll('[role="option"]').length).toBeGreaterThan(0)

  const outside = document.createElement("button")
  outside.textContent = "elsewhere"
  document.body.appendChild(outside)
  await user.click(outside)

  expect(shadow.querySelectorAll('[role="option"]').length).toBe(0)
})
