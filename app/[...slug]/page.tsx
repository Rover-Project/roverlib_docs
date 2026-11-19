import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allFiles, getDoc } from "@/lib/content";
import { findPage, fileToRoute, routeToSlug, lessons } from "@/lib/nav";
import { site } from "@/lib/site";
import { SidebarShell } from "@/components/SidebarShell";
import { SidebarNav } from "@/components/SidebarNav";
import { Toc } from "@/components/Toc";
import { PageNav } from "@/components/PageNav";
import { LessonRail } from "@/components/LessonRail";

type Props = { params: Promise<{ slug: string[] }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return allFiles()
    .filter((f) => f !== "index.md")
    .map((f) => ({ slug: routeToSlug(f) }));
}

function fileFromSlug(slug: string[]): string | undefined {
  const route = `/${slug.map(decodeURIComponent).join("/")}/`;
  return allFiles().find((f) => fileToRoute(f) === route);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const file = fileFromSlug((await params).slug);
  if (!file) return {};
  const doc = await getDoc(file);
  return { title: doc.title };
}

export default async function DocPage({ params }: Props) {
  const file = fileFromSlug((await params).slug);
  if (!file) notFound();
  const doc = await getDoc(file);
  const { prev, next } = findPage(file);
  const isLesson = lessons.some((l) => l.file === file) || file === "aprender/index.md";
  const editUrl = `${site.repo}/edit/${site.branch}/${site.docsDir}/${file}`;

  return (
    <div className="doc-layout">
      <SidebarShell>
        <SidebarNav currentFile={file} />
      </SidebarShell>
      <main id="conteudo" className="doc-main">
        {isLesson && <LessonRail currentFile={file} />}
        <article className="doc" dangerouslySetInnerHTML={{ __html: doc.html }} />
        <PageNav prev={prev} next={next} />
      </main>
      <Toc items={doc.toc} editUrl={editUrl} />
    </div>
  );
}
