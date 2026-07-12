/**
 * @file extensions.ts
 * @description Composition boundary for extension lifecycle APIs.
 */

import type { HtmxApi } from "../htmx.js"

/**
 * Dependencies required to wire extension APIs.
 */
export interface ExtensionsModuleDeps {
  htmx: HtmxApi
  defineExtension: HtmxApi["defineExtension"]
  removeExtension: HtmxApi["removeExtension"]
}

/**
 * Wires extension APIs while preserving behavior.
 */
export function registerExtensionsModule(deps: ExtensionsModuleDeps): void {
  deps.htmx.defineExtension = deps.defineExtension
  deps.htmx.removeExtension = deps.removeExtension
}
