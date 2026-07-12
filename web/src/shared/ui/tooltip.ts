import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions, setHxOn } from "./utils.js";

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

  setHxOn(options.target, "mouseenter", "const tip = this.querySelector('.ui-tooltip'); if (tip instanceof HTMLElement) tip.hidden = false;");
  setHxOn(options.target, "mouseleave", "const tip = this.querySelector('.ui-tooltip'); if (tip instanceof HTMLElement) tip.hidden = true;");

  applyBaseOptions(tip, options);
  return tip;
}
