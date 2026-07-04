import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export interface SwitchOptions extends UiBaseOptions {
  checked?: boolean;
  label?: string;
}

export function createSwitch(options: SwitchOptions): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "ui-switch-wrap";

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "ui-switch-input";
  input.checked = options.checked ?? false;

  const track = document.createElement("span");
  track.className = "ui-switch-track";

  wrap.append(input, track);

  if (options.label) {
    const text = document.createElement("span");
    text.className = "ui-switch-label";
    text.textContent = options.label;
    wrap.appendChild(text);
  }

  applyBaseOptions(wrap, options);
  return wrap;
}
