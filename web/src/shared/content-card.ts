import type { ContentCardOptions } from "./types.js";
import { alignClass } from "./utils.js";
import { createCard } from "./ui/card.js";

export function createContentCard(options: ContentCardOptions): HTMLElement {
  const card = createCard({
    title: options.title,
    bodyHtml: options.bodyHtml,
    footerText: options.footerText,
    className: `shared-content-card ${alignClass(options.align ?? "center")} ${options.className ?? ""}`.trim(),
  });
  return card;
}
