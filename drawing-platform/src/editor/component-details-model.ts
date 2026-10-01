import type { CanvasElement } from "../../shared/contracts.js";

export const elementName = (element: CanvasElement): string => {
  if (element.type === "system") return element.title;
  if (element.type === "text") return element.text;
  if (element.type === "image") return element.alt || "Image";
  return element.label || (element.type === "connector" ? "Connector" : "Shape");
};

export const hasArchitectureDetails = (element: CanvasElement): boolean =>
  Object.values(element.metadata ?? {}).some(value => Boolean(value?.trim()));

export interface RelatedComponent {
  id: string;
  name: string;
  relationship: string;
  label?: string;
}

/** Navigation comes from actual bindings, never guesses from free-text notes. */
export function relatedComponents(selected: CanvasElement, elements: readonly CanvasElement[]): RelatedComponent[] {
  const visible = elements.filter(element => !element.deleted);
  const byId = new Map(visible.map(element => [element.id, element]));
  const canonical = (id: string | undefined) => id ? byId.get(id)?.referenceId ?? id : undefined;
  const selectedCanonical = canonical(selected.id);
  const results: RelatedComponent[] = [];
  const add = (id: string | undefined, relationship: string, label?: string) => {
    const targetId = canonical(id);
    const target = targetId ? byId.get(targetId) : undefined;
    if (!target || target.id === selected.id || target.type === "connector") return;
    if (results.some(item => item.id === target.id && item.relationship === relationship && item.label === label)) return;
    results.push({ id: target.id, name: elementName(target), relationship, ...(label ? { label } : {}) });
  };
  if (selected.referenceId) add(selected.referenceId, "Main component");
  if (selected.type === "connector") {
    add(selected.startBinding, "Start");
    add(selected.endBinding, "End");
    return results;
  }
  for (const route of visible) {
    if (route.type !== "connector") continue;
    const atStart = canonical(route.startBinding) === selectedCanonical;
    const atEnd = canonical(route.endBinding) === selectedCanonical;
    if ((!atStart && !atEnd) || (atStart && atEnd)) continue;
    const toward = atStart ? route.startArrow : route.endArrow;
    const away = atStart ? route.endArrow : route.startArrow;
    const relationship = toward === "arrow" && away === "arrow" ? "Exchanges with"
      : toward === "arrow" ? "Receives from" : away === "arrow" ? "Sends to" : "Connected to";
    add(atStart ? route.endBinding : route.startBinding, relationship, route.label);
  }
  return results;
}
