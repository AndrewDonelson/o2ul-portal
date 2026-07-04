import type { UiBaseOptions, UiTone } from "./types";
import { applyBaseOptions, toneClass } from "./utils";

export interface AlertOptions extends UiBaseOptions {
  title?: string;
  message: string;
  tone?: UiTone;
}

export function createAlert(options: AlertOptions): HTMLElement {
  const alert = document.createElement("section");
  alert.className = `ui-alert ${toneClass(options.tone)}`;
  alert.setAttribute("role", "alert");

  if (options.title) {
    const title = document.createElement("h4");
    title.className = "ui-alert-title";
    title.textContent = options.title;
    alert.appendChild(title);
  }

  const body = document.createElement("p");
  body.className = "ui-alert-message";
  body.textContent = options.message;
  alert.appendChild(body);

  applyBaseOptions(alert, options);
  return alert;
}
