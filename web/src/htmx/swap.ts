/**
 * @file swap.ts
 * @description Composition boundary for swap/rendering operations.
 */

import type { HtmxApi } from "../htmx.js"

/**
 * Dependencies required to wire swap behavior onto the runtime API.
 */
export interface SwapModuleDeps {
  htmx: HtmxApi
  swap: HtmxApi["swap"]
  defineSwapStyle: HtmxApi["defineSwapStyle"]
  removeSwapStyle: HtmxApi["removeSwapStyle"]
}

/**
 * Wires swap APIs while preserving existing behavior.
 */
export function registerSwapModule(deps: SwapModuleDeps): void {
  deps.htmx.swap = deps.swap
  deps.htmx.defineSwapStyle = deps.defineSwapStyle
  deps.htmx.removeSwapStyle = deps.removeSwapStyle
}
