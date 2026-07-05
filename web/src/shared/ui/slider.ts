import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export interface RangeSliderOptions extends UiBaseOptions {
  value?: number;
  min?: number;
  max?: number;
  step?: number;
}

export function createSlider(options: RangeSliderOptions): HTMLInputElement {
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "ui-slider";
  slider.min = String(options.min ?? 0);
  slider.max = String(options.max ?? 100);
  slider.step = String(options.step ?? 1);
  slider.value = String(options.value ?? Number(slider.min));
  applyBaseOptions(slider, options);
  return slider;
}
