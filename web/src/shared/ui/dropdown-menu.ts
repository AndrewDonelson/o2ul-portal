import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export interface DropdownItem {
  label: string;
  onSelect?: () => void;
}

export interface DropdownOptions extends UiBaseOptions {
  triggerLabel: string;
  items: DropdownItem[];
}

export function createDropdownMenu(options: DropdownOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "ui-dropdown";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "ui-dropdown-trigger";
  button.textContent = options.triggerLabel;

  const menu = document.createElement("div");
  menu.className = "ui-dropdown-menu";
  menu.hidden = true;

  options.items.forEach((item) => {
    const itemButton = document.createElement("button");
    itemButton.type = "button";
    itemButton.className = "ui-dropdown-item";
    itemButton.textContent = item.label;
    itemButton.addEventListener("click", () => {
      menu.hidden = true;
      item.onSelect?.();
    });
    menu.appendChild(itemButton);
  });

  button.addEventListener("click", () => {
    menu.hidden = !menu.hidden;
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target as Node)) {
      menu.hidden = true;
    }
  });

  root.append(button, menu);
  applyBaseOptions(root, options);
  return root;
}
