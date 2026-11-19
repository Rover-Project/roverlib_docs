import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { flatPages } from "./nav";
import { renderMarkdown, type RenderedDoc } from "./markdown";

const CONTENT_DIR = path.join(process.cwd(), "content");

export type Doc = RenderedDoc & { file: string; title: string; source: string };

function readSource(file: string): string {
  return fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
}

/** Título = primeiro "# " da página (sem a formatação de código). */
export function titleOf(source: string, fallback: string): string {
  const m = source.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/`/g, "").trim() : fallback;
}

export const getDoc = cache(async (file: string): Promise<Doc> => {
  const source = readSource(file);
  const page = flatPages.find((p) => p.file === file);
  const rendered = await renderMarkdown(source, file);
  return { ...rendered, file, source, title: titleOf(source, page?.title ?? file) };
});

/**
 * A página inicial é dividida em duas partes: a abertura (título, parágrafos e o
 * primeiro exemplo de código), mostrada no topo, e o restante, a partir do primeiro "## ".
 */
export const getHome = cache(async () => {
  const source = readSource("index.md");
  const cut = source.search(/^##\s/m);
  const intro = (cut >= 0 ? source.slice(0, cut) : source).replace(/^#\s+.+$/m, "").trim();
  const rest = cut >= 0 ? source.slice(cut) : "";
  const [introDoc, restDoc] = await Promise.all([
    renderMarkdown(intro, "index.md"),
    renderMarkdown(rest, "index.md"),
  ]);
  const paragraphs = intro.split(/\n{2,}/).filter((b) => !b.startsWith("```"));
  return {
    title: titleOf(source, "RoverLib"),
    introHtml: introDoc.html,
    lead: paragraphs[0] ?? "",
    rest: restDoc,
  };
});

export function allFiles(): string[] {
  return flatPages.map((p) => p.file).filter((f) => fs.existsSync(path.join(CONTENT_DIR, f)));
}
