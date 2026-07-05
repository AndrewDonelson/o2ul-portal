import { createToast } from "./toast.js";

export function ensureToasterHost(): HTMLElement {
  let host = document.querySelector<HTMLElement>(".ui-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.className = "ui-toast-host";
    document.body.appendChild(host);
  }
  return host;
}

export function pushToast(message: string): void {
  const host = ensureToasterHost();
  host.appendChild(createToast({ message }));
}
