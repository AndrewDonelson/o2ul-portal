import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions } from "./utils.js";

export interface TabItem {
  id: string;
  label: string;
  content: HTMLElement;
}

export interface TabsOptions extends UiBaseOptions {
  tabs: TabItem[];
  initialId?: string;
}

export function createTabs(options: TabsOptions): HTMLElement {
  const root = document.createElement("section");
  root.className = "ui-tabs";

  const tabList = document.createElement("div");
  tabList.className = "ui-tabs-list";
  tabList.setAttribute("role", "tablist");

  const contentWrap = document.createElement("div");
  contentWrap.className = "ui-tabs-content";

  let activeId = options.initialId ?? options.tabs[0]?.id;

  function render(): void {
    contentWrap.innerHTML = "";
    options.tabs.forEach((tab) => {
      const selected = tab.id === activeId;
      const button = tabList.querySelector<HTMLButtonElement>(`button[data-id=\"${tab.id}\"]`);
      if (button) button.setAttribute("aria-selected", selected ? "true" : "false");
      if (selected) contentWrap.appendChild(tab.content);
    });
  }

  options.tabs.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-tab-button";
    button.dataset.id = tab.id;
    button.textContent = tab.label;
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => {
      activeId = tab.id;
      render();
    });
    tabList.appendChild(button);
  });

  root.append(tabList, contentWrap);
  render();
  applyBaseOptions(root, options);
  return root;
}
