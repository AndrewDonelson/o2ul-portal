import type { EmptyStateOptions } from "./types";

export function createEmptyState(options: EmptyStateOptions): HTMLElement {
  const root = document.createElement("section");
  root.className = "shared-empty-state";

  const title = document.createElement("h3");
  title.className = "shared-empty-title";
  title.textContent = options.title;

  const description = document.createElement("p");
  description.className = "shared-empty-description";
  description.textContent = options.description ?? "No data available right now.";

  root.append(title, description);

  if (options.actionLabel && options.actionHref) {
    const action = document.createElement("a");
    action.className = "shared-empty-action";
    action.href = options.actionHref;
    action.textContent = options.actionLabel;
    root.appendChild(action);
  }

  return root;
}
