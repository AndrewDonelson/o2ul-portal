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
} from "./components";
import { createButton } from "./ui/button";
import { createBadge } from "./ui/badge";
import { createProgress } from "./ui/progress";

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

  const sliderBlock = createShowcaseBlock("Content Slider");
  const slideA = document.createElement("div");
  slideA.textContent = "Slide 1: Shared content modules power rapid PWA assembly.";
  const slideB = document.createElement("div");
  slideB.textContent = "Slide 2: UI primitives enforce consistent themed UX.";
  const slideC = document.createElement("div");
  slideC.textContent = "Slide 3: Shared wrappers maximize reuse across pages.";
  sliderBlock.appendChild(createContentSlider([slideA, slideB, slideC], { intervalMs: 4500 }));
  fragment.appendChild(sliderBlock);

  const dataBlock = createShowcaseBlock("Charts and Table");
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
        { name: "Admin", total: 49 },
      ],
    ),
    createDataTable(
      [
        { key: "module", label: "Module" },
        { key: "status", label: "Status" },
        { key: "perf", label: "Perf" },
      ],
      [
        { module: "shared/ui", status: "active", perf: "fast" },
        { module: "shared/legal", status: "active", perf: "fast" },
        { module: "pwa-shell", status: "active", perf: "fast" },
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
