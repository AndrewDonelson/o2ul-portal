import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export function createSeparator(options?: UiBaseOptions): HTMLElement {
  const separator = document.createElement("hr");
  separator.className = "ui-separator";
  applyBaseOptions(separator, options);
  return separator;
}
