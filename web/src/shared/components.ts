export * from "./types";
export { createContentCard } from "./content-card";
export { createContentSlider } from "./content-slider";
export { createDashboardCharts } from "./dashboard-charts";
export { createDataTable } from "./data-table";
export { createEmptyState } from "./empty-state";
export { createPageHeader } from "./page-header";
export { createStandardHeader } from "./standard-header";
export { createStatsCard } from "./stats-card";
export { calculateStatus, createStatusIndicator } from "./status-indicator";
export { createTagLine } from "./tag-line";
export { createCopyrightNotice } from "./copyright-notice";
export * from "./ui/index";

import { createContentCard } from "./content-card";
import { createContentSlider } from "./content-slider";
import { createDashboardCharts } from "./dashboard-charts";
import { createDataTable } from "./data-table";
import { createEmptyState } from "./empty-state";
import { createPageHeader } from "./page-header";
import { createStandardHeader } from "./standard-header";
import { createStatsCard } from "./stats-card";
import { calculateStatus, createStatusIndicator } from "./status-indicator";
import { createTagLine } from "./tag-line";
import { createCopyrightNotice } from "./copyright-notice";
import * as uiComponents from "./ui/index";

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
