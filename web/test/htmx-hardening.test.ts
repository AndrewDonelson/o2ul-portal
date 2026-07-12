import { beforeEach, describe, expect, it, vi } from "vitest"
import { JSDOM } from "jsdom"

function installDom(url = "https://example.test/"): JSDOM {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"target\">old</div></body></html>", { url })
  const win = dom.window as unknown as Record<string, unknown>

  ;(globalThis as unknown as Record<string, unknown>).window = dom.window
  ;(globalThis as unknown as Record<string, unknown>).Window = win.Window
  ;(globalThis as unknown as Record<string, unknown>).document = dom.window.document
  ;(globalThis as unknown as Record<string, unknown>).Document = win.Document
  ;(globalThis as unknown as Record<string, unknown>).DocumentFragment = win.DocumentFragment
  ;(globalThis as unknown as Record<string, unknown>).location = dom.window.location
  ;(globalThis as unknown as Record<string, unknown>).Node = win.Node
  ;(globalThis as unknown as Record<string, unknown>).Element = win.Element
  ;(globalThis as unknown as Record<string, unknown>).HTMLElement = win.HTMLElement
  ;(globalThis as unknown as Record<string, unknown>).HTMLFormElement = win.HTMLFormElement
  ;(globalThis as unknown as Record<string, unknown>).HTMLButtonElement = win.HTMLButtonElement
  ;(globalThis as unknown as Record<string, unknown>).HTMLInputElement = win.HTMLInputElement
  ;(globalThis as unknown as Record<string, unknown>).HTMLSelectElement = win.HTMLSelectElement
  ;(globalThis as unknown as Record<string, unknown>).HTMLOptionElement = win.HTMLOptionElement
  ;(globalThis as unknown as Record<string, unknown>).HTMLTextAreaElement = win.HTMLTextAreaElement
  ;(globalThis as unknown as Record<string, unknown>).HTMLTemplateElement = win.HTMLTemplateElement
  ;(globalThis as unknown as Record<string, unknown>).ShadowRoot = win.ShadowRoot
  ;(globalThis as unknown as Record<string, unknown>).Event = win.Event
  ;(globalThis as unknown as Record<string, unknown>).CustomEvent = win.CustomEvent
  ;(globalThis as unknown as Record<string, unknown>).EventTarget = win.EventTarget
  ;(globalThis as unknown as Record<string, unknown>).MutationObserver = win.MutationObserver
  ;(globalThis as unknown as Record<string, unknown>).DOMParser = win.DOMParser
  ;(globalThis as unknown as Record<string, unknown>).XPathEvaluator = win.XPathEvaluator
  ;(globalThis as unknown as Record<string, unknown>).XPathResult = win.XPathResult
  ;(globalThis as unknown as Record<string, unknown>).FormData = win.FormData
  ;(globalThis as unknown as Record<string, unknown>).Blob = win.Blob
  ;(globalThis as unknown as Record<string, unknown>).Headers = win.Headers
  ;(globalThis as unknown as Record<string, unknown>).URL = win.URL
  ;(globalThis as unknown as Record<string, unknown>).ProgressEvent = win.ProgressEvent
  return dom
}

describe("HTMX hardening regressions", function() {
  beforeEach(function() {
    vi.restoreAllMocks()
    vi.resetModules()
    installDom()
  })

  it("fails closed on sanitizer error by default and emits htmx:sanitizeError", async function() {
    const module = await import("../src/htmx.ts")
    const htmx = module.default
    const target = document.getElementById("target") as Element
    let capturedText = ""

    let sawSanitizeError = false
    target.addEventListener("htmx:sanitizeError", function() {
      sawSanitizeError = true
    })

    htmx.config.sanitizeResponseFailOpen = false
    htmx.config.sanitizeResponse = function() {
      throw new Error("sanitizer boom")
    }

    htmx.defineSwapStyle("__probe_sanitize_closed__", function(_target, fragment) {
      capturedText = fragment.textContent || ""
      return true
    })

    htmx.swap(target, "new content", {
      swapStyle: "__probe_sanitize_closed__",
      swapDelay: 0,
      settleDelay: 0
    })

    expect(sawSanitizeError).toBe(true)
    expect(capturedText).toBe("")
  })

  it("supports explicit legacy fail-open sanitizer mode", async function() {
    const module = await import("../src/htmx.ts")
    const htmx = module.default
    const target = document.getElementById("target") as Element
    let capturedText = ""

    htmx.config.sanitizeResponseFailOpen = true
    htmx.config.sanitizeResponse = function() {
      throw new Error("sanitizer boom")
    }

    htmx.defineSwapStyle("__probe_sanitize_open__", function(_target, fragment) {
      capturedText = fragment.textContent || ""
      return true
    })

    htmx.swap(target, "<p>new content</p>", {
      swapStyle: "__probe_sanitize_open__",
      swapDelay: 0,
      settleDelay: 0
    })

    expect(capturedText).toContain("new content")
  })

  it("emits abort (not timeout) when manually aborted with timeout configured", async function() {
    const transportModule = await import("../src/htmx/fetch-transport.ts")
    const backend = transportModule.createFetchTransportBackend()
    const xhr = backend.createRequest()

    const fetchMock = vi.fn(function(_url: string, init?: RequestInit): Promise<Response> {
      return new Promise(function(_resolve, reject) {
        init?.signal?.addEventListener("abort", function() {
          reject(new Error("aborted"))
        })
      })
    })
    ;(globalThis as unknown as Record<string, unknown>).fetch = fetchMock

    let abortCount = 0
    let timeoutCount = 0
    xhr.onabort = function() {
      abortCount += 1
    }
    xhr.ontimeout = function() {
      timeoutCount += 1
    }

    xhr.open("GET", "https://example.test/path")
    xhr.timeout = 50

    const sending = xhr.send()
    xhr.abort()
    await sending

    expect(abortCount).toBe(1)
    expect(timeoutCount).toBe(0)
  })

  it("emits timeout when fetch transport timeout elapses", async function() {
    const transportModule = await import("../src/htmx/fetch-transport.ts")
    const backend = transportModule.createFetchTransportBackend()
    const xhr = backend.createRequest()

    const fetchMock = vi.fn(function(_url: string, init?: RequestInit): Promise<Response> {
      return new Promise(function(_resolve, reject) {
        init?.signal?.addEventListener("abort", function() {
          reject(new Error("aborted"))
        })
      })
    })
    ;(globalThis as unknown as Record<string, unknown>).fetch = fetchMock

    let abortCount = 0
    let timeoutCount = 0
    xhr.onabort = function() {
      abortCount += 1
    }
    xhr.ontimeout = function() {
      timeoutCount += 1
    }

    xhr.open("GET", "https://example.test/path")
    xhr.timeout = 1

    await xhr.send()

    expect(abortCount).toBe(0)
    expect(timeoutCount).toBe(1)
  })

  it("handles malformed ajax path gracefully and emits invalidPath", async function() {
    const module = await import("../src/htmx.ts")
    const htmx = module.default
    const target = document.getElementById("target") as Element

    let sawInvalidPath = false
    document.body.addEventListener("htmx:invalidPath", function() {
      sawInvalidPath = true
    })

    const promise = htmx.ajax("get", "http://%zz", { target: "#target" })
    expect(promise).toBeDefined()
    await expect(promise).rejects.toBeUndefined()
    expect(sawInvalidPath).toBe(true)
  })
})
