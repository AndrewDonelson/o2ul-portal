import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export function createSeparator(options?: UiBaseOptions): HTMLElement {
  const separator = document.createElement("hr");
  separator.className = "ui-separator";
  applyBaseOptions(separator, options);
  return separator;
}
