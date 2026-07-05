import type { UiBaseOptions, UiSize, UiTone } from "./types";

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
