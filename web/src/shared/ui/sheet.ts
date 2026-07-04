import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export interface SheetOptions extends UiBaseOptions {
  title: string;
  contentHtml: string;
}

export function createSheet(options: SheetOptions): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "ui-sheet-overlay";
  overlay.hidden = true;

  const panel = document.createElement("aside");
  panel.className = "ui-sheet-panel";

  const heading = document.createElement("h3");
  heading.className = "ui-sheet-title";
  heading.textContent = options.title;

  const body = document.createElement("div");
  body.className = "ui-sheet-body";
  body.innerHTML = options.contentHtml;

  panel.append(heading, body);
  overlay.appendChild(panel);

  applyBaseOptions(overlay, options);
  return overlay;
}

export function openSheet(sheet: HTMLElement): void {
  sheet.hidden = false;
}

export function closeSheet(sheet: HTMLElement): void {
  sheet.hidden = true;
}
