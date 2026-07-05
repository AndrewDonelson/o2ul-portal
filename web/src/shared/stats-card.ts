import type { StatsCardOptions } from "./types.js";

export function createStatsCard(options: StatsCardOptions): HTMLElement {
  const card = document.createElement("article");
  card.className = "shared-stats-card";

  const title = document.createElement("p");
  title.className = "shared-stats-title";
  title.textContent = options.title;

  const value = document.createElement("p");
  value.className = "shared-stats-value";
  value.textContent = String(options.value);

  card.append(title, value);

  if (options.description) {
    const description = document.createElement("p");
    description.className = "shared-stats-description";
    description.textContent = options.description;
    card.appendChild(description);
  }

  return card;
}
