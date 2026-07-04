import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";
import { createButton } from "./button";

export interface PaginationOptions extends UiBaseOptions {
  currentPage: number;
  totalPages: number;
  onPageChange?: (page: number) => void;
}

export function createPagination(options: PaginationOptions): HTMLElement {
  const root = document.createElement("nav");
  root.className = "ui-pagination";

  const prev = createButton({
    label: "Previous",
    tone: "muted",
    onClick: () => {
      if (options.currentPage > 1) options.onPageChange?.(options.currentPage - 1);
    },
  });

  const label = document.createElement("span");
  label.className = "ui-pagination-label";
  label.textContent = `Page ${options.currentPage} of ${options.totalPages}`;

  const next = createButton({
    label: "Next",
    tone: "muted",
    onClick: () => {
      if (options.currentPage < options.totalPages) options.onPageChange?.(options.currentPage + 1);
    },
  });

  root.append(prev, label, next);
  applyBaseOptions(root, options);
  return root;
}
