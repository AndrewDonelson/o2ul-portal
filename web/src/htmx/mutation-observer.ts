/**
 * @file mutation-observer.ts
 * @description Incremental DOM processing support using MutationObserver.
 */

/**
 * Dependencies required to start mutation observer processing.
 */
export interface MutationObserverDeps {
  root: Element
  processNode: (node: Element | string) => void
}

/**
 * Starts incremental processing for added/changed elements.
 */
export function startIncrementalProcessing(deps: MutationObserverDeps): MutationObserver {
  let processing = false
  const pending = new Set<Element>()

  const observer = new MutationObserver(function(mutations) {
    if (processing) {
      return
    }

    processing = true
    try {
      for (const mutation of mutations) {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach(function(node) {
            if (node instanceof Element) {
              pending.add(node)
            }
          })
        }

        if (mutation.type === "attributes" && mutation.target instanceof Element) {
          pending.add(mutation.target)
        }
      }

      pending.forEach(function(node) {
        deps.processNode(node)
      })
      pending.clear()
    } finally {
      processing = false
    }
  })

  observer.observe(deps.root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: [
      "hx-get", "hx-post", "hx-put", "hx-delete", "hx-patch", "hx-trigger",
      "hx-target", "hx-swap", "hx-select", "hx-select-oob", "hx-include",
      "hx-params", "hx-vals", "hx-vars", "hx-boost", "hx-ext", "hx-on",
      "data-hx-get", "data-hx-post", "data-hx-put", "data-hx-delete", "data-hx-patch",
      "data-hx-trigger", "data-hx-target", "data-hx-swap", "data-hx-select",
      "data-hx-select-oob", "data-hx-include", "data-hx-params", "data-hx-vals",
      "data-hx-vars", "data-hx-boost", "data-hx-ext", "data-hx-on"
    ]
  })

  return observer
}
