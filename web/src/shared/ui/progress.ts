import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export interface ProgressOptions extends UiBaseOptions {
  value: number;
  max?: number;
}

export function createProgress(options: ProgressOptions): HTMLElement {
  const max = options.max ?? 100;
  const clamped = Math.max(0, Math.min(options.value, max));

  const root = document.createElement("div");
  root.className = "ui-progress";

  const bar = document.createElement("div");
  bar.className = "ui-progress-bar";
  bar.style.width = `${(clamped / max) * 100}%`;

  root.appendChild(bar);
  applyBaseOptions(root, options);
  return root;
}
