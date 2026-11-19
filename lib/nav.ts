/**
 * Navegação do site — equivale à seção `nav:` do mkdocs.yml.
 * Cada aba do topo é uma seção; as páginas aparecem na barra lateral.
 */
export type NavPage = { title: string; file: string };
export type NavSection = { title: string; pages: NavPage[] };

export const nav: NavSection[] = [
  { title: "Início", pages: [{ title: "Início", file: "index.md" }] },
  {
    title: "Primeiros passos",
    pages: [
      { title: "Instalação", file: "instalacao.md" },
      { title: "Primeiro projeto", file: "primeiro-projeto.md" },
      { title: "Configuração (config.yaml)", file: "configuracao.md" },
    ],
  },
  {
    title: "Guia",
    pages: [
      { title: "Arquitetura", file: "arquitetura.md" },
      { title: "Exemplos", file: "exemplos.md" },
    ],
  },
  {
    title: "Aprender",
    pages: [
      { title: "Visão geral", file: "aprender/index.md" },
      { title: "1. Locomoção diferencial", file: "aprender/aula1-locomocao.md" },
      { title: "2. Sensores e estados", file: "aprender/aula2-sensores.md" },
      { title: "3. Imagem e cor", file: "aprender/aula3-imagem.md" },
      { title: "4. Detecção de objetos", file: "aprender/aula4-deteccao.md" },
      { title: "5. Controle por visão", file: "aprender/aula5-controle.md" },
      { title: "6. Projeto integrador", file: "aprender/aula6-projeto.md" },
    ],
  },
  {
    title: "Referência da API",
    pages: [
      { title: "Rover", file: "api/rover.md" },
      { title: "Movimento", file: "api/movimento.md" },
      { title: "Câmera", file: "api/camera.md" },
      { title: "Pan-tilt da câmera", file: "api/pan_tilt.md" },
      { title: "Sensores", file: "api/sensores.md" },
      { title: "Visão e processamento", file: "api/visao.md" },
      { title: "Configuração e erros", file: "api/utilitarios.md" },
    ],
  },
];

/** "aprender/index.md" -> "/aprender/", "instalacao.md" -> "/instalacao/" */
export function fileToRoute(file: string): string {
  const noExt = file.replace(/\.md$/, "");
  const parts = noExt.split("/").filter((p) => p !== "index");
  return parts.length ? `/${parts.join("/")}/` : "/";
}

export function routeToSlug(file: string): string[] {
  return fileToRoute(file).split("/").filter(Boolean);
}

export const flatPages = nav.flatMap((s) => s.pages.map((p) => ({ ...p, section: s.title })));

export function findPage(file: string) {
  const i = flatPages.findIndex((p) => p.file === file);
  return {
    page: flatPages[i],
    prev: i > 0 ? flatPages[i - 1] : undefined,
    next: i >= 0 && i < flatPages.length - 1 ? flatPages[i + 1] : undefined,
  };
}

export function sectionOf(file: string): NavSection | undefined {
  return nav.find((s) => s.pages.some((p) => p.file === file));
}

/** As seis aulas da trilha, na ordem. */
export const lessons = nav
  .find((s) => s.title === "Aprender")!
  .pages.filter((p) => /aula\d/.test(p.file))
  .map((p) => ({ ...p, short: p.title.replace(/^\d+\.\s*/, "") }));
