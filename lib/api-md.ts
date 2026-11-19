/**
 * Monta o Markdown da Referência da API a partir de content/api.json
 * (gerado por scripts/gen_api.py a partir das docstrings da RoverLib).
 */
import fs from "node:fs";
import path from "node:path";
import { site } from "./site";

type Param = { name: string; kind?: string | null; annotation: string | null; default: string | null };
type DocItem = { name: string; annotation: string | null; description: string; default?: string | null };
type Section =
  | { kind: "text"; value: string }
  | { kind: "parameters" | "other parameters" | "attributes"; value: DocItem[] }
  | { kind: "returns" | "yields" | "receives" | "raises" | "warns"; value: DocItem[] }
  | { kind: "examples"; value: { kind: "text" | "examples"; value: string }[] }
  | { kind: "admonition"; title: string; annotation: string; value: string };

export type ApiObject = {
  name: string;
  path: string;
  kind: "class" | "function" | "attribute" | "module";
  labels: string[];
  lineno: number | null;
  filepath: string | null;
  bases?: string[];
  parameters?: Param[];
  returns?: string | null;
  annotation?: string | null;
  value?: string | null;
  docstring: Section[];
  members?: ApiObject[];
};

let cache: Record<string, ApiObject> | null = null;

function loadApi(): Record<string, ApiObject> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "content", "api.json");
  cache = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  return cache!;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto seguro para uma célula de tabela GFM. */
function cell(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("<br>")
    .replace(/\|/g, "\\|");
}

const codeCell = (s: string | null | undefined) => (s ? `<code>${esc(s)}</code>` : "");

function kindLabel(o: ApiObject, isMember: boolean): { key: string; label: string } {
  if (o.kind === "class") return { key: "class", label: "classe" };
  if (o.kind === "attribute") {
    return o.labels.includes("property")
      ? { key: "property", label: "propriedade" }
      : { key: "attribute", label: "atributo" };
  }
  if (o.kind === "function") {
    if (o.labels.includes("classmethod")) return { key: "method", label: "método de classe" };
    if (o.labels.includes("staticmethod")) return { key: "method", label: "método estático" };
    return isMember ? { key: "method", label: "método" } : { key: "function", label: "função" };
  }
  return { key: o.kind, label: o.kind };
}

function formatParams(params: Param[]): string[] {
  const out: string[] = [];
  let starDone = false;
  for (const p of params) {
    let s = p.name;
    if (p.kind === "variadic positional") s = `*${s}`;
    else if (p.kind === "variadic keyword") s = `**${s}`;
    else if (p.kind === "keyword-only" && !starDone) {
      out.push("*");
    }
    if (p.kind === "variadic positional" || p.kind === "keyword-only") starDone = true;
    if (p.annotation) s += `: ${p.annotation}`;
    if (p.default !== null && p.default !== undefined) s += p.annotation ? ` = ${p.default}` : `=${p.default}`;
    out.push(s);
  }
  return out;
}

function signature(o: ApiObject): string {
  if (o.kind === "attribute") {
    let s = o.name;
    if (o.annotation) s += `: ${o.annotation}`;
    if (o.value && !o.labels.includes("property")) s += ` = ${o.value}`;
    return s;
  }
  const params = formatParams(o.parameters ?? []);
  const head = o.kind === "class" ? `class ${o.name}` : `def ${o.name}`;
  const tail = o.kind === "function" && o.returns ? ` -> ${o.returns}` : "";
  const oneLine = `${head}(${params.join(", ")})${tail}`;
  if (oneLine.length <= 76) return oneLine;
  return `${head}(\n${params.map((p) => `    ${p},`).join("\n")}\n)${tail}`;
}

function paramTable(items: DocItem[], sig: Param[] | undefined, title: string): string {
  const sigMap = new Map((sig ?? []).map((p) => [p.name, p]));
  const rows = items.map((it) => {
    const s = sigMap.get(it.name);
    const type = it.annotation ?? s?.annotation ?? null;
    const def = s ? (s.default ?? null) : (it.default ?? null);
    const defCell = s && (s.default === null || s.default === undefined) ? "*obrigatório*" : codeCell(def);
    return `| ${codeCell(it.name)} | ${codeCell(type)} | ${cell(it.description)} | ${defCell} |`;
  });
  return [
    `<p class="api-section-title">${title}</p>`,
    "",
    "| Nome | Tipo | Descrição | Padrão |",
    "|---|---|---|---|",
    ...rows,
  ].join("\n");
}

function simpleTable(items: DocItem[], title: string, firstCol: string): string {
  const rows = items.map((it) => `| ${codeCell(it.annotation || it.name)} | ${cell(it.description)} |`);
  return [`<p class="api-section-title">${title}</p>`, "", `| ${firstCol} | Descrição |`, "|---|---|", ...rows].join(
    "\n"
  );
}

const SECTION_TITLES: Record<string, string> = {
  parameters: "Parâmetros",
  "other parameters": "Outros parâmetros",
  attributes: "Atributos",
  returns: "Retorna",
  yields: "Produz",
  receives: "Recebe",
  raises: "Exceções",
  warns: "Avisos",
};

function renderSections(o: ApiObject): string[] {
  const parts: string[] = [];
  for (const s of o.docstring) {
    switch (s.kind) {
      case "text":
        parts.push(s.value);
        break;
      case "parameters":
      case "other parameters":
        parts.push(paramTable(s.value, s.kind === "parameters" ? o.parameters : undefined, SECTION_TITLES[s.kind]));
        break;
      case "attributes":
        parts.push(simpleTable(s.value.map((v) => ({ ...v, annotation: v.name })), "Atributos", "Nome"));
        break;
      case "returns":
      case "yields":
      case "receives":
      case "warns":
        parts.push(simpleTable(s.value, SECTION_TITLES[s.kind], "Tipo"));
        break;
      case "raises":
        parts.push(simpleTable(s.value, "Exceções", "Exceção"));
        break;
      case "examples":
        parts.push(`<p class="api-section-title">Exemplos</p>`);
        for (const e of s.value) {
          parts.push(e.kind === "examples" ? "```python\n" + e.value + "\n```" : e.value);
        }
        break;
      case "admonition": {
        const type = ["warning", "tip", "danger", "note"].includes(s.annotation) ? s.annotation : "note";
        parts.push(
          `<div class="admonition admonition-${type}">`,
          `<p class="admonition-title">${esc(s.title || s.annotation)}</p>`,
          "",
          s.value,
          "",
          "</div>"
        );
        break;
      }
    }
  }
  return parts;
}

function sourceLink(o: ApiObject): string {
  if (!o.filepath) return "";
  const href = `${site.repo}/blob/${site.branch}/${site.srcDir}/${o.filepath}${o.lineno ? `#L${o.lineno}` : ""}`;
  return `<a class="api-source" href="${esc(href)}">Código-fonte</a>`;
}

function render(o: ApiObject, level: number, isMember: boolean): string {
  const { key, label } = kindLabel(o, isMember);
  const tag = `h${Math.min(level, 6)}`;
  const parts: string[] = [
    `<${tag} id="${esc(o.path)}" class="api-heading" data-toc="${esc(o.name)}" data-kind="${key}">` +
      `<span class="api-kind">${label}</span> <code>${esc(o.name)}</code></${tag}>`,
    "",
    `<div class="api-object api-${key}">`,
    "",
    "```python\n" + signature(o) + "\n```",
    "",
  ];
  if (o.bases && o.bases.length) {
    parts.push(`<p class="api-bases">Herda de ${o.bases.map((b) => `<code>${esc(b)}</code>`).join(", ")}</p>`, "");
  }
  parts.push(...renderSections(o).flatMap((p) => [p, ""]));
  parts.push(sourceLink(o), "");
  for (const m of o.members ?? []) parts.push(render(m, level + 1, true), "");
  parts.push("</div>");
  return parts.join("\n");
}

export function renderApiObject(ref: string, level = 2): string {
  const api = loadApi();
  const obj = api[ref];
  if (!obj) {
    return [
      `<div class="admonition admonition-warning">`,
      `<p class="admonition-title">Referência não encontrada</p>`,
      "",
      `O objeto \`${ref}\` não está em \`content/api.json\`. Rode \`npm run api\` para gerar a referência a partir do código da RoverLib.`,
      "",
      "</div>",
    ].join("\n");
  }
  return render(obj, level, false);
}
