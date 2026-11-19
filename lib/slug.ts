/** Mesmo algoritmo de âncoras do Python-Markdown (toc.slugify), para manter os links do MkDocs. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "-");
}

export function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string) => {
    let base = slugify(text) || "secao";
    if (!seen.has(base)) {
      seen.set(base, 0);
      return base;
    }
    let n = seen.get(base)!;
    let candidate: string;
    do {
      n += 1;
      candidate = `${base}_${n}`;
    } while (seen.has(candidate));
    seen.set(base, n);
    seen.set(candidate, 0);
    return candidate;
  };
}
