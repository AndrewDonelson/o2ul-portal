import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

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

  const content = document.createElement("div");
  content.className = "ui-popover-content";
  content.innerHTML = options.contentHtml;
  content.hidden = true;

  trigger.addEventListener("click", () => {
    content.hidden = !content.hidden;
  });

  root.append(trigger, content);
  applyBaseOptions(root, options);
  return root;
}
