import type { DataTableColumn } from "./types.js";
import { createTable } from "./ui/table.js";

export function createDataTable(columns: DataTableColumn[], rows: Array<Record<string, string | number>>): HTMLElement {
  return createTable({ columns, rows, className: "shared-data-table-wrap" });
}
