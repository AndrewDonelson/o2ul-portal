import type { UiBaseOptions, UiSize } from "./types";
import { applyBaseOptions, sizeClass } from "./utils";

export interface InputOptions extends UiBaseOptions {
  name: string;
  value?: string;
  type?: string;
  placeholder?: string;
  size?: UiSize;
}

export function createInput(options: InputOptions): HTMLInputElement {
  const input = document.createElement("input");
  input.type = options.type ?? "text";
  input.name = options.name;
  input.value = options.value ?? "";
  input.placeholder = options.placeholder ?? "";
  input.className = `ui-input ${sizeClass(options.size)}`;
  applyBaseOptions(input, options);
  return input;
}
