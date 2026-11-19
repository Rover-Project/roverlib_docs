/**
 * Converte as extensões de Markdown do MkDocs Material que o remark não conhece
 * em HTML com Markdown dentro (processado depois pelo rehype-raw):
 *
 *   !!! note "Título"      -> caixa de aviso (admonition)
 *   ??? note "Título"      -> caixa recolhível (<details>)
 *   === "Aba"              -> abas (pymdownx.tabbed)
 *   termo\n:   definição  -> lista de definições (def_list)
 *   ::: caminho.do.objeto  -> bloco da Referência da API (mkdocstrings)
 */
import { renderApiObject } from "./api-md";

const ADMONITION_TITLES: Record<string, string> = {
  note: "Nota",
  abstract: "Resumo",
  info: "Informação",
  tip: "Dica",
  success: "Sucesso",
  question: "Pergunta",
  warning: "Atenção",
  failure: "Falha",
  danger: "Perigo",
  bug: "Bug",
  example: "Exemplo",
  quote: "Citação",
};

const ADMONITION_ALIASES: Record<string, string> = {
  seealso: "note",
  hint: "tip",
  important: "tip",
  check: "success",
  done: "success",
  help: "question",
  faq: "question",
  caution: "warning",
  attention: "warning",
  fail: "failure",
  missing: "failure",
  error: "danger",
  cite: "quote",
  summary: "abstract",
  tldr: "abstract",
  todo: "info",
};

let tabCounter = 0;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Converte o título (que pode ter `código`) em HTML simples. */
function inlineTitle(s: string): string {
  return escapeHtml(s).replace(/`([^`]+)`/g, "<code>$1</code>");
}

const isFence = (line: string) => /^ {0,3}(```|~~~)/.test(line);

/** Linhas indentadas (4 espaços ou tab) ou em branco que seguem a linha `start`. */
function takeIndented(lines: string[], start: number): { body: string[]; end: number } {
  const body: string[] = [];
  let i = start;
  while (i < lines.length) {
    const l = lines[i];
    if (l.trim() === "") {
      body.push("");
      i++;
      continue;
    }
    if (l.startsWith("    ")) body.push(l.slice(4));
    else if (l.startsWith("\t")) body.push(l.slice(1));
    else break;
    i++;
  }
  // devolve as linhas em branco finais para o bloco de fora
  while (body.length && body[body.length - 1] === "") {
    body.pop();
    i--;
  }
  return { body, end: i };
}

export function preprocess(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  let inFence = false;
  let fenceMarker = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (inFence) {
      out.push(line);
      if (line.trim().startsWith(fenceMarker)) inFence = false;
      continue;
    }
    if (isFence(line)) {
      inFence = true;
      fenceMarker = line.trim().slice(0, 3);
      out.push(line);
      continue;
    }

    // ::: roverlib.modulo.Objeto
    const api = line.match(/^:::\s+([\w.]+)\s*$/);
    if (api) {
      const { end } = takeIndented(lines, i + 1); // opções do mkdocstrings (ignoradas)
      out.push("", renderApiObject(api[1], 2), "");
      i = end - 1;
      continue;
    }

    // !!! tipo "Título"   /   ??? tipo "Título"   /   ???+ tipo
    const adm = line.match(/^(!!!|\?\?\?\+?)\s+([\w-]+)(?:\s+"(.*)")?\s*$/);
    if (adm) {
      const [, marker, rawType, title] = adm;
      const type = ADMONITION_ALIASES[rawType] ?? (ADMONITION_TITLES[rawType] ? rawType : "note");
      const label = title ?? ADMONITION_TITLES[type] ?? rawType;
      const { body, end } = takeIndented(lines, i + 1);
      const inner = preprocess(body.join("\n"));
      if (marker === "!!!") {
        out.push(
          `<div class="admonition admonition-${type}">`,
          label ? `<p class="admonition-title">${inlineTitle(label)}</p>` : "",
          "",
          inner,
          "",
          "</div>",
          ""
        );
      } else {
        out.push(
          `<details class="admonition admonition-${type}"${marker === "???+" ? " open" : ""}>`,
          `<summary class="admonition-title">${inlineTitle(label)}</summary>`,
          "",
          inner,
          "",
          "</details>",
          ""
        );
      }
      i = end - 1;
      continue;
    }

    // === "Aba" (grupos de abas consecutivas)
    if (/^===\+?\s+"(.*)"\s*$/.test(line)) {
      const tabs: { label: string; body: string }[] = [];
      let j = i;
      while (j < lines.length) {
        const m = lines[j].match(/^===\+?\s+"(.*)"\s*$/);
        if (!m) break;
        const { body, end } = takeIndented(lines, j + 1);
        tabs.push({ label: m[1], body: preprocess(body.join("\n")) });
        j = end;
        // permite linhas em branco entre as abas do mesmo grupo
        let k = j;
        while (k < lines.length && lines[k].trim() === "") k++;
        if (k < lines.length && /^===\+?\s+"/.test(lines[k])) j = k;
        else break;
      }
      const id = `tabs-${++tabCounter}`;
      out.push(`<div class="tabbed-set" data-tabs="${tabs.length}">`);
      tabs.forEach((t, n) =>
        out.push(
          `<input type="radio" name="${id}" id="${id}-${n}" data-label="${escapeHtml(t.label)}"${n === 0 ? " checked" : ""}>`
        )
      );
      out.push(
        `<div class="tabbed-labels">${tabs
          .map((t, n) => `<label for="${id}-${n}">${inlineTitle(t.label)}</label>`)
          .join("")}</div>`,
        `<div class="tabbed-content">`
      );
      for (const t of tabs) out.push(`<div class="tabbed-block">`, "", t.body, "", `</div>`);
      out.push(`</div>`, `</div>`, "");
      i = j - 1;
      continue;
    }

    // Lista de definições: linha de termo seguida de ":   definição"
    const next = lines[i + 1];
    if (line.trim() !== "" && next !== undefined && /^:\s{1,3}\S/.test(next)) {
      const items: string[] = [];
      let j = i;
      while (j < lines.length && lines[j].trim() !== "" && /^:\s{1,3}\S/.test(lines[j + 1] ?? "")) {
        const term = lines[j];
        const first = lines[j + 1].replace(/^:\s{1,3}/, "");
        const { body, end } = takeIndented(lines, j + 2);
        const def = preprocess([first, ...body].join("\n"));
        items.push("<dt>", "", term, "", "</dt>", "<dd>", "", def, "", "</dd>");
        j = end;
        while (j < lines.length && lines[j].trim() === "") j++;
      }
      out.push(`<dl class="deflist">`, ...items, `</dl>`, "");
      i = j - 1;
      continue;
    }

    out.push(line);
  }
  return out.join("\n");
}
