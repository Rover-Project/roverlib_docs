"use client";

import MiniSearch, { type SearchResult } from "minisearch";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { SearchDoc } from "@/lib/search";
import { basePath } from "@/lib/site";
import { SearchIcon } from "./icons";

const normalize = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function snippet(text: string, terms: string[]): string {
  const plain = normalize(text);
  let pos = -1;
  for (const t of terms) {
    const i = plain.indexOf(t);
    if (i >= 0 && (pos < 0 || i < pos)) pos = i;
  }
  const start = Math.max(0, pos - 50);
  let out = text.slice(start, start + 170);
  if (start > 0) out = "…" + out.replace(/^\S*\s/, "");
  if (start + 170 < text.length) out = out.replace(/\s\S*$/, "") + "…";
  return out;
}

function highlight(text: string, terms: string[]) {
  if (!terms.length) return text;
  const norm = normalize(text);
  const parts: (string | ReactElement)[] = [];
  let i = 0;
  let k = 0;
  while (i < text.length) {
    let hit = 0;
    for (const t of terms) if (t.length > 1 && norm.startsWith(t, i)) hit = Math.max(hit, t.length);
    if (hit) {
      parts.push(<mark key={k++}>{text.slice(i, i + hit)}</mark>);
      i += hit;
    } else {
      let j = i + 1;
      while (j < text.length && !terms.some((t) => t.length > 1 && norm.startsWith(t, j))) j++;
      parts.push(text.slice(i, j));
      i = j;
    }
  }
  return parts;
}

type Hit = SearchResult & SearchDoc;

export function SearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<MiniSearch<SearchDoc> | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const load = useCallback(async () => {
    if (index) return;
    try {
      const res = await fetch(`${basePath}/search-index.json`);
      const docs: SearchDoc[] = await res.json();
      const ms = new MiniSearch<SearchDoc>({
        fields: ["heading", "page", "text"],
        storeFields: ["route", "anchor", "page", "section", "heading", "text"],
        processTerm: (t) => normalize(t),
        searchOptions: { boost: { heading: 3, page: 1.5 }, prefix: true, fuzzy: 0.2, combineWith: "AND" },
      });
      ms.addAll(docs);
      setIndex(ms);
    } catch {
      setFailed(true);
    }
  }, [index]);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      load();
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        show();
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("rover:open-search", show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("rover:open-search", show);
      window.removeEventListener("keydown", onKey);
    };
  }, [load]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
  }, [open]);

  const terms = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);
  const results = useMemo(() => {
    if (!index || !query.trim()) return [] as Hit[];
    return (index.search(query) as Hit[]).slice(0, 12);
  }, [index, query]);

  useEffect(() => setSelected(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const go = (hit: Hit) => {
    setOpen(false);
    setQuery("");
    router.push(hit.route + (hit.anchor ? `#${hit.anchor}` : ""));
  };

  if (!open) return null;

  return (
    <div
      className="search-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Buscar na documentação"
    >
      <div className="search-panel">
        <div className="search-input-row">
          <SearchIcon />
          <input
            ref={inputRef}
            value={query}
            placeholder="Buscar comandos, páginas e aulas"
            onChange={(e) => setQuery(e.target.value)}
            aria-controls="search-results"
            aria-activedescendant={results[selected] ? `sr-${results[selected].id}` : undefined}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelected((s) => Math.min(s + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelected((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter" && results[selected]) go(results[selected]);
            }}
          />
          <kbd>Esc</kbd>
        </div>
        {failed ? (
          <p className="search-empty">Não foi possível carregar o índice de busca. Recarregue a página e tente de novo.</p>
        ) : !query.trim() ? (
          <p className="search-empty">Digite um comando como <code>forward</code>, <code>is_obstacle</code> ou um tema como “PID”.</p>
        ) : !index ? (
          <p className="search-empty">Carregando o índice…</p>
        ) : results.length === 0 ? (
          <p className="search-empty">Nada encontrado para “{query}”. Tente outra palavra ou o nome de um método.</p>
        ) : (
          <ul className="search-results" id="search-results" role="listbox" ref={listRef}>
            {results.map((r, i) => (
              <li key={r.id} id={`sr-${r.id}`} role="option" aria-selected={i === selected} onMouseEnter={() => setSelected(i)}>
                <a
                  href={`${basePath}${r.route}${r.anchor ? `#${r.anchor}` : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    go(r);
                  }}
                >
                  <span className="r-page">
                    {r.section && r.section !== r.page ? `${r.section} / ` : ""}
                    {r.page}
                  </span>
                  <span className="r-title">{highlight(r.heading, terms)}</span>
                  {r.text && <span className="r-snippet">{highlight(snippet(r.text, terms), terms)}</span>}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
