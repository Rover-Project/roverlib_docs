import Link from "next/link";
import { fileToRoute, type NavPage } from "@/lib/nav";

export function PageNav({ prev, next }: { prev?: NavPage; next?: NavPage }) {
  if (!prev && !next) return null;
  return (
    <nav className="page-nav" aria-label="Página anterior e próxima">
      {prev && (
        <Link href={fileToRoute(prev.file)} className="prev">
          <span>Anterior</span>
          <strong>{prev.title}</strong>
        </Link>
      )}
      {next && (
        <Link href={fileToRoute(next.file)} className="next">
          <span>Próxima</span>
          <strong>{next.title}</strong>
        </Link>
      )}
    </nav>
  );
}
