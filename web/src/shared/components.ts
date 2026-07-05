export * from "./types.js";
export { createContentCard } from "./content-card.js";
export { createContentSlider } from "./content-slider.js";
export { createDashboardCharts } from "./dashboard-charts.js";
export { createDataTable } from "./data-table.js";
export { createEmptyState } from "./empty-state.js";
export { createPageHeader } from "./page-header.js";
export { createStandardHeader } from "./standard-header.js";
export { createStatsCard } from "./stats-card.js";
export { calculateStatus, createStatusIndicator } from "./status-indicator.js";
export { createTagLine } from "./tag-line.js";
export { createCopyrightNotice } from "./copyright-notice.js";
export * from "./ui/index.js";

import { createContentCard } from "./content-card.js";
import { createContentSlider } from "./content-slider.js";
import { createDashboardCharts } from "./dashboard-charts.js";
import { createDataTable } from "./data-table.js";
import { createEmptyState } from "./empty-state.js";
import { createPageHeader } from "./page-header.js";
import { createStandardHeader } from "./standard-header.js";
import { createStatsCard } from "./stats-card.js";
import { calculateStatus, createStatusIndicator } from "./status-indicator.js";
import { createTagLine } from "./tag-line.js";
import { createCopyrightNotice } from "./copyright-notice.js";
import * as uiComponents from "./ui/index.js";

export const sharedComponents = {
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
  calculateStatus,
  ui: uiComponents,
};
