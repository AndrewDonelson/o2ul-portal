import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";
import { createButton } from "./button.js";

export interface PaginationOptions extends UiBaseOptions {
  currentPage: number;
  totalPages: number;
  pageChangeEventName?: string;
}

export function createPagination(options: PaginationOptions): HTMLElement {
  const root = document.createElement("nav");
  root.className = "ui-pagination";

  const prev = createButton({
    label: "Previous",
    tone: "muted",
    clickEventName: options.pageChangeEventName,
    clickEventDetail: {
      page: Math.max(1, options.currentPage - 1),
      direction: "previous",
    },
  });
  if (options.currentPage <= 1) {
    prev.disabled = true;
    prev.setAttribute("aria-disabled", "true");
  }

  const label = document.createElement("span");
  label.className = "ui-pagination-label";
  label.textContent = `Page ${options.currentPage} of ${options.totalPages}`;

  const next = createButton({
    label: "Next",
    tone: "muted",
    clickEventName: options.pageChangeEventName,
    clickEventDetail: {
      page: Math.min(options.totalPages, options.currentPage + 1),
      direction: "next",
    },
  });
  if (options.currentPage >= options.totalPages) {
    next.disabled = true;
    next.setAttribute("aria-disabled", "true");
  }

  root.append(prev, label, next);
  applyBaseOptions(root, options);
  return root;
}
