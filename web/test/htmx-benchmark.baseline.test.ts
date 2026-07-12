import { describe, expect, it, vi } from "vitest"
import { JSDOM } from "jsdom"
import { mkdir, writeFile } from "node:fs/promises"

function installDom(url = "https://bench.example.test/"): JSDOM {
  const dom = new JSDOM("<!doctype html><html><body><main id=\"bench-root\"></main></body></html>", { url })
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
  ;(globalThis as unknown as Record<string, unknown>).CSS = win.CSS
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

function now(win: Window): number {
  return win.performance.now()
}

function median(values: number[]): number {
  const sorted = [...values].sort(function(a, b) { return a - b })
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return ((sorted[middle - 1] || 0) + (sorted[middle] || 0)) / 2
  }
  return sorted[middle] || 0
}

describe("HTMX baseline benchmark", function() {
  it("captures large-DOM process and mutation baseline timings", async function() {
    const nodeCount = 2500
    const mutationCount = 500
    const sampleCount = 3
    const processSamples: number[] = []
    const mutationSamples: number[] = []

    for (let sample = 0; sample < sampleCount; sample++) {
      vi.resetModules()
      const dom = installDom(`https://bench.example.test/?sample=${sample}`)
      const module = await import("../src/htmx.ts")
      const htmx = module.default
      const root = document.getElementById("bench-root") as Element

      const parts: string[] = []
      for (let i = 0; i < nodeCount; i++) {
        parts.push(`<section class=\"card\"><button hx-trigger=\"click\" hx-get=\"/x/${i}\">${i}</button><div hx-trigger=\"revealed\"></div></section>`)
      }
      root.innerHTML = parts.join("")

      const t1 = now(dom.window)
      htmx.process(root)
      processSamples.push(now(dom.window) - t1)

      const mutationBatch = document.createElement("div")
      const mutationParts: string[] = []
      for (let i = 0; i < mutationCount; i++) {
        mutationParts.push(`<article><button hx-trigger=\"click\" hx-get=\"/m/${i}\">m${i}</button></article>`)
      }
      mutationBatch.innerHTML = mutationParts.join("")

      htmx.config.useMutationObserverProcessing = true
      htmx.init()

      const t2 = now(dom.window)
      root.appendChild(mutationBatch)
      await new Promise(function(resolve) {
        setTimeout(resolve, 0)
      })
      mutationSamples.push(now(dom.window) - t2)
    }

    const processMs = median(processSamples)
    const mutationMs = median(mutationSamples)

    // Very loose sanity bounds to keep this as a baseline collector, not a brittle perf gate.
    expect(processMs).toBeGreaterThan(0)
    expect(processMs).toBeLessThan(10000)
    expect(mutationMs).toBeGreaterThanOrEqual(0)
    expect(mutationMs).toBeLessThan(5000)

    const snapshot = {
      benchmark: "htmx-baseline",
      nodeCount,
      mutationCount,
      sampleCount,
      processSamplesMs: processSamples,
      mutationSamplesMs: mutationSamples,
      processMedianMs: processMs,
      mutationMedianMs: mutationMs,
      timestamp: new Date().toISOString()
    }
    await mkdir("benchmarks", { recursive: true })
    await writeFile("benchmarks/latest.json", JSON.stringify(snapshot, null, 2), "utf-8")

    console.log(
      `[htmx-benchmark] process_${nodeCount}_nodes_median_ms=${processMs.toFixed(2)} mutation_${mutationCount}_nodes_median_ms=${mutationMs.toFixed(2)} samples=${sampleCount}`
    )
  }, 30_000)
})
