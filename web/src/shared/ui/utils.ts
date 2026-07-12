import type { UiBaseOptions, UiSize, UiTone } from "./types.js";

export function applyBaseOptions(el: HTMLElement, options?: UiBaseOptions): void {
  if (!options) return;
  if (options.id) el.id = options.id;
  if (options.className) el.classList.add(...options.className.split(" ").filter(Boolean));
}

export function sizeClass(size: UiSize = "md"): string {
  return `ui-size-${size}`;
}

export function toneClass(tone: UiTone = "default"): string {
  return `ui-tone-${tone}`;
}

export function setHxOn(el: HTMLElement, eventName: string, expression: string): void {
  el.setAttribute(`hx-on:${eventName}`, expression);
}

export function toJsonLiteral(value: unknown): string {
  return JSON.stringify(value ?? {});
}

export function dispatchCustomEventExpression(eventName: string, detail?: unknown): string {
  const safeEventName = eventName.replace(/[^a-zA-Z0-9:_-]/g, "");
  return `this.dispatchEvent(new CustomEvent('${safeEventName}', { bubbles: true, detail: ${toJsonLiteral(detail)} }))`;
}
