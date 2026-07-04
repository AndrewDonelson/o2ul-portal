import type { UiBaseOptions, UiTone } from "./types";
import { applyBaseOptions, toneClass } from "./utils";

export interface BadgeOptions extends UiBaseOptions {
  label: string;
  tone?: UiTone;
}

export function createBadge(options: BadgeOptions): HTMLSpanElement {
  const badge = document.createElement("span");
  badge.textContent = options.label;
  badge.className = `ui-badge ${toneClass(options.tone)}`;
  applyBaseOptions(badge, options);
  return badge;
}
