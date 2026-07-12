import type { UiBaseOptions } from "./types.js";
import { applyBaseOptions, setHxOn } from "./utils.js";

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

  const activeId = options.initialId ?? options.tabs[0]?.id;

  setHxOn(
    tabList,
    "click",
    "const tabButton = event.target instanceof Element ? event.target.closest('button[data-id]') : null; if (!tabButton || !this.contains(tabButton)) return; const tabId = tabButton.getAttribute('data-id'); if (!tabId) return; this.querySelectorAll('button[data-id]').forEach((btn) => btn.setAttribute('aria-selected', btn === tabButton ? 'true' : 'false')); const root = this.closest('.ui-tabs'); if (!root) return; root.querySelectorAll('.ui-tabs-panel').forEach((panel) => { if (panel instanceof HTMLElement) panel.hidden = panel.getAttribute('data-id') !== tabId; });",
  );

  options.tabs.forEach((tab) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ui-tab-button";
    button.dataset.id = tab.id;
    button.textContent = tab.label;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", tab.id === activeId ? "true" : "false");
    tabList.appendChild(button);

    const panel = document.createElement("div");
    panel.className = "ui-tabs-panel";
    panel.setAttribute("data-id", tab.id);
    panel.hidden = tab.id !== activeId;
    panel.appendChild(tab.content);
    contentWrap.appendChild(panel);
  });

  root.append(tabList, contentWrap);
  applyBaseOptions(root, options);
  return root;
}
