import type { ChartDatum } from "../types.js";
import type { UiBaseOptions } from "./types.js";
import { createDashboardCharts } from "../dashboard-charts.js";
import { applyBaseOptions } from "./utils.js";

export interface ChartOptions extends UiBaseOptions {
  messageData: ChartDatum[];
  userActivityData: ChartDatum[];
}

export function createChart(options: ChartOptions): HTMLElement {
  const chart = createDashboardCharts(options.messageData, options.userActivityData);
  chart.classList.add("ui-chart");
  applyBaseOptions(chart, options);
  return chart;
}
