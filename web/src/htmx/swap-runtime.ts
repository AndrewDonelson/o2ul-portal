/**
 * @file swap-runtime.ts
 * @description Swap execution runtime extracted from htmx.ts.
 */

import type {
  DocumentFragmentWithTitle,
  HtmxExtension,
  HtmxSettleInfo,
  HtmxSettleTask,
  HtmxSwapSpecification,
  HtmxSwapStyle,
  HtmxSwapStyleHandler,
  SwapOptions
} from "../htmx.js"

export interface SwapRuntimeDeps {
  getDocument: () => Document
  getWindow: () => Window
  htmxConfig: () => {
    addedClass: string
    settlingClass: string
    swappingClass: string
    defaultSwapStyle: HtmxSwapStyle
    defaultFocusScroll: boolean
    globalViewTransitions: boolean
    allowNestedOobSwaps: boolean
  }
  findAll: (elt: ParentNode, selector: string) => NodeListOf<Element>
  forEach: <T>(arr: ArrayLike<T> | null | undefined, iterator: (value: T) => void) => void
  getAttributeValue: (elt: Node, qualifiedName: string) => string | null
  removeClassFromElement: (elt: string | Node, clazz: string, delay?: number) => void
  addClassToElement: (elt: string | Element, clazz: string, delay?: number) => void
  triggerEvent: (elt: EventTarget | string, eventName: string, detail?: unknown) => boolean
  triggerErrorEvent: (elt: EventTarget | string, eventName: string, detail?: Record<string, unknown>) => void
  resolveTarget: (eltOrSelector: EventTarget | string, context?: Node) => EventTarget | null
  getRootNode: (elt: Node, global: boolean) => Node | Document
  makeSettleInfo: (target: Element) => HtmxSettleInfo
  sanitizeResponse: (content: string, context: { target: Element, contextElement?: Element }) => string
  makeFragment: (response: string) => DocumentFragmentWithTitle
  oobSwap: (oobValue: string, oobElement: Element, settleInfo: HtmxSettleInfo, rootNode?: Node | Document) => void
  handlePreservedElements: (fragment: ParentNode) => void
  restorePreservedElements: () => void
  bodyContains: (elt: Node) => boolean
  getRawAttribute: (elt: Node, name: string) => string | false | null
  asElement: (elt: unknown) => Element | null
  maybeCall: (func: (() => void) | null | undefined) => void
  handleTitle: (title: string) => void
  updateScrollState: (content: Element[], swapSpec: HtmxSwapSpecification) => void
  parentElt: (elt: Node) => Node | null
  cleanUpElement: (element: Node) => void
  insertNodesBefore: (parentNode: Node, insertBefore: Node | null, fragment: ParentNode, settleInfo: HtmxSettleInfo) => void
  makeAjaxLoadTask: (child: Node) => HtmxSettleTask
  getExtensions: (elt?: Element, extensionsToReturn?: HtmxExtension[], extensionsToIgnore?: string[]) => HtmxExtension[]
  swapStyleRegistryGet: (style: HtmxSwapStyle) => HtmxSwapStyleHandler | undefined
  logError: (msg: unknown) => void
}

export interface SwapRuntime {
  swapWithStyle: (swapStyle: HtmxSwapStyle, elt: Element | undefined, target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo) => void
  findAndSwapOobElements: (fragment: ParentNode, settleInfo: HtmxSettleInfo, rootNode?: Node | Document) => boolean
  swap: (target: string | Element, content: string, swapSpec: HtmxSwapSpecification, swapOptions?: SwapOptions) => void
}

export function createSwapRuntime(deps: SwapRuntimeDeps): SwapRuntime {
  function swapOuterHTML(target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    if (target.tagName === "BODY") {
      return swapInnerHTML(target, fragment, settleInfo)
    }
    let newElt: Node | null
    const eltBeforeNewContent = target.previousSibling
    const parentNode = deps.parentElt(target)
    if (!parentNode) {
      return
    }
    deps.insertNodesBefore(parentNode, target, fragment, settleInfo)
    if (eltBeforeNewContent == null) {
      newElt = parentNode.firstChild
    } else {
      newElt = eltBeforeNewContent.nextSibling
    }
    settleInfo.elts = settleInfo.elts.filter(function(e) { return e !== target })
    while (newElt && newElt !== target) {
      if (newElt instanceof Element) {
        settleInfo.elts.push(newElt)
      }
      newElt = newElt.nextSibling
    }
    deps.cleanUpElement(target)
    target.remove()
  }

  function swapAfterBegin(target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    return deps.insertNodesBefore(target, target.firstChild, fragment, settleInfo)
  }

  function swapBeforeBegin(target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    return deps.insertNodesBefore(deps.parentElt(target)!, target, fragment, settleInfo)
  }

  function swapBeforeEnd(target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    return deps.insertNodesBefore(target, null, fragment, settleInfo)
  }

  function swapAfterEnd(target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    return deps.insertNodesBefore(deps.parentElt(target)!, target.nextSibling, fragment, settleInfo)
  }

  function swapDelete(target: Element): void {
    deps.cleanUpElement(target)
    const parent = deps.parentElt(target)
    if (parent) {
      return (parent as Element).removeChild(target) as unknown as void
    }
  }

  function swapInnerHTML(target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    const firstChild = target.firstChild
    deps.insertNodesBefore(target, firstChild, fragment, settleInfo)
    if (firstChild) {
      while (firstChild.nextSibling) {
        deps.cleanUpElement(firstChild.nextSibling)
        target.removeChild(firstChild.nextSibling)
      }
      deps.cleanUpElement(firstChild)
      target.removeChild(firstChild)
    }
  }

  function swapWithStyle(swapStyle: HtmxSwapStyle, elt: Element | undefined, target: Element, fragment: ParentNode, settleInfo: HtmxSettleInfo): void {
    switch (swapStyle) {
      case "none":
        return
      case "outerHTML":
        swapOuterHTML(target, fragment, settleInfo)
        return
      case "afterbegin":
        swapAfterBegin(target, fragment, settleInfo)
        return
      case "beforebegin":
        swapBeforeBegin(target, fragment, settleInfo)
        return
      case "beforeend":
        swapBeforeEnd(target, fragment, settleInfo)
        return
      case "afterend":
        swapAfterEnd(target, fragment, settleInfo)
        return
      case "delete":
        swapDelete(target)
        return
      default: {
        const strategy = deps.swapStyleRegistryGet(swapStyle)
        if (strategy && strategy(target, fragment, settleInfo, elt)) {
          return
        }
        const extensionsForElt = deps.getExtensions(elt)
        for (let i = 0; i < extensionsForElt.length; i++) {
          const ext = extensionsForElt[i]
          if (!ext) {
            continue
          }
          try {
            const newElements = ext.handleSwap(swapStyle, target, fragment as unknown as Node, settleInfo)
            if (newElements) {
              if (Array.isArray(newElements)) {
                for (let j = 0; j < newElements.length; j++) {
                  const child = newElements[j]
                  if (!child) {
                    continue
                  }
                  if (child.nodeType !== Node.TEXT_NODE && child.nodeType !== Node.COMMENT_NODE) {
                    settleInfo.tasks.push(deps.makeAjaxLoadTask(child))
                  }
                }
              }
              return
            }
          } catch (e) {
            deps.logError(e)
          }
        }
        if (swapStyle === "innerHTML") {
          swapInnerHTML(target, fragment, settleInfo)
        } else {
          swapWithStyle(deps.htmxConfig().defaultSwapStyle, elt, target, fragment, settleInfo)
        }
      }
    }
  }

  function findAndSwapOobElements(fragment: ParentNode, settleInfo: HtmxSettleInfo, rootNode?: Node | Document): boolean {
    const oobElts = deps.findAll(fragment, "[hx-swap-oob], [data-hx-swap-oob]")
    deps.forEach(oobElts, function(oobElement) {
      if (deps.htmxConfig().allowNestedOobSwaps || oobElement.parentElement === null) {
        const oobValue = deps.getAttributeValue(oobElement, "hx-swap-oob")
        if (oobValue != null) {
          deps.oobSwap(oobValue, oobElement, settleInfo, rootNode)
        }
      } else {
        oobElement.removeAttribute("hx-swap-oob")
        oobElement.removeAttribute("data-hx-swap-oob")
      }
    })
    return oobElts.length > 0
  }

  function swap(target: string | Element, content: string, swapSpec: HtmxSwapSpecification, swapOptions?: SwapOptions): void {
    if (!swapOptions) {
      swapOptions = {}
    }
    let settleResolve: (() => void) | null = null
    let settleReject: (() => void) | null = null

    let doSwap = function() {
      deps.maybeCall(swapOptions!.beforeSwapCallback)

      const resolvedTarget = deps.resolveTarget(target as unknown as EventTarget) as Element
      const rootNode = swapOptions!.contextElement ? deps.getRootNode(swapOptions!.contextElement, false) : deps.getDocument()

      const activeElt = deps.getDocument().activeElement as (HTMLInputElement | HTMLTextAreaElement | null)
      const selectionInfo = {
        elt: activeElt,
        start: activeElt ? (activeElt as HTMLInputElement).selectionStart : null,
        end: activeElt ? (activeElt as HTMLInputElement).selectionEnd : null
      }
      const settleInfo = deps.makeSettleInfo(resolvedTarget)

      if (swapSpec.swapStyle === "textContent") {
        resolvedTarget.textContent = content
      } else {
        const sanitizedContent = deps.sanitizeResponse(content, {
          target: resolvedTarget,
          contextElement: swapOptions!.contextElement
        })
        let fragment: DocumentFragmentWithTitle | ParentNode = deps.makeFragment(sanitizedContent)

        settleInfo.title = swapOptions!.title || (fragment as DocumentFragmentWithTitle).title
        if (swapOptions!.historyRequest) {
          fragment = (fragment as ParentNode).querySelector("[hx-history-elt],[data-hx-history-elt]") || fragment
        }

        if (swapOptions!.selectOOB) {
          const oobSelectValues = swapOptions!.selectOOB.split(",")
          for (let i = 0; i < oobSelectValues.length; i++) {
            const rawOobSelectValue = oobSelectValues[i]
            if (!rawOobSelectValue) {
              continue
            }
            const oobSelectValue = rawOobSelectValue.split(":", 2)
            let id = (oobSelectValue[0] || "").trim()
            if (id.indexOf("#") === 0) {
              id = id.substring(1)
            }
            const oobValue = oobSelectValue[1] || "true"
            const oobElement = (fragment as ParentNode).querySelector("#" + id)
            if (oobElement) {
              deps.oobSwap(oobValue, oobElement, settleInfo, rootNode)
            }
          }
        }
        findAndSwapOobElements(fragment as ParentNode, settleInfo, rootNode)
        deps.forEach(deps.findAll(fragment as ParentNode, "template"), function(template) {
          const t = template as HTMLTemplateElement
          if (t.content && findAndSwapOobElements(t.content, settleInfo, rootNode)) {
            t.remove()
          }
        })

        if (swapOptions!.select) {
          const newFragment = deps.getDocument().createDocumentFragment()
          deps.forEach((fragment as ParentNode).querySelectorAll(swapOptions!.select), function(node) {
            newFragment.appendChild(node)
          })
          fragment = newFragment
        }
        deps.handlePreservedElements(fragment as ParentNode)
        swapWithStyle(swapSpec.swapStyle, swapOptions!.contextElement, resolvedTarget, fragment as ParentNode, settleInfo)
        deps.restorePreservedElements()
      }

      if (selectionInfo.elt &&
        !deps.bodyContains(selectionInfo.elt) &&
        deps.getRawAttribute(selectionInfo.elt, "id")) {
        const newActiveElt = deps.getDocument().getElementById(deps.getRawAttribute(selectionInfo.elt, "id") as string)
        const focusOptions = { preventScroll: swapSpec.focusScroll !== undefined ? !swapSpec.focusScroll : !deps.htmxConfig().defaultFocusScroll }
        if (newActiveElt) {
          if (selectionInfo.start && (newActiveElt as HTMLInputElement).setSelectionRange) {
            try {
              (newActiveElt as HTMLInputElement).setSelectionRange(selectionInfo.start, selectionInfo.end!)
            } catch (e) {
              // setSelectionRange exists on some fields that do not support invocation.
            }
          }
          ;(newActiveElt as HTMLElement).focus(focusOptions)
        }
      }

      deps.removeClassFromElement(resolvedTarget, deps.htmxConfig().swappingClass)
      deps.forEach(settleInfo.elts, function(elt) {
        if (elt.classList) {
          deps.addClassToElement(elt, deps.htmxConfig().settlingClass)
        }
        deps.triggerEvent(elt, "htmx:afterSwap", swapOptions!.eventInfo)
      })
      deps.maybeCall(swapOptions!.afterSwapCallback)

      if (!swapSpec.ignoreTitle) {
        deps.handleTitle(settleInfo.title!)
      }

      const doSettle = function() {
        deps.forEach(settleInfo.tasks, function(task) {
          task.call(undefined)
        })
        deps.forEach(settleInfo.elts, function(elt) {
          if (elt.classList) {
            deps.removeClassFromElement(elt, deps.htmxConfig().settlingClass)
          }
          deps.triggerEvent(elt, "htmx:afterSettle", swapOptions!.eventInfo)
        })

        if (swapOptions!.anchor) {
          const anchorTarget = deps.asElement(deps.resolveTarget("#" + swapOptions!.anchor))
          if (anchorTarget) {
            anchorTarget.scrollIntoView({ block: "start", behavior: "auto" })
          }
        }

        deps.updateScrollState(settleInfo.elts, swapSpec)
        deps.maybeCall(swapOptions!.afterSettleCallback)
        deps.maybeCall(settleResolve)
      }

      if (swapSpec.settleDelay > 0) {
        deps.getWindow().setTimeout(doSettle, swapSpec.settleDelay)
      } else {
        doSettle()
      }
    }

    let shouldTransition = deps.htmxConfig().globalViewTransitions
    if (Object.prototype.hasOwnProperty.call(swapSpec, "transition")) {
      shouldTransition = swapSpec.transition!
    }

    const elt = swapOptions.contextElement || deps.getDocument()

    if (shouldTransition &&
      deps.triggerEvent(elt, "htmx:beforeTransition", swapOptions.eventInfo) &&
      typeof Promise !== "undefined" &&
      (deps.getDocument() as unknown as { startViewTransition?: unknown }).startViewTransition) {
      const settlePromise = new Promise<void>(function(_resolve, _reject) {
        settleResolve = _resolve
        settleReject = _reject
      })
      const innerDoSwap = doSwap
      doSwap = function() {
        ;(deps.getDocument() as unknown as { startViewTransition(cb: () => Promise<void>): void }).startViewTransition(function() {
          innerDoSwap()
          return settlePromise
        })
      }
    }

    try {
      if (swapSpec?.swapDelay && swapSpec.swapDelay > 0) {
        deps.getWindow().setTimeout(doSwap, swapSpec.swapDelay)
      } else {
        doSwap()
      }
    } catch (e) {
      deps.triggerErrorEvent(elt, "htmx:swapError", swapOptions.eventInfo as Record<string, unknown> | undefined)
      deps.maybeCall(settleReject)
      throw e
    }
  }

  return {
    swapWithStyle,
    findAndSwapOobElements,
    swap
  }
}
