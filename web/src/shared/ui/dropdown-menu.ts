import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions, dispatchCustomEventExpression, setHxOn } from "./utils.js";

export interface DropdownItem {
  label: string;
  value?: string;
  selectEventName?: string;
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
  button.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "ui-dropdown-menu";
  menu.hidden = true;

  options.items.forEach((item) => {
    const itemButton = document.createElement("button");
    itemButton.type = "button";
    itemButton.className = "ui-dropdown-item";
    itemButton.textContent = item.label;
    itemButton.setAttribute("data-ui-dropdown-item", "true");
    itemButton.setAttribute("data-ui-dropdown-value", item.value ?? item.label);
    if (item.selectEventName) {
      setHxOn(
        itemButton,
        "click",
        `${dispatchCustomEventExpression(item.selectEventName, { value: item.value ?? item.label })}; const menuEl = this.closest('.ui-dropdown')?.querySelector('.ui-dropdown-menu'); if (menuEl instanceof HTMLElement) menuEl.hidden = true; const trigger = this.closest('.ui-dropdown')?.querySelector('.ui-dropdown-trigger'); if (trigger instanceof HTMLElement) trigger.setAttribute('aria-expanded', 'false');`,
      );
    } else {
      setHxOn(
        itemButton,
        "click",
        "const menuEl = this.closest('.ui-dropdown')?.querySelector('.ui-dropdown-menu'); if (menuEl instanceof HTMLElement) menuEl.hidden = true; const trigger = this.closest('.ui-dropdown')?.querySelector('.ui-dropdown-trigger'); if (trigger instanceof HTMLElement) trigger.setAttribute('aria-expanded', 'false');",
      );
    }
    menu.appendChild(itemButton);
  });

  setHxOn(
    button,
    "click",
    "const menuEl = this.nextElementSibling; if (!(menuEl instanceof HTMLElement)) return; const expanded = this.getAttribute('aria-expanded') === 'true'; this.setAttribute('aria-expanded', expanded ? 'false' : 'true'); menuEl.hidden = expanded;",
  );

  root.tabIndex = 0;
  setHxOn(
    root,
    "focusout",
    "const next = event.relatedTarget; if (!(next instanceof Node) || !this.contains(next)) { const menuEl = this.querySelector('.ui-dropdown-menu'); if (menuEl instanceof HTMLElement) menuEl.hidden = true; const trigger = this.querySelector('.ui-dropdown-trigger'); if (trigger instanceof HTMLElement) trigger.setAttribute('aria-expanded', 'false'); }",
  );

  root.append(button, menu);
  applyBaseOptions(root, options);
  return root;
}
