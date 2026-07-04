import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export interface RadioItem {
  value: string;
  label: string;
}

export interface RadioGroupOptions extends UiBaseOptions {
  name: string;
  items: RadioItem[];
  selected?: string;
}

export function createRadioGroup(options: RadioGroupOptions): HTMLElement {
  const group = document.createElement("div");
  group.className = "ui-radio-group";

  options.items.forEach((item) => {
    const label = document.createElement("label");
    label.className = "ui-radio-wrap";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = options.name;
    input.value = item.value;
    input.checked = options.selected === item.value;

    const text = document.createElement("span");
    text.textContent = item.label;

    label.append(input, text);
    group.appendChild(label);
  });

  applyBaseOptions(group, options);
  return group;
}
