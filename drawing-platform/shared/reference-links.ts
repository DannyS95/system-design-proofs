/** Portable text references: one `Label | https://…` (or bare URL) per line. */
export interface ReferenceLink { label: string; url: string }

export function safeReferenceUrl(value: string): string | undefined {
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return undefined;
  try {
    const url = new URL(value);
    if (!url.hostname || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}

export function parseReferenceLinks(value = ""): ReferenceLink[] {
  if (value.length > 4_000) throw new Error("Reference links must fit within 4,000 characters.");
  return value.split(/\r?\n/).flatMap((line, index) => {
    const text = line.trim();
    if (!text) return [];
    const separator = text.indexOf("|");
    const label = separator < 0 ? text : text.slice(0, separator).trim();
    const address = separator < 0 ? text : text.slice(separator + 1).trim();
    const url = safeReferenceUrl(address);
    if (!label || !url) throw new Error(`Reference link on line ${index + 1}: use Label | https://example.com/page or a full HTTP(S) URL.`);
    return [{ label, url }];
  });
}
