import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";
import { createButton } from "./button";

export interface DialogOptions extends UiBaseOptions {
  title: string;
  contentHtml: string;
  closeLabel?: string;
}

export function createDialog(options: DialogOptions): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "ui-dialog-overlay";
  overlay.hidden = true;

  const panel = document.createElement("section");
  panel.className = "ui-dialog-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");

  const heading = document.createElement("h3");
  heading.className = "ui-dialog-title";
  heading.textContent = options.title;

  const body = document.createElement("div");
  body.className = "ui-dialog-body";
  body.innerHTML = options.contentHtml;

  const closeButton = createButton({
    label: options.closeLabel ?? "Close",
    tone: "muted",
    onClick: () => {
      overlay.hidden = true;
      document.body.classList.remove("modal-open");
    },
  });

  panel.append(heading, body, closeButton);
  overlay.appendChild(panel);

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      overlay.hidden = true;
      document.body.classList.remove("modal-open");
    }
  });

  applyBaseOptions(overlay, options);
  return overlay;
}

export function openDialog(dialog: HTMLElement): void {
  dialog.hidden = false;
  document.body.classList.add("modal-open");
}
