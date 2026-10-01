import type { BoardDocument, TemplateDefinition } from "../../shared/contracts.js";

/** Stable element identities recognize renamed copies without guessing from prose. */
export function findDesignTemplate(
  board: BoardDocument,
  templates: readonly TemplateDefinition[],
  previewId?: string | null,
): TemplateDefinition | undefined {
  if (previewId) return templates.find(template => template.id === previewId);
  const ids = new Set(board.scene.elements.map(element => element.id));
  const matches = templates.filter(template => template.scene.elements.length > 0).map(template => {
    const matched = template.scene.elements.filter(element => ids.has(element.id)).length;
    return { template, matched, ratio: matched / template.scene.elements.length };
  }).filter(match => match.matched >= 3 && match.ratio >= 0.5)
    .sort((a, b) => b.ratio - a.ratio || b.matched - a.matched);
  if (matches.length > 1 && matches[0].ratio === matches[1].ratio && matches[0].matched === matches[1].matched) return undefined;
  return matches[0]?.template;
}
