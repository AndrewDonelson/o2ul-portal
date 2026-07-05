import type { UiBaseOptions, UiSize, UiTone } from "./types.js";
import { applyBaseOptions, sizeClass, toneClass } from "./utils.js";

export interface ButtonOptions extends UiBaseOptions {
  label: string;
  tone?: UiTone;
  size?: UiSize;
  type?: "button" | "submit" | "reset";
  onClick?: (event: MouseEvent) => void;
}

export function createButton(options: ButtonOptions): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = options.type ?? "button";
  button.textContent = options.label;
  button.className = `ui-button ${sizeClass(options.size)} ${toneClass(options.tone)}`;
  if (options.onClick) button.addEventListener("click", options.onClick);
  applyBaseOptions(button, options);
  return button;
}
