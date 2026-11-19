import Link from "next/link";
import { nav, fileToRoute } from "@/lib/nav";

export function SidebarNav({ currentFile }: { currentFile: string }) {
  return (
    <nav>
      {nav.map((section) => {
        // Seção de uma página só (Início): vira um link simples, sem título repetido
        if (section.pages.length === 1 && section.pages[0].title === section.title) {
          const p = section.pages[0];
          return (
            <div key={section.title} className="nav-section nav-home">
              <ul>
                <li>
                  <Link href={fileToRoute(p.file)} aria-current={p.file === currentFile ? "page" : undefined}>
                    {p.title}
                  </Link>
                </li>
              </ul>
            </div>
          );
        }
        const isCurrent = section.pages.some((p) => p.file === currentFile);
        return (
          <div key={section.title} className={`nav-section${isCurrent ? " is-current" : ""}`}>
            <h2>{section.title}</h2>
            <ul>
              {section.pages.map((p) => (
                <li key={p.file}>
                  <Link href={fileToRoute(p.file)} aria-current={p.file === currentFile ? "page" : undefined}>
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
