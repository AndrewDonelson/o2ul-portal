import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions, setHxOn } from "./utils.js";
import { createToggle } from "./toggle.js";

export interface ToggleGroupItem {
  label: string;
  value: string;
}

export interface ToggleGroupOptions extends UiBaseOptions {
  items: ToggleGroupItem[];
  selected?: string;
  changeEventName?: string;
}

export function createToggleGroup(options: ToggleGroupOptions): HTMLElement {
  const group = document.createElement("div");
  group.className = "ui-toggle-group";
  if (options.changeEventName) {
    group.dataset.uiToggleGroupEvent = options.changeEventName;
  }

  setHxOn(
    group,
    "click",
    "const target = event.target instanceof Element ? event.target.closest('.ui-toggle-group-item') : null; if (!target || !this.contains(target)) return; this.querySelectorAll('.ui-toggle-group-item').forEach((el) => { el.setAttribute('aria-pressed', 'false'); el.classList.remove('is-active'); }); target.setAttribute('aria-pressed', 'true'); target.classList.add('is-active'); const eventName = this.dataset.uiToggleGroupEvent; if (eventName) { this.dispatchEvent(new CustomEvent(eventName, { bubbles: true, detail: { value: target.getAttribute('data-ui-toggle-value') } })); }",
  );

  options.items.forEach((item) => {
    const toggle = createToggle({
      label: item.label,
      active: item.value === options.selected,
      className: "ui-toggle-group-item",
    });
    toggle.setAttribute("data-ui-toggle-value", item.value);

    group.appendChild(toggle);
  });

  applyBaseOptions(group, options);
  return group;
}
