import path from "node:path";
import { unified, type PluggableList } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import { visit, SKIP } from "unist-util-visit";
import type { Root, Element, ElementContent, RootContent, Text } from "hast";
import { preprocess } from "./preprocess";
import { createSlugger } from "./slug";
import { fileToRoute } from "./nav";
import { withBase } from "./site";

export type TocItem = { id: string; text: string; level: number };
export type SearchSection = { anchor: string; heading: string; text: string };

const HEADINGS = new Set(["h1", "h2", "h3", "h4", "h5", "h6"]);

const hasClass = (el: Element, cls: string) => {
  const c: unknown = el.properties?.className ?? el.properties?.class;
  return Array.isArray(c) ? c.includes(cls) : typeof c === "string" && c.split(" ").includes(cls);
};

/** Texto de um nó, sem o HTML/MathML duplicado do KaTeX e sem as âncoras "#". */
function textOf(node: ElementContent | RootContent): string {
  if (node.type === "text") return node.value;
  // o shiki deixa um nó "root" no lugar de cada <pre>
  if ((node as { type: string }).type === "root") return (node as unknown as Root).children.map(textOf).join("") + " ";
  if (node.type !== "element") return "";
  if (hasClass(node, "katex-mathml") || hasClass(node, "anchor") || hasClass(node, "copy-btn")) return "";
  if (hasClass(node, "katex")) {
    const ann = findAnnotation(node);
    return ann ? ` ${ann} ` : "";
  }
  const sep = ["p", "li", "tr", "pre", "div", "dt", "dd", "td", "th", "br"].includes(node.tagName) ? " " : "";
  return node.children.map(textOf).join("") + sep;
}

function findAnnotation(node: Element): string | null {
  let found: string | null = null;
  visit(node, "element", (el: Element) => {
    if (el.tagName === "annotation" && el.children[0]?.type === "text") {
      found = (el.children[0] as Text).value;
      return false;
    }
  });
  return found;
}

function containsHeading(node: Element): boolean {
  let found = false;
  visit(node, "element", (el: Element) => {
    if (el !== node && HEADINGS.has(el.tagName)) {
      found = true;
      return false;
    }
  });
  return found;
}

/** Plugin com os ajustes finais: âncoras, links, blocos de código, tabelas, sumário e busca. */
function rehypeDocs(options: { file: string }) {
  return (tree: Root, vfile: { data: Record<string, unknown> }) => {
    const slug = createSlugger();
    const toc: TocItem[] = [];
    const fileDir = path.posix.dirname(options.file);

    visit(tree, "element", (node: Element, index, parent) => {
      // Títulos: id no padrão do Python-Markdown + link "#"
      if (HEADINGS.has(node.tagName)) {
        const text = textOf(node).replace(/\s+/g, " ").trim();
        if (!node.properties.id) node.properties.id = slug(text);
        const id = String(node.properties.id);
        const level = Number(node.tagName[1]);
        const tocText = (node.properties.dataToc as string) || text;
        if (level === 2 || level === 3) toc.push({ id, text: tocText, level });
        if (level > 1) {
          node.children.push({
            type: "element",
            tagName: "a",
            properties: { className: ["anchor"], href: `#${id}`, ariaLabel: "Link para esta seção" },
            children: [{ type: "text", value: "#" }],
          });
        }
        return SKIP;
      }

      // Links: .md relativo -> rota do site; externos abrem em nova aba
      if (node.tagName === "a" && typeof node.properties.href === "string") {
        const href = node.properties.href;
        if (/^(https?:|mailto:)/.test(href)) {
          node.properties.target = "_blank";
          node.properties.rel = ["noopener", "noreferrer"];
          node.properties.className = [...((node.properties.className as string[]) ?? []), "external"];
        } else if (!href.startsWith("#") && !href.startsWith("/")) {
          const [target, hash] = href.split("#");
          if (target.endsWith(".md")) {
            const resolved = path.posix.normalize(path.posix.join(fileDir, target));
            node.properties.href = withBase(fileToRoute(resolved)) + (hash ? `#${hash}` : "");
          }
        }
      }

      // Imagens relativas -> /assets/...
      if (node.tagName === "img" && typeof node.properties.src === "string") {
        const src = node.properties.src;
        if (!/^(https?:|data:|\/)/.test(src)) {
          node.properties.src = withBase("/" + path.posix.normalize(path.posix.join(fileDir, src)));
        }
        node.properties.loading = "lazy";
      }

      // Blocos de código com botão de copiar
      if (node.tagName === "pre" && parent && typeof index === "number") {
        const wrapper: Element = {
          type: "element",
          tagName: "div",
          properties: { className: ["code-block"] },
          children: [
            {
              type: "element",
              tagName: "button",
              properties: { type: "button", className: ["copy-btn"], ariaLabel: "Copiar código" },
              children: [{ type: "text", value: "Copiar" }],
            },
            node,
          ],
        };
        parent.children[index] = wrapper;
        return SKIP;
      }

      // Tabelas largas rolam dentro de um contêiner
      if (node.tagName === "table" && parent && typeof index === "number" && !hasClass(parent as Element, "table-wrap")) {
        parent.children[index] = {
          type: "element",
          tagName: "div",
          properties: { className: ["table-wrap"] },
          children: [node],
        };
        return SKIP;
      }
    });

    // Seções para a busca: o texto entre um título e o próximo
    const sections: SearchSection[] = [];
    let current: SearchSection = { anchor: "", heading: "", text: "" };
    const flush = () => {
      current.text = current.text.replace(/\s+/g, " ").trim();
      if (current.text || current.heading) sections.push(current);
    };
    const walk = (nodes: (RootContent | ElementContent)[]) => {
      for (const n of nodes) {
        if ((n as { type: string }).type === "root") {
          current.text += " " + textOf(n);
          continue;
        }
        if (n.type !== "element") continue;
        if (HEADINGS.has(n.tagName)) {
          flush();
          current = {
            anchor: n.tagName === "h1" ? "" : String(n.properties.id ?? ""),
            heading: (n.properties.dataToc as string) || textOf(n).replace(/#$/, "").trim(),
            text: "",
          };
        } else if (containsHeading(n)) {
          walk(n.children);
        } else {
          current.text += " " + textOf(n);
        }
      }
    };
    walk(tree.children);
    flush();

    vfile.data.toc = toc;
    vfile.data.sections = sections;
  };
}

export type RenderedDoc = { html: string; toc: TocItem[]; sections: SearchSection[] };

export async function renderMarkdown(markdown: string, file: string): Promise<RenderedDoc> {
  const plugins: PluggableList = [
    remarkGfm,
    remarkMath,
    [remarkRehype, { allowDangerousHtml: true }],
    rehypeRaw,
    [rehypeKatex, { output: "htmlAndMathml", throwOnError: false, strict: false }],
    [rehypeShiki, {
      theme: "github-dark-default",
      fallbackLanguage: "text",
      addLanguageClass: true,
      langs: ["python", "bash", "yaml", "text", "toml", "json", "ini"],
    }],
    [rehypeDocs, { file }],
    rehypeStringify,
  ];
  const result = await unified().use(remarkParse).use(plugins).process(preprocess(markdown));

  return {
    html: String(result),
    toc: (result.data.toc as TocItem[]) ?? [],
    sections: (result.data.sections as SearchSection[]) ?? [],
  };
}
