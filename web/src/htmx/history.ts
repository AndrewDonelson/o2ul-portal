/**
 * @file history.ts
 * @description Composition boundary for history and URL-state operations.
 */

import type { HtmxApi } from "../htmx.js"

/**
 * Dependencies for history module registration.
 */
export interface HistoryModuleDeps {
  htmx: HtmxApi
  location: Location
}

/**
 * Wires history-facing runtime values.
 */
export function registerHistoryModule(deps: HistoryModuleDeps): void {
  deps.htmx.location = deps.location
}
