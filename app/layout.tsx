import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "next-themes";
import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/jetbrains-mono";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Header } from "@/components/Header";
import { SearchDialog } from "@/components/SearchDialog";
import { DocEnhancer } from "@/components/DocEnhancer";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { default: `${site.name}: documentação`, template: `%s | ${site.name}` },
  description: site.description,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#073a59",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <a href="#conteudo" className="skip-link">
            Pular para o conteúdo
          </a>
          <Header />
          {children}
          <footer className="site-footer">
            <div>
              Projeto ROVER, Departamento de Computação da UFPI. Código e documentação sob licença MIT no{" "}
              <a href={site.repo} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              .
            </div>
          </footer>
          <SearchDialog />
          <DocEnhancer />
        </ThemeProvider>
      </body>
    </html>
  );
}
