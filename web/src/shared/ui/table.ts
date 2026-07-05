import type { UiBaseOptions, UiTone } from "./types";
import { applyBaseOptions, toneClass } from "./utils";
import type { DataTableColumn } from "../types";

export interface TableOptions extends UiBaseOptions {
  columns: DataTableColumn[];
  rows: Array<Record<string, string | number>>;
  tone?: UiTone;
}

export function createTable(options: TableOptions): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = `ui-table ${toneClass(options.tone)}`;

  const table = document.createElement("table");
  table.className = "shared-data-table";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  options.columns.forEach((col) => {
    const th = document.createElement("th");
    th.textContent = col.label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement("tbody");
  if (options.rows.length === 0) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = options.columns.length;
    emptyCell.className = "shared-data-table-empty";
    emptyCell.textContent = "No results.";
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  } else {
    options.rows.forEach((row) => {
      const tr = document.createElement("tr");
      options.columns.forEach((col) => {
        const td = document.createElement("td");
        td.textContent = String(row[col.key] ?? "");
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
  }

  table.append(thead, tbody);
  wrapper.appendChild(table);
  applyBaseOptions(wrapper, options);
  return wrapper;
}
