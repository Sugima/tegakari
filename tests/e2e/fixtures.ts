import {
  test as base,
  chromium,
  type BrowserContext,
  type Worker,
} from "@playwright/test"
import { resolve } from "node:path"

const EXTENSION_PATH = resolve(__dirname, "../../build/chrome-mv3-prod")

type PrefixRule = {
  pattern: string
  prefix: string
  isRegex?: boolean
}

type ExtensionFixtures = {
  context: BrowserContext
  extensionId: string
  serviceWorker: Worker
  /**
   * Toggle the extension's overlay UI on the currently active tab.
   * Internally evaluates `chrome.tabs.sendMessage(<active tab>, TEGAKARI_TOGGLE)`
   * inside the Service Worker — equivalent to clicking the toolbar icon.
   */
  activateExtension: () => Promise<void>
  /**
   * Replace persisted prefix rules in chrome.storage.local. Use as a fast
   * seed in tests that need a known starting state without driving the
   * options UI.
   */
  seedPrefixRules: (rules: PrefixRule[]) => Promise<void>
  /** Read the persisted prefix rules array. */
  readPrefixRules: () => Promise<PrefixRule[]>
  /** Enable/disable selecting elements inside same-origin iframes. */
  seedIframeSelection: (enabled: boolean) => Promise<void>
  /** Enable/disable keeping annotations across page reloads. */
  seedPersistAnnotations: (enabled: boolean) => Promise<void>
}

export const test = base.extend<ExtensionFixtures>({
  // MV3 extensions require a persistent context with --load-extension flags.
  // Note: page fixture is unavailable here; tests open a page via `context.newPage()`.
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      // MV3 service workers do not run in classic headless; headed is the simplest path.
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    })
    await use(context)
    await context.close()
  },

  serviceWorker: async ({ context }, use) => {
    const existing = context.serviceWorkers()
    const worker = existing[0] ?? (await context.waitForEvent("serviceworker"))
    await use(worker)
  },

  extensionId: async ({ serviceWorker }, use) => {
    // serviceWorker.url => chrome-extension://<id>/<...>
    const id = new URL(serviceWorker.url()).host
    await use(id)
  },

  activateExtension: async ({ serviceWorker }, use) => {
    const toggle = async () => {
      await serviceWorker.evaluate(async () => {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        })
        const tabId = tabs[0]?.id
        if (typeof tabId !== "number") {
          throw new Error("no active tab to toggle")
        }
        await chrome.tabs.sendMessage(tabId, { type: "TEGAKARI_TOGGLE" })
      })
    }
    await use(toggle)
  },

  seedPrefixRules: async ({ serviceWorker }, use) => {
    const seed = async (rules: PrefixRule[]) => {
      await serviceWorker.evaluate(async (r) => {
        await chrome.storage.local.set({ tegakariPrefixRules: r })
      }, rules)
    }
    await use(seed)
  },

  readPrefixRules: async ({ serviceWorker }, use) => {
    const read = async () =>
      serviceWorker.evaluate(async () => {
        const result = await chrome.storage.local.get("tegakariPrefixRules")
        return (result.tegakariPrefixRules ?? []) as PrefixRule[]
      })
    await use(read)
  },

  seedIframeSelection: async ({ serviceWorker }, use) => {
    const seed = async (enabled: boolean) => {
      await serviceWorker.evaluate(async (value) => {
        await chrome.storage.local.set({ tegakariIframeSelection: value })
      }, enabled)
    }
    await use(seed)
  },

  seedPersistAnnotations: async ({ serviceWorker }, use) => {
    const seed = async (enabled: boolean) => {
      await serviceWorker.evaluate(async (value) => {
        await chrome.storage.local.set({ tegakariPersistAnnotations: value })
      }, enabled)
    }
    await use(seed)
  },
})

export const expect = test.expect
