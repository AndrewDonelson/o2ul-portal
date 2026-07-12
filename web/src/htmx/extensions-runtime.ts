/**
 * @file extensions-runtime.ts
 * @description Extension runtime extracted from core for maintainability.
 */

import type {
  HtmxExtension,
  HtmxInternalApi,
  HtmxSwapStyle,
  HtmxSettleInfo
} from "../htmx.js"

export interface ExtensionsRuntimeDeps {
  mergeObjects: <T1 extends object, T2 extends object>(obj1: T1, obj2: T2) => T1 & T2
  getAttributeValue: (elt: Node, qualifiedName: string) => string | null
  asElement: (elt: unknown) => Element | null
  parentElt: (elt: Node) => Node | null
  forEach: <T>(arr: ArrayLike<T> | null | undefined, func: (item: T) => void) => void
  getInternalApi: () => HtmxInternalApi
}

export interface ExtensionsRuntime {
  defineExtension: (name: string, extension: Partial<HtmxExtension>) => void
  removeExtension: (name: string) => void
  getExtensions: (elt?: Element, extensionsToReturn?: HtmxExtension[], extensionsToIgnore?: string[]) => HtmxExtension[]
  listExtensions: () => HtmxExtension[]
}

function extensionBase(): HtmxExtension {
  return {
    init: function(_api) { return undefined as unknown as void },
    getSelectors: function() { return null },
    onEvent: function(_name, _evt) { return true },
    transformResponse: function(text, _xhr, _elt) { return text },
    isInlineSwap: function(_swapStyle: HtmxSwapStyle) { return false },
    handleSwap: function(_swapStyle: HtmxSwapStyle, _target: Node, _fragment: Node, _settleInfo: HtmxSettleInfo) { return false },
    encodeParameters: function(_xhr: XMLHttpRequest, _parameters: FormData, _elt: Node) { return null }
  }
}

export function createExtensionsRuntime(deps: ExtensionsRuntimeDeps): ExtensionsRuntime {
  const extensions: Record<string, HtmxExtension> = {}

  function defineExtension(name: string, extension: Partial<HtmxExtension>): void {
    if (extension.init) {
      extension.init(deps.getInternalApi())
    }
    extensions[name] = deps.mergeObjects(extensionBase(), extension)
  }

  function removeExtension(name: string): void {
    delete extensions[name]
  }

  function getExtensions(elt?: Element, extensionsToReturn?: HtmxExtension[], extensionsToIgnore?: string[]): HtmxExtension[] {
    if (extensionsToReturn == undefined) {
      extensionsToReturn = []
    }
    if (elt == undefined) {
      return extensionsToReturn
    }
    if (extensionsToIgnore == undefined) {
      extensionsToIgnore = []
    }

    const extensionsForElement = deps.getAttributeValue(elt, "hx-ext")
    if (extensionsForElement) {
      deps.forEach(extensionsForElement.split(","), function(extensionName) {
        extensionName = extensionName.replace(/ /g, "")
        if (extensionName.slice(0, 7) === "ignore:") {
          extensionsToIgnore!.push(extensionName.slice(7))
          return
        }

        if (extensionsToIgnore!.indexOf(extensionName) < 0) {
          const extension = extensions[extensionName]
          if (extension && extensionsToReturn!.indexOf(extension) < 0) {
            extensionsToReturn!.push(extension)
          }
        }
      })
    }

    return getExtensions(deps.asElement(deps.parentElt(elt) as unknown) || undefined, extensionsToReturn, extensionsToIgnore)
  }

  function listExtensions(): HtmxExtension[] {
    return Object.values(extensions)
  }

  return {
    defineExtension,
    removeExtension,
    getExtensions,
    listExtensions
  }
}
