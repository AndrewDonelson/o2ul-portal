import type { StatusType } from "./types.js";
import { createBadge } from "./ui/badge.js";

export function calculateStatus(lastSeenEpochMs?: number): StatusType {
  if (!lastSeenEpochMs) return "offline";
  const ageMs = Date.now() - lastSeenEpochMs;
  if (ageMs < 5 * 60 * 1000) return "online";
  if (ageMs < 30 * 60 * 1000) return "away";
  return "offline";
}

export function createStatusIndicator(status?: StatusType, lastSeenEpochMs?: number): HTMLElement {
  const resolved = status ?? calculateStatus(lastSeenEpochMs);
  const tone = resolved === "online" ? "success" : resolved === "away" ? "accent" : "muted";
  const root = createBadge({
    label: resolved.charAt(0).toUpperCase() + resolved.slice(1),
    tone,
    className: `shared-status-indicator is-${resolved}`,
  });
  return root;
}
