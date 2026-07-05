import type { ChartDatum } from "../types";
import type { UiBaseOptions } from "./types";
import { createDashboardCharts } from "../dashboard-charts";
import { applyBaseOptions } from "./utils";

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
