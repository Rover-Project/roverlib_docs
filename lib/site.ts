/** Dados gerais do site. Ajuste aqui o repositório e a branch usados nos links. */
export const site = {
  name: "RoverLib",
  description:
    "Biblioteca Python educacional para programar o Rover, robô do Projeto ROVER da UFPI baseado em Raspberry Pi 5.",
  repo: "https://github.com/Rover-Project/Rover",
  repoLabel: "Rover-Project/Rover",
  branch: "main",
  /** Pasta das páginas dentro do repositório (para o link "Editar esta página"). */
  docsDir: "docs",
  /** Pasta que contém o pacote roverlib (para os links de código-fonte da API). */
  srcDir: "roverlib/src",
};

/** Prefixo do site quando publicado em subpasta (ex.: GitHub Pages em /Rover). */
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  if (!path.startsWith("/")) return path;
  return `${basePath}${path}`;
}
