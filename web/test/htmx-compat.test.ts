import { beforeEach, describe, expect, it, vi } from "vitest"
import { JSDOM } from "jsdom"

function installDom(url = "https://example.test/"): JSDOM {
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { url })
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
  const cssObj = ((win.CSS as Record<string, unknown> | undefined) || {
    escape: function(value: unknown) {
      return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&")
    }
  }) as Record<string, unknown>
  if (typeof cssObj.escape !== "function") {
    cssObj.escape = function(value: unknown) {
      return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&")
    }
  }
  ;(globalThis as unknown as Record<string, unknown>).CSS = cssObj
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

describe("HTMX browser compatibility paths", function() {
  beforeEach(function() {
    vi.restoreAllMocks()
    vi.resetModules()
    installDom()
  })

  it("processes hx-on wildcard attributes when XPath evaluator requires explicit result type", async function() {
    class StrictXPathEvaluator {
      createExpression(_expression: string): { evaluate: (root: Node, type?: number) => { iterateNext: () => Node | null } } {
        return {
          evaluate: function(root: Node, type?: number) {
            if (type === undefined) {
              throw new Error("result type required")
            }
            const all = (root as ParentNode).querySelectorAll ? (root as ParentNode).querySelectorAll('*') : []
            let index = 0
            return {
              iterateNext: function() {
                while (index < all.length) {
                  const n = all[index++]
                  if (!n) {
                    continue
                  }
                  const attrs = (n as Element).attributes
                  for (let i = 0; i < attrs.length; i++) {
                    const attr = attrs[i]
                    if (!attr) {
                      continue
                    }
                    if (attr.name.startsWith("hx-on:") || attr.name.startsWith("data-hx-on:")) {
                      return n
                    }
                  }
                }
                return null
              }
            }
          }
        }
      }
    }
    ;(globalThis as unknown as Record<string, unknown>).XPathEvaluator = StrictXPathEvaluator

    const module = await import("../src/htmx.ts")
    const htmx = module.default

    const root = document.getElementById("root") as Element
    root.innerHTML = "<button id=\"b\" hx-on:click=\"this.setAttribute('data-fired','1')\">x</button>"

    htmx.config.allowEval = true
    htmx.process(root)

    const button = document.getElementById("b") as HTMLButtonElement
    button.click()

    expect(button.getAttribute("data-fired")).toBe("1")
  })

  it("falls back to DOM scanning when XPathEvaluator is unavailable", async function() {
    const oldXPathEvaluator = (globalThis as unknown as Record<string, unknown>).XPathEvaluator
    ;(globalThis as unknown as Record<string, unknown>).XPathEvaluator = undefined

    const module = await import("../src/htmx.ts")
    const htmx = module.default

    const root = document.getElementById("root") as Element
    root.innerHTML = "<button id=\"fallback\" hx-on:click=\"this.setAttribute('data-fallback','1')\">x</button>"

    htmx.config.allowEval = true
    htmx.process(root)

    const button = document.getElementById("fallback") as HTMLButtonElement
    button.click()

    expect(button.getAttribute("data-fallback")).toBe("1")
    ;(globalThis as unknown as Record<string, unknown>).XPathEvaluator = oldXPathEvaluator
  })

  it("uses DOMParser fallback when parseHTMLUnsafe is not available", async function() {
    const docCtor = (globalThis as unknown as Record<string, unknown>).Document as Record<string, unknown>
    const originalParseHTMLUnsafe = docCtor.parseHTMLUnsafe
    delete docCtor.parseHTMLUnsafe

    const module = await import("../src/htmx.ts")
    const htmx = module.default

    const root = document.getElementById("root") as Element

    htmx.swap(root, "<div id='from-parser'>ok</div>", {
      swapStyle: "innerHTML",
      swapDelay: 0,
      settleDelay: 0
    })

    expect(document.getElementById("from-parser")?.textContent).toBe("ok")

    if (originalParseHTMLUnsafe) {
      docCtor.parseHTMLUnsafe = originalParseHTMLUnsafe
    }
  })
})
