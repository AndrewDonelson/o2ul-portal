import type { UiBaseOptions, UiTone } from "./types";
import { applyBaseOptions, toneClass } from "./utils";

export interface ToggleOptions extends UiBaseOptions {
  label: string;
  active?: boolean;
  tone?: UiTone;
}

export function createToggle(options: ToggleOptions): HTMLButtonElement {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = `ui-toggle ${toneClass(options.tone)}`;
  toggle.textContent = options.label;
  toggle.setAttribute("aria-pressed", options.active ? "true" : "false");
  if (options.active) toggle.classList.add("is-active");

  toggle.addEventListener("click", () => {
    const next = toggle.getAttribute("aria-pressed") !== "true";
    toggle.setAttribute("aria-pressed", next ? "true" : "false");
    toggle.classList.toggle("is-active", next);
  });

  applyBaseOptions(toggle, options);
  return toggle;
}
