export type HorizontalAlign = "left" | "center" | "right";

export interface ContentCardOptions {
  title?: string;
  bodyHtml?: string;
  footerText?: string;
  align?: HorizontalAlign;
  className?: string;
}

export interface SliderOptions {
  intervalMs?: number;
  autoPlay?: boolean;
}

export interface ChartDatum {
  name: string;
  total: number;
}

export interface DataTableColumn {
  key: string;
  label: string;
}

export interface EmptyStateOptions {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface StatsCardOptions {
  title: string;
  value: string | number;
  description?: string;
}

export type StatusType = "online" | "away" | "offline";
