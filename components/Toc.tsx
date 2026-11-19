"use client";

import { useEffect, useState } from "react";
import type { TocItem } from "@/lib/markdown";

/** "Nesta página", com a seção visível destacada. */
export function Toc({ items, editUrl }: { items: TocItem[]; editUrl: string }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!els.length) return;
    const onScroll = () => {
      const offset = 140;
      let current = els[0].id;
      for (const el of els) {
        if (el.getBoundingClientRect().top - offset <= 0) current = el.id;
        else break;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [items]);

  return (
    <aside className="toc" aria-label="Nesta página">
      {items.length > 0 && (
        <>
          <h2>Nesta página</h2>
          <ul>
            {items.map((i) => (
              <li key={i.id}>
                <a
                  href={`#${i.id}`}
                  className={`level-${i.level}${active === i.id ? " active" : ""}${i.id.startsWith("roverlib.") ? " toc-code" : ""}`}
                >
                  {i.text}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <a className="toc-edit" href={editUrl} target="_blank" rel="noopener noreferrer">
        Editar esta página no GitHub
      </a>
    </aside>
  );
}
