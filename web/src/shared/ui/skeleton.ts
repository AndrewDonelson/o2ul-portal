import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export interface SkeletonOptions extends UiBaseOptions {
  width?: string;
  height?: string;
}

export function createSkeleton(options?: SkeletonOptions): HTMLElement {
  const skeleton = document.createElement("div");
  skeleton.className = "ui-skeleton";
  if (options?.width) skeleton.style.width = options.width;
  if (options?.height) skeleton.style.height = options.height;
  applyBaseOptions(skeleton, options);
  return skeleton;
}
