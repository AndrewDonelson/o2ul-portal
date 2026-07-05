import type { UiBaseOptions, UiSize } from "./types.js";
import { applyBaseOptions, sizeClass } from "./utils.js";

export interface TextareaOptions extends UiBaseOptions {
  name: string;
  value?: string;
  placeholder?: string;
  rows?: number;
  size?: UiSize;
}

export function createTextarea(options: TextareaOptions): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  textarea.name = options.name;
  textarea.value = options.value ?? "";
  textarea.placeholder = options.placeholder ?? "";
  textarea.rows = options.rows ?? 4;
  textarea.className = `ui-textarea ${sizeClass(options.size)}`;
  applyBaseOptions(textarea, options);
  return textarea;
}
