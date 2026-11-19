"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/** Barra lateral fixa no computador; gaveta no celular. */
export function SidebarShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("rover:toggle-drawer", toggle);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("rover:toggle-drawer", toggle);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <>
      <div className="drawer-backdrop" data-open={open} onClick={() => setOpen(false)} />
      <aside className="sidebar" data-open={open} aria-label="Navegação da documentação">
        {children}
      </aside>
    </>
  );
}
