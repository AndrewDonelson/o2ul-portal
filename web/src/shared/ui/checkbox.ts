import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export interface CheckboxOptions extends UiBaseOptions {
  name: string;
  checked?: boolean;
  label?: string;
}

export function createCheckbox(options: CheckboxOptions): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "ui-check-wrap";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.name = options.name;
  input.checked = options.checked ?? false;
  input.className = "ui-checkbox";

  wrap.appendChild(input);
  if (options.label) {
    const span = document.createElement("span");
    span.textContent = options.label;
    wrap.appendChild(span);
  }

  applyBaseOptions(wrap, options);
  return wrap;
}
