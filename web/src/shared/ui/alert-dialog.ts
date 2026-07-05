import type { UiBaseOptions } from "./types.js";
import { createDialog } from "./dialog.js";

export interface AlertDialogOptions extends UiBaseOptions {
  title: string;
  message: string;
}

export function createAlertDialog(options: AlertDialogOptions): HTMLElement {
  return createDialog({
    ...options,
    contentHtml: `<p>${options.message}</p>`,
    closeLabel: "Dismiss",
  });
}
