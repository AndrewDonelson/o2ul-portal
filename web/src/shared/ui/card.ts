import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export interface CardOptions extends UiBaseOptions {
  title?: string;
  bodyHtml?: string;
  footerText?: string;
}

export function createCard(options: CardOptions): HTMLElement {
  const card = document.createElement("article");
  card.className = "ui-card";

  if (options.title) {
    const heading = document.createElement("h3");
    heading.className = "ui-card-title shared-content-card-title";
    heading.textContent = options.title;
    card.appendChild(heading);
  }

  const body = document.createElement("div");
  body.className = "ui-card-body shared-content-card-body";
  if (options.bodyHtml) {
    body.innerHTML = options.bodyHtml;
  }
  card.appendChild(body);

  if (options.footerText) {
    const footer = document.createElement("p");
    footer.className = "ui-card-footer shared-content-card-footer";
    footer.textContent = options.footerText;
    card.appendChild(footer);
  }

  applyBaseOptions(card, options);
  return card;
}
