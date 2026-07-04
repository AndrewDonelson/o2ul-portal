import type { ContentCardOptions } from "./types";
import { alignClass } from "./utils";
import { createCard } from "./ui/card";

export function createContentCard(options: ContentCardOptions): HTMLElement {
  const card = createCard({
    title: options.title,
    bodyHtml: options.bodyHtml,
    footerText: options.footerText,
    className: `shared-content-card ${alignClass(options.align ?? "center")} ${options.className ?? ""}`.trim(),
  });
  return card;
}
