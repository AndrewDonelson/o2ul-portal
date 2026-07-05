import type { DataTableColumn } from "./types";
import { createTable } from "./ui/table";

export function createDataTable(columns: DataTableColumn[], rows: Array<Record<string, string | number>>): HTMLElement {
  return createTable({ columns, rows, className: "shared-data-table-wrap" });
}
