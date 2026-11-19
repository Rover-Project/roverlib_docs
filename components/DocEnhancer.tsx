"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { basePath } from "@/lib/site";

/**
 * Comportamentos do HTML gerado a partir do Markdown, por delegação de eventos:
 * botão "Copiar", abas sincronizadas pelo rótulo e navegação sem recarregar a página.
 */
export function DocEnhancer() {
  const router = useRouter();

  useEffect(() => {
    const onClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      const copy = target.closest<HTMLButtonElement>(".copy-btn");
      if (copy) {
        const code = copy.parentElement?.querySelector("pre")?.innerText ?? "";
        try {
          await navigator.clipboard.writeText(code.replace(/\n$/, ""));
          copy.textContent = "Copiado";
          copy.dataset.copied = "";
          setTimeout(() => {
            copy.textContent = "Copiar";
            delete copy.dataset.copied;
          }, 1600);
        } catch {
          copy.textContent = "Selecione e copie";
        }
        return;
      }

      const link = target.closest<HTMLAnchorElement>(".doc a[href]");
      if (!link || link.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      const href = link.getAttribute("href")!;
      if (href.startsWith("#")) return;
      if (href.startsWith("/") && (!basePath || href.startsWith(basePath + "/") || href === basePath)) {
        e.preventDefault();
        router.push(href.slice(basePath.length) || "/");
      }
    };

    const onChange = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (input.type !== "radio" || !input.closest(".tabbed-set")) return;
      const label = input.dataset.label;
      if (!label) return;
      document
        .querySelectorAll<HTMLInputElement>(`.tabbed-set > input[data-label="${CSS.escape(label)}"]`)
        .forEach((other) => {
          if (other !== input) other.checked = true;
        });
    };

    document.addEventListener("click", onClick);
    document.addEventListener("change", onChange);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("change", onChange);
    };
  }, [router]);

  return null;
}
