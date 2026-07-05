import type { UiBaseOptions, UiSize } from "./types.js";
import { applyBaseOptions, sizeClass } from "./utils.js";

export interface AvatarOptions extends UiBaseOptions {
  name: string;
  imageUrl?: string;
  size?: UiSize;
}

export function createAvatar(options: AvatarOptions): HTMLElement {
  const avatar = document.createElement("div");
  avatar.className = `ui-avatar ${sizeClass(options.size)}`;

  if (options.imageUrl) {
    const img = document.createElement("img");
    img.src = options.imageUrl;
    img.alt = options.name;
    img.className = "ui-avatar-image";
    avatar.appendChild(img);
  } else {
    const fallback = document.createElement("span");
    fallback.className = "ui-avatar-fallback";
    fallback.textContent = options.name.trim().slice(0, 2).toUpperCase();
    avatar.appendChild(fallback);
  }

  applyBaseOptions(avatar, options);
  return avatar;
}
