import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export interface LabelOptions extends UiBaseOptions {
  text: string;
  htmlFor?: string;
}

export function createLabel(options: LabelOptions): HTMLLabelElement {
  const label = document.createElement("label");
  label.className = "ui-label";
  label.textContent = options.text;
  if (options.htmlFor) label.htmlFor = options.htmlFor;
  applyBaseOptions(label, options);
  return label;
}
