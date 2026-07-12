import {
  createContentCard,
  createContentSlider,
  createDashboardCharts,
  createDataTable,
  createEmptyState,
  createPageHeader,
  createStandardHeader,
  createStatsCard,
  createStatusIndicator,
  createTagLine,
  createCopyrightNotice,
} from "./components.js";
import { createButton } from "./ui/button.js";
import { createBadge } from "./ui/badge.js";
import { createInput } from "./ui/input.js";
import { createProgress } from "./ui/progress.js";
import { createTextarea } from "./ui/textarea.js";
import type { UiTone } from "./ui/types.js";

function createShowcaseBlock(title: string): HTMLElement {
  const block = document.createElement("section");
  block.className = "shared-showcase-block";

  const heading = document.createElement("h4");
  heading.className = "shared-showcase-title";
  heading.textContent = title;
  block.appendChild(heading);

  return block;
}

export function renderSharedComponentShowcase(container: HTMLElement): void {
  container.innerHTML = "";

  const fragment = document.createDocumentFragment();

  const headerBlock = createShowcaseBlock("Headers and Tagline");
  headerBlock.append(
    createStandardHeader("Shared UI + Shared Components", true),
    createPageHeader(
      "Reusable by Design",
      "Security-first rendering with theme-aware, responsive primitives.",
      "left",
    ),
    createTagLine(),
  );
  fragment.appendChild(headerBlock);

  const cardBlock = createShowcaseBlock("Cards, Badges, Buttons, Status");
  const cardGrid = document.createElement("div");
  cardGrid.className = "shared-showcase-grid";

  const contentCard = createContentCard({
    title: "ContentCard",
    bodyHtml: "<p>Shared card built on top of UI card primitives.</p>",
    footerText: "Optimized for composability",
    align: "left",
  });

  const statsCard = createStatsCard({
    title: "Monthly Active Users",
    value: "128,402",
    description: "Across portal and mobile PWA",
  });

  const utilityCard = createContentCard({
    title: "UI Primitives",
    align: "left",
  });
  const utilityBody = utilityCard.querySelector(".ui-card-body");
  if (utilityBody) {
    const row = document.createElement("div");
    row.className = "shared-showcase-inline";
    row.append(
      createBadge({ label: "Theme-aware", tone: "accent" }),
      createBadge({ label: "Responsive", tone: "success" }),
      createStatusIndicator(undefined, Date.now()),
    );

    const actions = document.createElement("div");
    actions.className = "shared-showcase-inline";
    actions.append(
      createButton({ label: "Primary Action", tone: "accent" }),
      createButton({ label: "Secondary", tone: "muted" }),
    );

    utilityBody.append(row, actions, createProgress({ value: 72 }));
  }

  cardGrid.append(contentCard, statsCard, utilityCard);
  cardBlock.appendChild(cardGrid);
  fragment.appendChild(cardBlock);

  const walletBlock = createShowcaseBlock("Wallet Shell and Flow Controls");
  const walletGrid = document.createElement("div");
  walletGrid.className = "shared-showcase-grid wallet-shell-grid";

  const spendCard = createContentCard({
    title: "Spend Composer",
    align: "left",
  });
  const spendBody = spendCard.querySelector(".ui-card-body");
  if (spendBody) {
    spendBody.append(
      createTagLine(),
      createBadge({ label: "Ready to send", tone: "success" }),
      createBadge({ label: "Wallet guarded", tone: "accent" }),
    );

    const composerForm = document.createElement("div");
    composerForm.className = "wallet-composer-form";
    composerForm.append(
      createInput({ name: "recipient", placeholder: "Recipient address" }),
      createInput({ name: "amount", type: "number", placeholder: "Amount to send" }),
      createTextarea({ name: "memo", placeholder: "Optional memo for the spend packet", rows: 3 }),
    );

    const spendActions = document.createElement("div");
    spendActions.className = "shared-showcase-inline wallet-flow-actions";
    spendActions.append(
      createButton({ label: "Send", tone: "accent" }),
      createButton({ label: "Receive", tone: "muted" }),
      createButton({ label: "Escrow", tone: "muted" }),
    );

    const flowList = document.createElement("div");
    flowList.className = "wallet-flow-list";
    for (const [label, value] of [
      ["Available", "12,480 O2UL"],
      ["Pending scan", "3 notes"],
      ["Next approval", "2-of-3"],
    ] as const) {
      const row = document.createElement("div");
      row.className = "wallet-flow-item";
      const key = document.createElement("span");
      key.textContent = label;
      const val = document.createElement("strong");
      val.textContent = value;
      row.append(key, val);
      flowList.appendChild(row);
    }

    spendBody.append(composerForm, spendActions, flowList);
  }

  const scanCard = createContentCard({
    title: "Note Scan Queue",
    align: "left",
  });
  const scanBody = scanCard.querySelector(".ui-card-body");
  if (scanBody) {
    const scanFilters = document.createElement("div");
    scanFilters.className = "shared-showcase-inline wallet-scan-filters";
    scanFilters.append(
      createBadge({ label: "All notes", tone: "accent" }),
      createBadge({ label: "Incoming", tone: "success" }),
      createBadge({ label: "Escrow", tone: "muted" }),
    );

    const scanRows = document.createElement("div");
    scanRows.className = "wallet-scan-list";
    const scanQueue: Array<{ label: string; state: string; tone: UiTone }> = [
      { label: "Receive notes", state: "Synced", tone: "success" },
      { label: "Shielded spend", state: "Waiting", tone: "accent" },
      { label: "Escrow packet", state: "Queued", tone: "default" },
    ];
    for (const scan of scanQueue) {
      const row = document.createElement("article");
      row.className = "wallet-scan-row";
      const heading = document.createElement("div");
      heading.className = "wallet-scan-heading";
      heading.textContent = scan.label;
      const state = createBadge({ label: scan.state, tone: scan.tone });
      row.append(heading, state);
      scanRows.appendChild(row);
    }
    scanBody.append(
      scanFilters,
      createProgress({ value: 68 }),
      scanRows,
    );
  }

  const recoveryCard = createContentCard({
    title: "Dispute and Recovery",
    align: "left",
  });
  const recoveryBody = recoveryCard.querySelector(".ui-card-body");
  if (recoveryBody) {
    const recoveryTimeline = document.createElement("div");
    recoveryTimeline.className = "wallet-timeline";
    for (const step of [
      "Dispute evidence captured",
      "Guardian approvals pending",
      "Recovery batch ready",
    ]) {
      const item = document.createElement("div");
      item.className = "wallet-timeline-step";
      item.textContent = step;
      recoveryTimeline.appendChild(item);
    }

    recoveryBody.append(
      createStatsCard({
        title: "Safety Score",
        value: "98%",
        description: "Two-factor quorum and guardian confirmations are healthy.",
      }),
      recoveryTimeline,
      createButton({ label: "Open recovery console", tone: "accent" }),
    );
  }

  walletGrid.append(spendCard, scanCard, recoveryCard);
  walletBlock.appendChild(walletGrid);
  fragment.appendChild(walletBlock);

  const sliderBlock = createShowcaseBlock("Flow Timeline");
  const slideA = document.createElement("div");
  slideA.textContent = "Send: build the spend packet, scan notes, and route approval through the guard.";
  const slideB = document.createElement("div");
  slideB.textContent = "Receive: sync headers, refresh balances, and stage incoming note disclosures.";
  const slideC = document.createElement("div");
  slideC.textContent = "Recovery: escalate disputes, collect guardian attestations, and restore control.";
  sliderBlock.appendChild(createContentSlider([slideA, slideB, slideC], { intervalMs: 4500 }));
  fragment.appendChild(sliderBlock);

  const dataBlock = createShowcaseBlock("Wallet Activity and Queue");
  const dataGrid = document.createElement("div");
  dataGrid.className = "shared-showcase-grid";
  dataGrid.append(
    createDashboardCharts(
      [
        { name: "Mon", total: 140 },
        { name: "Tue", total: 168 },
        { name: "Wed", total: 153 },
        { name: "Thu", total: 186 },
      ],
      [
        { name: "Wallet", total: 72 },
        { name: "Portal", total: 110 },
        { name: "Recovery", total: 49 },
      ],
    ),
    createDataTable(
      [
        { key: "module", label: "Flow" },
        { key: "status", label: "State" },
        { key: "perf", label: "Notes" },
      ],
      [
        { module: "send", status: "ready", perf: "guarded" },
        { module: "receive", status: "ready", perf: "scanning" },
        { module: "escrow", status: "armed", perf: "2-of-3" },
      ],
    ),
  );
  dataBlock.appendChild(dataGrid);
  fragment.appendChild(dataBlock);

  const emptyBlock = createShowcaseBlock("Empty State and Copyright");
  emptyBlock.append(
    createEmptyState({
      title: "No Archived Sessions",
      description: "When no content is available, this component keeps UX informative and clean.",
      actionLabel: "Create Session",
      actionHref: "/",
    }),
    createCopyrightNotice("Nlaak Studios, LLC", 2017, "left"),
  );
  fragment.appendChild(emptyBlock);

  container.appendChild(fragment);
}
