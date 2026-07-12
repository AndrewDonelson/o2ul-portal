/**
 * @file trigger.ts
 * @description Composition boundary for trigger/event parsing APIs.
 */

import type { HtmxApi } from "../htmx.js"

/**
 * Dependencies required to wire trigger APIs onto the runtime API.
 */
export interface TriggerModuleDeps {
  htmx: HtmxApi
  on: HtmxApi["on"]
  off: HtmxApi["off"]
  trigger: HtmxApi["trigger"]
  defineTriggerModifier: HtmxApi["defineTriggerModifier"]
  removeTriggerModifier: HtmxApi["removeTriggerModifier"]
}

/**
 * Wires trigger APIs while preserving existing behavior.
 */
export function registerTriggerModule(deps: TriggerModuleDeps): void {
  deps.htmx.on = deps.on
  deps.htmx.off = deps.off
  deps.htmx.trigger = deps.trigger
  deps.htmx.defineTriggerModifier = deps.defineTriggerModifier
  deps.htmx.removeTriggerModifier = deps.removeTriggerModifier
}
