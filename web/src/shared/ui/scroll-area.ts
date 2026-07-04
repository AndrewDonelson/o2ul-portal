import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export function createScrollArea(content: HTMLElement, options?: UiBaseOptions): HTMLElement {
  const area = document.createElement("div");
  area.className = "ui-scroll-area";
  area.appendChild(content);
  applyBaseOptions(area, options);
  return area;
}
