import type { UiBaseOptions, UiTone } from "./types";
import { applyBaseOptions, toneClass } from "./utils";

export interface ToastOptions extends UiBaseOptions {
  message: string;
  tone?: UiTone;
  durationMs?: number;
}

export function createToast(options: ToastOptions): HTMLElement {
  const toast = document.createElement("div");
  toast.className = `ui-toast ${toneClass(options.tone)}`;
  toast.textContent = options.message;
  applyBaseOptions(toast, options);

  const durationMs = options.durationMs ?? 3000;
  window.setTimeout(() => {
    toast.remove();
  }, durationMs);

  return toast;
}

export function showToast(message: string, tone: UiTone = "default", durationMs = 3000): void {
  let host = document.querySelector<HTMLElement>(".ui-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "ui-toast-host";
    document.body.appendChild(host);
  }

  host.appendChild(createToast({ message, tone, durationMs }));
}
