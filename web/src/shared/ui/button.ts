import type { UiBaseOptions, UiSize, UiTone } from "./types.js";
import { applyBaseOptions, dispatchCustomEventExpression, setHxOn, sizeClass, toneClass } from "./utils.js";

export interface ButtonOptions extends UiBaseOptions {
  label: string;
  tone?: UiTone;
  size?: UiSize;
  type?: "button" | "submit" | "reset";
  clickEventName?: string;
  clickEventDetail?: Record<string, unknown>;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = options.type ?? "button";
  button.textContent = options.label;
  button.className = `ui-button ${sizeClass(options.size)} ${toneClass(options.tone)}`;
  if (options.clickEventName) {
    setHxOn(button, "click", dispatchCustomEventExpression(options.clickEventName, options.clickEventDetail));
  }
  applyBaseOptions(button, options);
  return button;
}
