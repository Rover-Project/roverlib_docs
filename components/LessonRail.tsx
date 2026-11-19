import Link from "next/link";
import { lessons, fileToRoute } from "@/lib/nav";

/** Trilha das seis aulas: as concluídas em azul, a atual em laranja. */
export function LessonRail({ currentFile }: { currentFile?: string }) {
  const idx = lessons.findIndex((l) => l.file === currentFile);
  return (
    <nav className="lesson-rail" aria-label="Aulas da trilha Aprender">
      <p className="lesson-rail-caption">
        {idx >= 0 ? `Aula ${idx + 1} de ${lessons.length} da trilha Aprender` : `Trilha Aprender: ${lessons.length} aulas`}
      </p>
      <ol>
        {lessons.map((l, i) => {
          const state = idx < 0 ? "" : i < idx ? "done" : i === idx ? "current" : "";
          return (
            <li key={l.file} className={state}>
              <Link href={fileToRoute(l.file)} aria-current={state === "current" ? "page" : undefined} title={l.short}>
                <span className="stop">{i + 1}</span>
                <span className="rail-label">{l.short}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
