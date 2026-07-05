import type { HorizontalAlign } from "./types";

export const DEFAULT_COPYRIGHT_FROM = 2017;
export const DEFAULT_COPYRIGHT_HOLDER = "Nlaak Studios, LLC";

export function alignClass(align: HorizontalAlign): string {
  if (align === "left") return "shared-align-left";
  if (align === "right") return "shared-align-right";
  return "shared-align-center";
}

export function currentYearDisplay(fromYear: number): string {
  const currentYear = new Date().getFullYear();
  return currentYear > fromYear ? `${fromYear}-${currentYear}` : `${currentYear}`;
}
