/**
 * @file history-runtime.ts
 * @description Full history runtime extracted from htmx.ts.
 */

import type { HtmxConfig, HtmxSettleTask, HtmxSwapSpecification, SwapOptions, HtmxHistoryItem } from "../htmx.js"

export interface HistoryRuntimeDeps {
  getDocument: () => Document
  canAccessLocalStorage: () => boolean
  parseJSON: <T = unknown>(jString: string | null) => T | null
  normalizePath: (path: string) => string
  triggerEvent: (elt: EventTarget | string, eventName: string, detail?: unknown) => boolean
  triggerErrorEvent: (elt: EventTarget | string, eventName: string, detail?: Record<string, unknown>) => void
  swap: (target: string | Element, content: string, swapSpec: HtmxSwapSpecification, swapOptions?: SwapOptions) => void
  createTransportRequest: () => XMLHttpRequest
  htmxConfig: () => HtmxConfig
  htmxLocation: () => Location
  findAll: (eltOrSelector: ParentNode | string, selector?: string) => NodeListOf<Element>
  removeClassFromElement: (node: Node | string, clazz: string, delay?: number) => void
  forEach: <T>(arr: ArrayLike<T> | null | undefined, func: (item: T) => void) => void
  endsWith: (str: string, suffix: string) => boolean
}

export interface HistoryRuntime {
  setCurrentPathForHistory: (path: string) => void
  getHistoryElement: () => Element
  saveToHistoryCache: (url: string, rootElt: Element) => void
  getCachedHistory: (url: string) => HtmxHistoryItem | null
  saveCurrentPageToHistory: () => void
  pushUrlIntoHistory: (path: string) => void
  replaceUrlInHistory: (path: string) => void
  settleImmediately: (tasks: HtmxSettleTask[]) => void
  loadHistoryFromServer: (path: string) => void
  restoreHistory: (path?: string) => void
}

export function createHistoryRuntime(deps: HistoryRuntimeDeps): HistoryRuntime {
  let currentPathForHistory = ""

  function setCurrentPathForHistory(path: string): void {
    currentPathForHistory = path
    if (deps.canAccessLocalStorage()) {
      sessionStorage.setItem("htmx-current-path-for-history", path)
    }
  }

  function getHistoryElement(): Element {
    const historyElt = deps.getDocument().querySelector("[hx-history-elt],[data-hx-history-elt]")
    return historyElt || deps.getDocument().body
  }

  function cleanInnerHtmlForHistory(elt: Element): string {
    const className = deps.htmxConfig().requestClass
    const clone = elt.cloneNode(true) as Element
    deps.forEach(deps.findAll(clone, "." + className), function(child) {
      deps.removeClassFromElement(child, className)
    })
    deps.forEach(deps.findAll(clone, "[data-disabled-by-htmx]"), function(child) {
      child.removeAttribute("disabled")
    })
    return clone.innerHTML
  }

  function saveToHistoryCache(url: string, rootElt: Element): void {
    if (!deps.canAccessLocalStorage()) {
      return
    }

    const innerHTML = cleanInnerHtmlForHistory(rootElt)
    const title = deps.getDocument().title
    const scroll = window.scrollY

    if (deps.htmxConfig().historyCacheSize <= 0) {
      sessionStorage.removeItem("htmx-history-cache")
      return
    }

    url = deps.normalizePath(url)

    const historyCache: HtmxHistoryItem[] = deps.parseJSON(sessionStorage.getItem("htmx-history-cache")) || []
    for (let i = 0; i < historyCache.length; i++) {
      const item = historyCache[i]
      if (item && item.url === url) {
        historyCache.splice(i, 1)
        break
      }
    }

    const newHistoryItem: HtmxHistoryItem = { url, content: innerHTML, title, scroll }

    deps.triggerEvent(deps.getDocument().body, "htmx:historyItemCreated", { item: newHistoryItem, cache: historyCache })

    historyCache.push(newHistoryItem)
    while (historyCache.length > deps.htmxConfig().historyCacheSize) {
      historyCache.shift()
    }

    while (historyCache.length > 0) {
      try {
        sessionStorage.setItem("htmx-history-cache", JSON.stringify(historyCache))
        break
      } catch (e) {
        deps.triggerErrorEvent(deps.getDocument().body, "htmx:historyCacheError", { cause: e, cache: historyCache as unknown as Record<string, unknown> })
        historyCache.shift()
      }
    }
  }

  function getCachedHistory(url: string): HtmxHistoryItem | null {
    if (!deps.canAccessLocalStorage()) {
      return null
    }

    url = deps.normalizePath(url)

    const historyCache: HtmxHistoryItem[] = deps.parseJSON(sessionStorage.getItem("htmx-history-cache")) || []
    for (let i = 0; i < historyCache.length; i++) {
      const item = historyCache[i]
      if (item && item.url === url) {
        return item
      }
    }
    return null
  }

  function saveCurrentPageToHistory(): void {
    const elt = getHistoryElement()
    let path = currentPathForHistory
    if (deps.canAccessLocalStorage()) {
      path = sessionStorage.getItem("htmx-current-path-for-history") || ""
    }
    path = path || location.pathname + location.search

    const disableHistoryCache = deps.getDocument().querySelector("[hx-history=\"false\" i],[data-hx-history=\"false\" i]")
    if (!disableHistoryCache) {
      deps.triggerEvent(deps.getDocument().body, "htmx:beforeHistorySave", { path, historyElt: elt })
      saveToHistoryCache(path, elt)
    }

    if (deps.htmxConfig().historyEnabled) {
      history.replaceState({ htmx: true }, deps.getDocument().title, location.href)
    }
  }

  function pushUrlIntoHistory(path: string): void {
    if (deps.htmxConfig().getCacheBusterParam) {
      path = path.replace(/org\.htmx\.cache-buster=[^&]*&?/, "")
      if (deps.endsWith(path, "&") || deps.endsWith(path, "?")) {
        path = path.slice(0, -1)
      }
    }
    if (deps.htmxConfig().historyEnabled) {
      history.pushState({ htmx: true }, "", path)
    }
    setCurrentPathForHistory(path)
  }

  function replaceUrlInHistory(path: string): void {
    if (deps.htmxConfig().historyEnabled) {
      history.replaceState({ htmx: true }, "", path)
    }
    setCurrentPathForHistory(path)
  }

  function settleImmediately(tasks: HtmxSettleTask[]): void {
    deps.forEach(tasks, function(task) {
      task.call(undefined)
    })
  }

  function loadHistoryFromServer(path: string): void {
    const request = deps.createTransportRequest()
    const swapSpec: HtmxSwapSpecification = { swapStyle: "innerHTML", swapDelay: 0, settleDelay: 0 }
    const details: { path: string, xhr: XMLHttpRequest, historyElt: Element, swapSpec: HtmxSwapSpecification, response?: unknown } =
      { path, xhr: request, historyElt: getHistoryElement(), swapSpec }

    request.open("GET", path, true)
    if (deps.htmxConfig().historyRestoreAsHxRequest) {
      request.setRequestHeader("HX-Request", "true")
    }
    request.setRequestHeader("HX-History-Restore-Request", "true")
    request.setRequestHeader("HX-Current-URL", location.href)

    request.onload = function() {
      if (this.status >= 200 && this.status < 400) {
        details.response = this.response
        deps.triggerEvent(deps.getDocument().body, "htmx:historyCacheMissLoad", details)
        deps.swap(details.historyElt, details.response as string, swapSpec, {
          contextElement: details.historyElt,
          historyRequest: true
        })
        setCurrentPathForHistory(details.path)
        deps.triggerEvent(deps.getDocument().body, "htmx:historyRestore", { path, cacheMiss: true, serverResponse: details.response })
      } else {
        deps.triggerErrorEvent(deps.getDocument().body, "htmx:historyCacheMissLoadError", details)
      }
    }

    if (deps.triggerEvent(deps.getDocument().body, "htmx:historyCacheMiss", details)) {
      request.send()
    }
  }

  function restoreHistory(path?: string): void {
    saveCurrentPageToHistory()
    path = path || location.pathname + location.search
    const cached = getCachedHistory(path)
    if (cached) {
      const swapSpec: HtmxSwapSpecification = { swapStyle: "innerHTML", swapDelay: 0, settleDelay: 0, scroll: cached.scroll }
      const details = { path, item: cached, historyElt: getHistoryElement(), swapSpec }
      if (deps.triggerEvent(deps.getDocument().body, "htmx:historyCacheHit", details)) {
        deps.swap(details.historyElt, cached.content, swapSpec, {
          contextElement: details.historyElt,
          title: cached.title
        })
        setCurrentPathForHistory(details.path)
        deps.triggerEvent(deps.getDocument().body, "htmx:historyRestore", details)
      }
    } else {
      if (deps.htmxConfig().refreshOnHistoryMiss) {
        ;(deps.htmxLocation() as unknown as { reload: (forced?: boolean) => void }).reload(true)
      } else {
        loadHistoryFromServer(path)
      }
    }
  }

  return {
    setCurrentPathForHistory,
    getHistoryElement,
    saveToHistoryCache,
    getCachedHistory,
    saveCurrentPageToHistory,
    pushUrlIntoHistory,
    replaceUrlInHistory,
    settleImmediately,
    loadHistoryFromServer,
    restoreHistory
  }
}
