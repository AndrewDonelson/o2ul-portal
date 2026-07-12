import type { UiBaseOptions, UiTone } from "./types.js";
import { applyBaseOptions, setHxOn, toneClass } from "./utils.js";

export interface ToggleOptions extends UiBaseOptions {
  label: string;
  active?: boolean;
  tone?: UiTone;
  toggleEventName?: string;
}

export function createToggle(options: ToggleOptions): HTMLButtonElement {
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = `ui-toggle ${toneClass(options.tone)}`;
  toggle.textContent = options.label;
  toggle.setAttribute("aria-pressed", options.active ? "true" : "false");
  if (options.active) toggle.classList.add("is-active");

  let clickExpression = "const next = this.getAttribute('aria-pressed') !== 'true'; this.setAttribute('aria-pressed', next ? 'true' : 'false'); this.classList.toggle('is-active', next);";

  if (options.toggleEventName) {
    const safeEventName = options.toggleEventName.replace(/[^a-zA-Z0-9:_-]/g, "");
    clickExpression += ` const isActive = this.getAttribute('aria-pressed') === 'true'; this.dispatchEvent(new CustomEvent('${safeEventName}', { bubbles: true, detail: { active: isActive } }));`;
  }

  setHxOn(toggle, "click", clickExpression);

  applyBaseOptions(toggle, options);
  return toggle;
}
