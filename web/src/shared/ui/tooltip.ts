import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export interface TooltipOptions extends UiBaseOptions {
  text: string;
  target: HTMLElement;
}

export function attachTooltip(options: TooltipOptions): HTMLElement {
  const tip = document.createElement("span");
  tip.className = "ui-tooltip";
  tip.textContent = options.text;
  tip.hidden = true;

  options.target.classList.add("ui-tooltip-target");
  options.target.appendChild(tip);

  options.target.addEventListener("mouseenter", () => {
    tip.hidden = false;
  });
  options.target.addEventListener("mouseleave", () => {
    tip.hidden = true;
  });

  applyBaseOptions(tip, options);
  return tip;
}
