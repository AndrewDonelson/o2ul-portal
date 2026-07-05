import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";
import { createToggle } from "./toggle";

export interface ToggleGroupItem {
  label: string;
  value: string;
}

export interface ToggleGroupOptions extends UiBaseOptions {
  items: ToggleGroupItem[];
  selected?: string;
  onChange?: (value: string) => void;
}

export function createToggleGroup(options: ToggleGroupOptions): HTMLElement {
  const group = document.createElement("div");
  group.className = "ui-toggle-group";

  options.items.forEach((item) => {
    const toggle = createToggle({
      label: item.label,
      active: item.value === options.selected,
      className: "ui-toggle-group-item",
    });

    toggle.addEventListener("click", () => {
      group.querySelectorAll(".ui-toggle-group-item").forEach((el) => {
        el.setAttribute("aria-pressed", "false");
        el.classList.remove("is-active");
      });
      toggle.setAttribute("aria-pressed", "true");
      toggle.classList.add("is-active");
      options.onChange?.(item.value);
    });

    group.appendChild(toggle);
  });

  applyBaseOptions(group, options);
  return group;
}
