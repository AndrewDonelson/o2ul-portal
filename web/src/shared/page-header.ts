import type { HorizontalAlign } from "./types.js";
import { alignClass } from "./utils.js";

export function createPageHeader(title: string, description?: string, align: HorizontalAlign = "center"): HTMLElement {
  const root = document.createElement("header");
  root.className = `shared-page-header ${alignClass(align)}`;

  const heading = document.createElement("h2");
  heading.className = "shared-page-header-title";
  heading.textContent = title;
  root.appendChild(heading);

  if (description) {
    const desc = document.createElement("p");
    desc.className = "shared-page-header-description";
    desc.textContent = description;
    root.appendChild(desc);
  }

  return root;
}
