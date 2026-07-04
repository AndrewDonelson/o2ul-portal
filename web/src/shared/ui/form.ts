import type { UiBaseOptions } from "./types";
import { applyBaseOptions } from "./utils";

export interface FormField {
  label: string;
  input: HTMLElement;
}

export interface FormOptions extends UiBaseOptions {
  fields: FormField[];
  onSubmit?: (event: SubmitEvent) => void;
}

export function createForm(options: FormOptions): HTMLFormElement {
  const form = document.createElement("form");
  form.className = "ui-form";

  options.fields.forEach((field) => {
    const row = document.createElement("div");
    row.className = "ui-form-row";

    const label = document.createElement("label");
    label.className = "ui-label";
    label.textContent = field.label;

    row.append(label, field.input);
    form.appendChild(row);
  });

  if (options.onSubmit) {
    form.addEventListener("submit", (event) => {
      options.onSubmit?.(event as SubmitEvent);
    });
  }

  applyBaseOptions(form, options);
  return form;
}
