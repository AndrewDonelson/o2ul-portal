/**
 * @file ajax.ts
 * @description Composition boundary for AJAX-related HTMX operations.
 *
 * This module intentionally provides behavior-preserving wiring helpers.
 * Core request behavior remains implemented in the legacy-compatible runtime
 * while this boundary enables future extraction without changing public API.
 */

import type { HtmxApi } from "../htmx.js"

/**
 * Function signature for the core ajax helper implementation.
 */
export type AjaxHelper = HtmxApi["ajax"]

/**
 * Dependencies required to wire the AJAX module.
 */
export interface AjaxModuleDeps {
  htmx: HtmxApi
  ajaxHelper: AjaxHelper
}

/**
 * Wires AJAX API surface onto the runtime object.
 *
 * @param deps Module dependencies.
 */
export function registerAjaxModule(deps: AjaxModuleDeps): void {
  deps.htmx.ajax = deps.ajaxHelper
}
