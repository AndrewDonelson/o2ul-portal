import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export interface AccordionItem {
  title: string;
  contentHtml: string;
}

export interface AccordionOptions extends UiBaseOptions {
  items: AccordionItem[];
}

export function createAccordion(options: AccordionOptions): HTMLElement {
  const root = document.createElement("section");
  root.className = "ui-accordion";

  options.items.forEach((item) => {
    const details = document.createElement("details");
    details.className = "ui-accordion-item";

    const summary = document.createElement("summary");
    summary.className = "ui-accordion-title";
    summary.textContent = item.title;

    const body = document.createElement("div");
    body.className = "ui-accordion-body";
    body.innerHTML = item.contentHtml;

    details.append(summary, body);
    root.appendChild(details);
  });

  applyBaseOptions(root, options);
  return root;
}
