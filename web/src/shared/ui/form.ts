import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions, dispatchCustomEventExpression, setHxOn } from "./utils.js";

export interface FormField {
  label: string;
  input: HTMLElement;
}

export interface FormOptions extends UiBaseOptions {
  fields: FormField[];
  submitEventName?: string;
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

  if (options.submitEventName) {
    setHxOn(
      form,
      "submit",
      `event.preventDefault(); ${dispatchCustomEventExpression(options.submitEventName)};`,
    );
  }

  applyBaseOptions(form, options);
  return form;
}
