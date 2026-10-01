/** Known generated sizing appendix. Keep its derivations in the linked document. */
export const CAPACITY_SOURCE = "md/drawing-platform/CAPACITY_ASSUMPTIONS.md";
export const CAPACITY_BOILERPLATE = "BOTEC ASSUMPTIONS, not benchmarks.";

export function splitCapacityExplanation(explanation = ""): { explanation: string; hasCapacityNotes: boolean } {
  const index = explanation.indexOf(CAPACITY_BOILERPLATE);
  const generated = index >= 0 && explanation.slice(index).includes(`See ${CAPACITY_SOURCE}.`);
  return { explanation: generated ? explanation.slice(0, index).trim() : explanation, hasCapacityNotes: generated };
}
