/**
 * The Toolbar's preset dropdown has to pick up templates created on the
 * Options page while the overlay is already open — otherwise a freshly added
 * template only appears after toggling the extension off and on.
 */
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { OUTPUT_TEMPLATES_KEY } from "~lib/output-templates"

import Toolbar from "../Toolbar"

type StorageRecord = Record<string, unknown>
type ChangeListener = (changes: {
  [key: string]: chrome.storage.StorageChange
}) => void

const storage: StorageRecord = {}
const listeners: ChangeListener[] = []

function installChromeMock() {
  for (const k of Object.keys(storage)) delete storage[k]
  listeners.length = 0
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn((key: string, cb?: (r: StorageRecord) => void) => {
          const result = { [key]: storage[key] }
          if (cb) cb(result)
          return Promise.resolve(result)
        }),
        set: vi.fn(async (obj: StorageRecord) => {
          Object.assign(storage, obj)
        }),
      },
      onChanged: {
        addListener: vi.fn((fn: ChangeListener) => {
          listeners.push(fn)
        }),
        removeListener: vi.fn((fn: ChangeListener) => {
          const idx = listeners.indexOf(fn)
          if (idx >= 0) listeners.splice(idx, 1)
        }),
      },
    },
  })
}

/** Write to the mocked storage and notify subscribers, like the Options page does. */
function writeAndNotify(key: string, value: unknown) {
  storage[key] = value
  for (const fn of [...listeners]) {
    fn({ [key]: { newValue: value } as chrome.storage.StorageChange })
  }
}

function renderToolbar() {
  render(
    <Toolbar
      annotations={[]}
      activeAnnotationId={null}
      metadata={null}
      relations={[]}
      onSelectAnnotation={vi.fn()}
      onDeleteAnnotation={vi.fn()}
      onReorderAnnotations={vi.fn()}
      onDeleteRelation={vi.fn()}
      onClearAll={vi.fn()}
      onClose={vi.fn()}
      onImportAnnotations={vi.fn()}
    />
  )
}

beforeEach(installChromeMock)
afterEach(cleanup)

it("Toolbar: a template added while the overlay is open appears in the preset dropdown", async () => {
  const user = userEvent.setup()
  storage[OUTPUT_TEMPLATES_KEY] = []
  renderToolbar()

  await user.click(screen.getByTitle("Output preset"))
  expect(screen.queryByRole("option", { name: "Feedback Report" })).toBeNull()

  writeAndNotify(OUTPUT_TEMPLATES_KEY, [
    {
      id: "tpl-1",
      name: "Feedback Report",
      header: "# Feedback Report",
      annotation: "## Feedback #{{id}}",
    },
  ])

  expect(
    await screen.findByRole("option", { name: "Feedback Report" })
  ).toBeInTheDocument()
})

it("Toolbar: storage writes for other keys don't re-read the template list", async () => {
  storage[OUTPUT_TEMPLATES_KEY] = []
  renderToolbar()

  const get = chrome.storage.local.get as ReturnType<typeof vi.fn>
  const callsBefore = get.mock.calls.filter(
    ([key]) => key === OUTPUT_TEMPLATES_KEY
  ).length

  // Annotations persist on every pin — that must not trigger a reload.
  writeAndNotify("tegakariAnnotations", [{ id: 1 }])

  const callsAfter = get.mock.calls.filter(
    ([key]) => key === OUTPUT_TEMPLATES_KEY
  ).length
  expect(callsAfter).toBe(callsBefore)
})
