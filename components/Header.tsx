"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { nav, fileToRoute } from "@/lib/nav";
import { site, withBase } from "@/lib/site";
import { GitHubIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon } from "./icons";

const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      className="header-btn"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Usar tema claro" : "Usar tema escuro"}
      title={dark ? "Usar tema claro" : "Usar tema escuro"}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}

export function Header() {
  const pathname = trim(usePathname() || "/");
  const [isMac, setIsMac] = useState(false);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/.test(navigator.platform)), []);

  return (
    <header className="site-header">
      <div className="header-bar">
        <button
          type="button"
          className="header-btn menu-btn"
          aria-label="Abrir menu de navegação"
          onClick={() => window.dispatchEvent(new Event("rover:toggle-drawer"))}
        >
          <MenuIcon />
        </button>
        <Link href="/" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={withBase("/assets/logo-Rover.png")} alt="" width={38} height={38} />
          RoverLib <small>documentação</small>
        </Link>
        <div className="header-spacer" />
        <button
          type="button"
          className="header-btn search-trigger"
          onClick={() => window.dispatchEvent(new Event("rover:open-search"))}
          aria-label="Buscar na documentação"
        >
          <SearchIcon />
          <span className="label">Buscar</span>
          <kbd>{isMac ? "⌘ K" : "Ctrl K"}</kbd>
        </button>
        <ThemeToggle />
        <a className="header-btn gh" href={site.repo} target="_blank" rel="noopener noreferrer">
          <GitHubIcon />
          <span className="label">GitHub</span>
        </a>
      </div>
      <nav className="section-tabs" aria-label="Seções">
        <ul>
          {nav.map((section) => {
            const routes = section.pages.map((p) => trim(fileToRoute(p.file)));
            const active =
              section.title === "Início" ? pathname === "/" : routes.includes(pathname);
            return (
              <li key={section.title}>
                <Link href={fileToRoute(section.pages[0].file)} aria-current={active ? "true" : undefined}>
                  {section.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
