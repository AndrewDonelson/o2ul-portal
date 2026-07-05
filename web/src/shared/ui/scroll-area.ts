import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export function createScrollArea(content: HTMLElement, options?: UiBaseOptions): HTMLElement {
  const area = document.createElement("div");
  area.className = "ui-scroll-area";
  area.appendChild(content);
  applyBaseOptions(area, options);
  return area;
}
