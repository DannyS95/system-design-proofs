import type { CanvasElement } from "../../shared/contracts.js";
import { CAPACITY_SOURCE, splitCapacityExplanation } from "../../shared/capacity-reference.js";
import { elementName } from "./component-details-model.js";

export function componentBrief(element: CanvasElement) {
  const metadata = element.metadata ?? {};
  const split = splitCapacityExplanation(metadata.explanation);
  const subtitle = element.type === "system" ? element.subtitle ?? "" : "";
  const normalize = (text: string) => text.trim().toLowerCase().replace(/[.·]$/g, "");
  const names = new Set([elementName(element), subtitle].map(normalize));
  const clean = split.explanation.split(/\n/).filter(line => !names.has(normalize(line))).join("\n").trim();
  const raw = clean || (element.type === "system" ? element.body || subtitle : "") || "";
  const sentences = raw.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
  let summary = "";
  for (const sentence of sentences) {
    if ((summary + " " + sentence).length > 200) break;
    summary += (summary ? " " : "") + sentence;
    if (summary.length >= 100) break;
  }
  if (!summary.trim() && raw) summary = raw.replace(/\s+/g, " ").slice(0, 196).replace(/\s+\S*$/, "") + "…";
  summary = summary.trim();
  return {
    summary: metadata.objectType === "workload estimate" ? `Compares ${metadata.ownership || "component"} demand with the assumed processing budget.` : summary,
    notes: raw.replace(/\s+/g, " ").trim() !== summary ? raw : undefined,
    hasCapacityNotes: split.hasCapacityNotes || Boolean(metadata.sourcePath?.includes(CAPACITY_SOURCE)),
  };
}

export interface CapacityMetric {
  label: string;
  used: string;
  budget: string;
  unit: string;
  percent: number;
  memory: boolean;
}

const amount = "[≈~]?[\\d,.]+[kKmM]?";
const numberValue = (value: string) => Number(value.replace(/[≈~,]/g, "").replace(/[kKmM]$/, "")) * (/k$/i.test(value) ? 1_000 : /m$/i.test(value) ? 1_000_000 : 1);
const displayValue = (value: string) => value.replace(/[≈~]/g, "");

/** Only explicit demand / budget pairs are meters. Hit percentages are not load. */
export function capacityMetric(caption: string): CapacityMetric | undefined {
  const memory = caption.match(new RegExp(`(${amount})\\s*/\\s*(${amount})\\s*(GB|MB)\\s+resident`, "i"));
  const peak = caption.match(new RegExp(`peak:?\\s*(${amount})\\s*/\\s*(?:safe\\s+)?(${amount})`, "i"));
  const match = memory ?? peak;
  if (!match) return undefined;
  const used = numberValue(match[1]), budget = numberValue(match[2]);
  if (!Number.isFinite(used) || !Number.isFinite(budget) || budget <= 0) return undefined;
  const unit = memory?.[3] ?? caption.match(/operations\/s|ops\/s|events\/s|messages\/s|requests\/s|QPS/i)?.[0] ?? "";
  return { label: memory ? "Storage used" : "Peak load", used: displayValue(match[1]), budget: displayValue(match[2]), unit,
    percent: Math.round(used / budget * 100), memory: Boolean(memory) };
}
