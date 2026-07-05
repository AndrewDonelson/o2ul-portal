import type { UiBaseOptions, UiSize } from "./types";
import { applyBaseOptions, sizeClass } from "./utils";

export interface SelectItem {
  value: string;
  label: string;
}

export interface SelectOptions extends UiBaseOptions {
  name: string;
  items: SelectItem[];
  value?: string;
  size?: UiSize;
}

export function createSelect(options: SelectOptions): HTMLSelectElement {
  const select = document.createElement("select");
  select.name = options.name;
  select.className = `ui-select ${sizeClass(options.size)}`;

  options.items.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    option.selected = options.value === item.value;
    select.appendChild(option);
  });

  applyBaseOptions(select, options);
  return select;
}
