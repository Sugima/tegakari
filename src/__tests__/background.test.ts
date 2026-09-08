import { it, expect, vi, beforeEach } from "vitest"

const mockSendMessage = vi.fn()
const mockCaptureVisibleTab = vi.fn()
const mockTabsCreate = vi.fn()
const mockGetURL = vi.fn((path: string) => `chrome-extension://test-id/${path}`)
const mockMenuCreate = vi.fn()
const mockMenuRemoveAll = vi.fn((cb?: () => void) => cb?.())
const mockGetManifest = vi.fn()
const mockExecuteScript = vi.fn()
const mockGetRegisteredContentScripts = vi.fn()
const onClickedListeners: Function[] = []
const onMessageListeners: Function[] = []
const onInstalledListeners: Function[] = []
const onMenuClickedListeners: Function[] = []

vi.stubGlobal("chrome", {
  action: {
    onClicked: {
      addListener: (fn: Function) => onClickedListeners.push(fn),
    },
  },
  contextMenus: {
    create: mockMenuCreate,
    removeAll: mockMenuRemoveAll,
    onClicked: {
      addListener: (fn: Function) => onMenuClickedListeners.push(fn),
    },
  },
  tabs: {
    sendMessage: mockSendMessage,
    captureVisibleTab: mockCaptureVisibleTab,
    create: mockTabsCreate,
  },
  runtime: {
    onMessage: {
      addListener: (fn: Function) => onMessageListeners.push(fn),
    },
    onInstalled: {
      addListener: (fn: Function) => onInstalledListeners.push(fn),
    },
    getURL: mockGetURL,
    getManifest: mockGetManifest,
  },
  scripting: {
    executeScript: mockExecuteScript,
    getRegisteredContentScripts: mockGetRegisteredContentScripts,
  },
})

beforeEach(async () => {
  vi.resetModules()
  mockSendMessage.mockReset()
  mockCaptureVisibleTab.mockReset()
  mockTabsCreate.mockReset()
  mockGetURL.mockClear()
  mockMenuCreate.mockReset()
  mockMenuRemoveAll.mockClear()
  mockGetManifest.mockReset()
  mockGetManifest.mockReturnValue({
    content_scripts: [{ js: ["overlay.js"] }, { js: ["use-overlay.js"] }],
  })
  mockExecuteScript.mockReset()
  mockExecuteScript.mockResolvedValue(undefined)
  mockGetRegisteredContentScripts.mockReset()
  mockGetRegisteredContentScripts.mockResolvedValue([])
  onClickedListeners.length = 0
  onMessageListeners.length = 0
  onInstalledListeners.length = 0
  onMenuClickedListeners.length = 0
  // @ts-expect-error background.ts is a side-effect-only script, not a module
  await import("../background")
})

it("background: should register action.onClicked listener", () => {
  expect(onClickedListeners).toHaveLength(1)
})

it("background: should send TEGAKARI_TOGGLE message on click with valid tab id", async () => {
  const listener = onClickedListeners[0]
  await listener({ id: 42 })
  expect(mockSendMessage).toHaveBeenCalledWith(42, {
    type: "TEGAKARI_TOGGLE",
  })
})

it("background: should not send message when tab has no id", async () => {
  const listener = onClickedListeners[0]
  await listener({})
  expect(mockSendMessage).not.toHaveBeenCalled()
})

it("background: should register runtime.onMessage listener", () => {
  expect(onMessageListeners).toHaveLength(1)
})

it("background: should capture visible tab on TEGAKARI_CAPTURE", () => {
  const listener = onMessageListeners[0]
  const sendResponse = vi.fn()
  mockCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc")

  const result = listener({ type: "TEGAKARI_CAPTURE" }, {}, sendResponse)

  expect(result).toBe(true)
  expect(mockCaptureVisibleTab).toHaveBeenCalledWith({ format: "png" })
})

it("background: should call sendResponse with success on capture", async () => {
  const listener = onMessageListeners[0]
  const sendResponse = vi.fn()
  mockCaptureVisibleTab.mockResolvedValue("data:image/png;base64,abc")

  listener({ type: "TEGAKARI_CAPTURE" }, {}, sendResponse)

  await vi.waitFor(() => {
    expect(sendResponse).toHaveBeenCalledWith({
      success: true,
      dataUrl: "data:image/png;base64,abc",
    })
  })
})

it("background: should call sendResponse with error on capture failure", async () => {
  const listener = onMessageListeners[0]
  const sendResponse = vi.fn()
  mockCaptureVisibleTab.mockRejectedValue(new Error("Capture failed"))

  listener({ type: "TEGAKARI_CAPTURE" }, {}, sendResponse)

  await vi.waitFor(() => {
    expect(sendResponse).toHaveBeenCalledWith({
      success: false,
      error: "Error: Capture failed",
    })
  })
})

it("background: should not handle non-TEGAKARI_CAPTURE messages", () => {
  const listener = onMessageListeners[0]
  const sendResponse = vi.fn()

  const result = listener({ type: "OTHER_MESSAGE" }, {}, sendResponse)

  expect(result).toBeUndefined()
  expect(mockCaptureVisibleTab).not.toHaveBeenCalled()
})

it("background: should not handle null messages", () => {
  const listener = onMessageListeners[0]
  const sendResponse = vi.fn()

  const result = listener(null, {}, sendResponse)

  expect(result).toBeUndefined()
  expect(mockCaptureVisibleTab).not.toHaveBeenCalled()
})

it("background: should open the options page as a new tab on TEGAKARI_OPEN_OPTIONS", () => {
  const listener = onMessageListeners[0]
  const sendResponse = vi.fn()

  // We use chrome.tabs.create instead of chrome.runtime.openOptionsPage
  // because the latter silently no-ops in some Chromium derivatives (Arc).
  const result = listener({ type: "TEGAKARI_OPEN_OPTIONS" }, {}, sendResponse)

  expect(result).toBe(false)
  expect(mockGetURL).toHaveBeenCalledWith("options.html")
  expect(mockTabsCreate).toHaveBeenCalledWith({
    url: "chrome-extension://test-id/options.html",
  })
})

it("background: creates the context menu on install (after removeAll)", () => {
  expect(onInstalledListeners).toHaveLength(1)
  onInstalledListeners[0]()
  expect(mockMenuRemoveAll).toHaveBeenCalled()
  expect(mockMenuCreate).toHaveBeenCalledWith(
    expect.objectContaining({ id: "tegakari-select-element" })
  )
})

it("background: forwards a top-frame context-menu click to the tab", () => {
  expect(onMenuClickedListeners).toHaveLength(1)
  onMenuClickedListeners[0](
    { menuItemId: "tegakari-select-element", frameId: 0 },
    { id: 7 }
  )
  expect(mockSendMessage).toHaveBeenCalledWith(7, {
    type: "TEGAKARI_CONTEXT_SELECT",
  })
})

it("background: ignores clicks on other context-menu items", () => {
  onMenuClickedListeners[0](
    { menuItemId: "something-else", frameId: 0 },
    { id: 7 }
  )
  expect(mockSendMessage).not.toHaveBeenCalled()
})

it("background: ignores context-menu clicks inside an iframe (frameId != 0)", () => {
  onMenuClickedListeners[0](
    { menuItemId: "tegakari-select-element", frameId: 12 },
    { id: 7 }
  )
  expect(mockSendMessage).not.toHaveBeenCalled()
})

// A tab that was already open when the extension was installed or reloaded has
// no content script, so the first sendMessage rejects with "Could not
// establish connection. Receiving end does not exist."
const NO_RECEIVER = new Error(
  "Could not establish connection. Receiving end does not exist."
)

it("background: injects the content scripts and retries when no receiver exists", async () => {
  mockSendMessage.mockRejectedValueOnce(NO_RECEIVER).mockResolvedValueOnce(undefined)

  await onClickedListeners[0]({ id: 42 })

  expect(mockExecuteScript).toHaveBeenCalledWith({
    target: { tabId: 42 },
    files: ["overlay.js", "use-overlay.js"],
  })
  expect(mockSendMessage).toHaveBeenCalledTimes(2)
  expect(mockSendMessage).toHaveBeenLastCalledWith(42, { type: "TEGAKARI_TOGGLE" })
})

it("background: injects the MAIN-world script from its registration", async () => {
  mockSendMessage.mockRejectedValueOnce(NO_RECEIVER).mockResolvedValueOnce(undefined)
  mockGetRegisteredContentScripts.mockResolvedValue([
    { id: "srcContentsMainWorld", world: "MAIN", js: ["main-world.js"] },
    { id: "other", world: "ISOLATED", js: ["ignored.js"] },
  ])

  await onClickedListeners[0]({ id: 42 })

  expect(mockExecuteScript).toHaveBeenCalledWith({
    target: { tabId: 42 },
    files: ["main-world.js"],
    world: "MAIN",
  })
})

it("background: stays silent when the page forbids injection", async () => {
  mockSendMessage.mockRejectedValue(NO_RECEIVER)
  mockExecuteScript.mockRejectedValue(new Error("Cannot access a chrome:// URL"))

  await expect(onClickedListeners[0]({ id: 42 })).resolves.toBeUndefined()
})

it("background: does not inject when the content script already answers", async () => {
  mockSendMessage.mockResolvedValue(undefined)

  await onClickedListeners[0]({ id: 42 })

  expect(mockExecuteScript).not.toHaveBeenCalled()
})

it("background: retries a context-menu click the same way", async () => {
  mockSendMessage.mockRejectedValueOnce(NO_RECEIVER).mockResolvedValueOnce(undefined)

  onMenuClickedListeners[0](
    { menuItemId: "tegakari-select-element", frameId: 0 },
    { id: 7 }
  )

  await vi.waitFor(() => {
    expect(mockSendMessage).toHaveBeenLastCalledWith(7, {
      type: "TEGAKARI_CONTEXT_SELECT",
    })
  })
  expect(mockExecuteScript).toHaveBeenCalled()
})
