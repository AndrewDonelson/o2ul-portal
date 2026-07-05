import type { ChartDatum } from "./types.js";

function createSimpleBarChart(title: string, data: ChartDatum[], accentClass: string): HTMLElement {
  const card = document.createElement("section");
  card.className = "shared-chart-card";

  const heading = document.createElement("h4");
  heading.className = "shared-chart-title";
  heading.textContent = title;
  card.appendChild(heading);

  const max = data.reduce((runningMax, datum) => Math.max(runningMax, datum.total), 1);
  const list = document.createElement("ul");
  list.className = "shared-chart-list";

  data.forEach((datum) => {
    const row = document.createElement("li");
    row.className = "shared-chart-row";

    const label = document.createElement("span");
    label.className = "shared-chart-label";
    label.textContent = datum.name;

    const value = document.createElement("span");
    value.className = "shared-chart-value";
    value.textContent = String(datum.total);

    const barTrack = document.createElement("div");
    barTrack.className = "shared-chart-track";

    const bar = document.createElement("div");
    bar.className = `shared-chart-bar ${accentClass}`;
    const width = Math.max(6, Math.round((datum.total / max) * 100));
    bar.style.width = `${width}%`;

    barTrack.appendChild(bar);
    row.append(label, value, barTrack);
    list.appendChild(row);
  });

  card.appendChild(list);
  return card;
}

export function createDashboardCharts(messageData: ChartDatum[], userActivityData: ChartDatum[]): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "shared-dashboard-grid";
  wrapper.append(
    createSimpleBarChart("Message Activity", messageData, "is-message"),
    createSimpleBarChart("User Activity", userActivityData, "is-user"),
  );
  return wrapper;
}
