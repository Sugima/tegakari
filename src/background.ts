const MAIN_WORLD = "MAIN"

// Content scripts are injected only while a page loads, so a tab that was
// already open when the extension was installed or reloaded has no listener.
// `chrome.tabs.sendMessage` rejects there with "Could not establish
// connection. Receiving end does not exist." Inject on demand instead of
// making the user reload every tab.
async function injectContentScripts(tabId: number) {
  const files = (chrome.runtime.getManifest().content_scripts ?? []).flatMap(
    (script) => script.js ?? []
  )
  if (files.length > 0) {
    await chrome.scripting.executeScript({ target: { tabId }, files })
  }

  // The MAIN-world script is registered at runtime rather than declared in the
  // manifest, so its file list has to come from the registration.
  const registered = await chrome.scripting.getRegisteredContentScripts()
  const mainWorldFiles = registered
    .filter((script) => script.world === MAIN_WORLD)
    .flatMap((script) => script.js ?? [])
  if (mainWorldFiles.length > 0) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: mainWorldFiles,
      world: MAIN_WORLD,
    })
  }
}

async function sendToTab(tabId: number, message: { type: string }) {
  try {
    await chrome.tabs.sendMessage(tabId, message)
    return
  } catch {
    // No listener yet — fall through and inject.
  }
  try {
    await injectContentScripts(tabId)
    await chrome.tabs.sendMessage(tabId, message)
  } catch {
    // chrome:// pages, the Chrome Web Store and the PDF viewer forbid
    // injection. tegakari cannot run there, so there is nothing to report.
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.id) {
    await sendToTab(tab.id, { type: "TEGAKARI_TOGGLE" })
  }
})

const CONTEXT_MENU_ID = "tegakari-select-element"

// Context menu entry to annotate the right-clicked element (#37). The menu is
// (re)created in onInstalled — calling `contextMenus.create` at the top level
// would throw "duplicate id" on every MV3 service-worker restart.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "tegakari: この要素を選択",
      contexts: ["all"],
    })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  // frameId 0 = top frame only. Right-clicks inside an iframe aren't observed
  // by the top-frame content script, so ignore them rather than annotate a
  // stale element from a previous top-frame right-click.
  if (
    info.menuItemId === CONTEXT_MENU_ID &&
    info.frameId === 0 &&
    tab?.id
  ) {
    void sendToTab(tab.id, { type: "TEGAKARI_CONTEXT_SELECT" })
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TEGAKARI_OPEN_OPTIONS") {
    // `chrome.runtime.openOptionsPage()` silently no-ops in some Chromium
    // derivatives (notably Arc), even when `options_ui.open_in_tab` is true.
    // Opening the options page as a plain tab works uniformly across
    // Chrome / Arc / Edge / Brave.
    chrome.tabs.create({ url: chrome.runtime.getURL("options.html") })
    return false
  }
  if (message?.type === "TEGAKARI_CAPTURE") {
    chrome.tabs
      .captureVisibleTab({ format: "png" })
      .then((dataUrl) => {
        sendResponse({ success: true, dataUrl })
      })
      .catch((error) => {
        sendResponse({ success: false, error: String(error) })
      })
    return true // keep channel open for async response
  }
})
