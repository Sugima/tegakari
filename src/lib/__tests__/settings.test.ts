import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  IFRAME_SELECTION_KEY,
  loadIframeSelection,
  loadOutputPreset,
  OUTPUT_FORMAT_KEY,
  setIframeSelection,
  setOutputPreset,
} from "../settings"

type StorageRecord = Record<string, unknown>

const storage: StorageRecord = {}
const storageSet = vi.fn()

beforeEach(() => {
  for (const key of Object.keys(storage)) delete storage[key]
  storageSet.mockImplementation((value: StorageRecord) => {
    Object.assign(storage, value)
  })
  vi.stubGlobal("chrome", {
    storage: {
      local: {
        get: vi.fn((key: string, cb: (result: StorageRecord) => void) => {
          cb({ [key]: storage[key] })
        }),
        set: storageSet,
      },
    },
  })
})

describe("settings: iframe selection", () => {
  it("defaults to false when unset", async () => {
    await expect(loadIframeSelection()).resolves.toBe(false)
  })

  it("reads true only for an exact boolean true", async () => {
    storage[IFRAME_SELECTION_KEY] = true
    await expect(loadIframeSelection()).resolves.toBe(true)
  })

  it("treats non-true values as false", async () => {
    storage[IFRAME_SELECTION_KEY] = "true"
    await expect(loadIframeSelection()).resolves.toBe(false)
  })

  it("persists the flag", () => {
    setIframeSelection(true)
    expect(storageSet).toHaveBeenCalledWith({ [IFRAME_SELECTION_KEY]: true })
  })
})

describe("settings: output preset", () => {
  it("defaults to minimal when unset", async () => {
    await expect(loadOutputPreset()).resolves.toBe("minimal")
  })

  it("reads markdown when persisted", async () => {
    storage[OUTPUT_FORMAT_KEY] = "markdown"
    await expect(loadOutputPreset()).resolves.toBe("markdown")
  })

  it.each([
    "jsonl",
    "markdown",
    "claude-code",
    "cursor",
    "minimal",
  ] as const)("reads the %s preset when persisted", async (preset) => {
    storage[OUTPUT_FORMAT_KEY] = preset
    await expect(loadOutputPreset()).resolves.toBe(preset)
  })

  it("falls back to minimal for unknown values", async () => {
    storage[OUTPUT_FORMAT_KEY] = "yaml"
    await expect(loadOutputPreset()).resolves.toBe("minimal")
  })

  it("falls back to minimal for non-string values", async () => {
    storage[OUTPUT_FORMAT_KEY] = 42
    await expect(loadOutputPreset()).resolves.toBe("minimal")
  })

  it("persists the chosen preset", () => {
    setOutputPreset("markdown")
    expect(storageSet).toHaveBeenCalledWith({ [OUTPUT_FORMAT_KEY]: "markdown" })
  })

  it("persists a new preset id under the same storage key (backward-compat)", () => {
    setOutputPreset("claude-code")
    expect(storageSet).toHaveBeenCalledWith({
      [OUTPUT_FORMAT_KEY]: "claude-code",
    })
  })

  it("reads a custom:<id> value as valid (template existence isn't checked here)", async () => {
    storage[OUTPUT_FORMAT_KEY] = "custom:abc-123"
    await expect(loadOutputPreset()).resolves.toBe("custom:abc-123")
  })

  it("persists a custom:<id> value under the same storage key", () => {
    setOutputPreset("custom:abc-123")
    expect(storageSet).toHaveBeenCalledWith({
      [OUTPUT_FORMAT_KEY]: "custom:abc-123",
    })
  })

  it("still falls back to minimal for a string that merely starts with 'custom' without the colon", async () => {
    storage[OUTPUT_FORMAT_KEY] = "customized"
    await expect(loadOutputPreset()).resolves.toBe("minimal")
  })
})
