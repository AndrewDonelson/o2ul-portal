import type { HorizontalAlign } from "./types.js";
import {
  alignClass,
  currentYearDisplay,
  DEFAULT_COPYRIGHT_FROM,
  DEFAULT_COPYRIGHT_HOLDER,
} from "./utils.js";

export function createCopyrightNotice(
  holder = DEFAULT_COPYRIGHT_HOLDER,
  fromYear = DEFAULT_COPYRIGHT_FROM,
  align: HorizontalAlign = "center",
): HTMLElement {
  const root = document.createElement("div");
  root.className = `shared-copyright-notice ${alignClass(align)}`;
  root.textContent = `© ${currentYearDisplay(fromYear)} ${holder}`;
  return root;
}
