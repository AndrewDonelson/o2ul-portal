import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions, setHxOn } from "./utils.js";

export interface PopoverOptions extends UiBaseOptions {
  triggerLabel: string;
  contentHtml: string;
}

export function createPopover(options: PopoverOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "ui-popover";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "ui-popover-trigger";
  trigger.textContent = options.triggerLabel;
  trigger.setAttribute("aria-expanded", "false");

  const content = document.createElement("div");
  content.className = "ui-popover-content";
  content.innerHTML = options.contentHtml;
  content.hidden = true;

  setHxOn(
    trigger,
    "click",
    "const popover = this.nextElementSibling; if (!(popover instanceof HTMLElement)) return; const expanded = this.getAttribute('aria-expanded') === 'true'; this.setAttribute('aria-expanded', expanded ? 'false' : 'true'); popover.hidden = expanded;",
  );

  root.append(trigger, content);
  applyBaseOptions(root, options);
  return root;
}
