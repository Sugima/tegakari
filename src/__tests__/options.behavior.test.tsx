/**
 * Behavior-section settings on the options page: the annotation-persistence
 * toggle and the "delete every page's stored annotations" action.
 */
import "@testing-library/jest-dom/vitest"

import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import OptionsPage from "../options"

type StorageRecord = Record<string, unknown>
const storage: StorageRecord = {}

beforeEach(() => {
  for (const k of Object.keys(storage)) delete storage[k]
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        // `null` means "every item" — that is how the delete-all action finds
        // the per-page annotation keys.
        get: vi.fn((key: string | null, cb?: (r: StorageRecord) => void) => {
          const result = key === null ? { ...storage } : { [key]: storage[key] }
          cb?.(result)
          return Promise.resolve(result)
        }),
        set: vi.fn(async (obj: StorageRecord) => {
          Object.assign(storage, obj)
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          for (const k of Array.isArray(keys) ? keys : [keys]) delete storage[k]
        }),
      },
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  })
})

afterEach(cleanup)

function persistSwitch() {
  return screen.getByRole("switch", { name: "Keep annotations after a reload" })
}

it("defaults the persistence toggle to on and stores the off state when switched", async () => {
  const user = userEvent.setup()
  render(<OptionsPage />)

  await waitFor(() => expect(persistSwitch()).toHaveAttribute("aria-checked", "true"))

  await user.click(persistSwitch())

  expect(persistSwitch()).toHaveAttribute("aria-checked", "false")
  expect(storage.tegakariPersistAnnotations).toBe(false)
})

it("reflects a stored off state on load", async () => {
  storage.tegakariPersistAnnotations = false
  render(<OptionsPage />)

  await waitFor(() => expect(persistSwitch()).toHaveAttribute("aria-checked", "false"))
})

it("deletes every page's stored annotations only after a second click", async () => {
  storage["tegakariAnnotations:https://a.example/"] = { annotations: [] }
  storage["tegakariAnnotations:https://b.example/"] = { annotations: [] }
  storage.tegakariPrefixRules = [{ pattern: "a.example", prefix: "[repo=a]" }]
  const user = userEvent.setup()
  render(<OptionsPage />)

  await user.click(screen.getByRole("button", { name: "Delete all" }))

  // First click only arms the confirmation — nothing is gone yet.
  expect(storage["tegakariAnnotations:https://a.example/"]).toBeDefined()

  await user.click(screen.getByRole("button", { name: "Click again to confirm" }))

  await screen.findByRole("button", { name: "Deleted annotations for 2 page(s)" })
  expect(storage["tegakariAnnotations:https://a.example/"]).toBeUndefined()
  expect(storage["tegakariAnnotations:https://b.example/"]).toBeUndefined()
  // Other settings are untouched.
  expect(storage.tegakariPrefixRules).toEqual([
    { pattern: "a.example", prefix: "[repo=a]" },
  ])
})

it("says so when there is nothing stored to delete", async () => {
  const user = userEvent.setup()
  render(<OptionsPage />)

  await user.click(screen.getByRole("button", { name: "Delete all" }))
  await user.click(screen.getByRole("button", { name: "Click again to confirm" }))

  await screen.findByRole("button", { name: "No stored annotations" })
})
