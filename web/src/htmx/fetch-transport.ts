/**
 * @file fetch-transport.ts
 * @description Fetch + AbortController transport that emulates XMLHttpRequest
 * surface used by the HTMX runtime.
 */

import type { HtmxTransportBackend } from "../htmx.js"

class FetchBackedXMLHttpRequest extends EventTarget {
  public upload: EventTarget = new EventTarget()

  public withCredentials = false
  public timeout = 0

  public status = 0
  public response = ""
  public responseURL = ""

  public onload: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null
  public onerror: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null
  public onabort: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null
  public ontimeout: ((this: XMLHttpRequest, ev: ProgressEvent<EventTarget>) => unknown) | null = null

  private method = "GET"
  private url = ""
  private headers = new Headers()
  private responseHeaders = new Headers()
  private aborted = false
  private timedOut = false
  private controller: AbortController | null = null

  open(method: string, url: string): void {
    this.method = method
    this.url = url
    this.aborted = false
    this.timedOut = false
  }

  setRequestHeader(name: string, value: string): void {
    this.headers.append(name, value)
  }

  overrideMimeType(_mime: string): void {
    // No-op for fetch transport; response is read as text.
  }

  getResponseHeader(name: string): string | null {
    return this.responseHeaders.get(name)
  }

  getAllResponseHeaders(): string {
    const lines: string[] = []
    this.responseHeaders.forEach(function(value, key) {
      lines.push(`${key}: ${value}`)
    })
    return lines.join("\r\n")
  }

  abort(): void {
    this.aborted = true
    this.controller?.abort()
  }

  async send(body?: XMLHttpRequestBodyInit | null): Promise<void> {
    this.controller = new AbortController()
    this.timedOut = false
    const timeoutId = this.timeout > 0
      ? setTimeout(() => {
          this.aborted = true
          this.timedOut = true
          this.controller?.abort()
        }, this.timeout)
      : null

    this.dispatchProgress("loadstart")

    try {
      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        body: body === null ? undefined : body,
        signal: this.controller.signal,
        credentials: this.withCredentials ? "include" : "same-origin"
      })

      this.status = response.status
      this.responseURL = response.url
      this.responseHeaders = response.headers
      this.response = await response.text()

      this.dispatchProgress("load")
      this.dispatchProgress("loadend")
    } catch (_error) {
      if (this.aborted) {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        if (this.timedOut) {
          this.dispatchProgress("timeout")
        } else {
          this.dispatchProgress("abort")
        }
        this.dispatchProgress("loadend")
        return
      }

      this.dispatchProgress("error")
      this.dispatchProgress("loadend")
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }

  private dispatchProgress(type: "loadstart" | "load" | "loadend" | "error" | "abort" | "timeout"): void {
    const evt = new ProgressEvent(type)
    this.dispatchEvent(evt)

    const handler = type === "load"
      ? this.onload
      : type === "error"
        ? this.onerror
        : type === "abort"
          ? this.onabort
          : type === "timeout"
            ? this.ontimeout
            : null

    if (handler) {
      handler.call(this as unknown as XMLHttpRequest, evt)
    }
  }
}

/**
 * Creates a fetch-backed transport compatible with HTMX's XHR usage.
 */
export function createFetchTransportBackend(): HtmxTransportBackend {
  return {
    createRequest: function() {
      return new FetchBackedXMLHttpRequest() as unknown as XMLHttpRequest
    }
  }
}
