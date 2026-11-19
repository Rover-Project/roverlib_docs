import Link from "next/link";
import { getHome } from "@/lib/content";

export default async function HomePage() {
  const home = await getHome();
  // A abertura do index.md tem dois parágrafos e o exemplo de código
  const [paragraphs, code] = splitIntro(home.introHtml);

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-inner">
          <div>
            <h1 id="hero-title">{home.title}</h1>
            <div className="hero-lead" dangerouslySetInnerHTML={{ __html: paragraphs }} />
            <div className="hero-actions">
              <Link href="/instalacao/" className="btn btn-primary">
                Instalar a RoverLib
              </Link>
              <Link href="/primeiro-projeto/" className="btn btn-ghost">
                Fazer o primeiro projeto
              </Link>
            </div>
          </div>
          {code && (
            <figure className="hero-code doc" style={{ margin: 0 }}>
              <div dangerouslySetInnerHTML={{ __html: code }} />
              <figcaption>O mesmo código roda no PC, com motores simulados, e no Rover.</figcaption>
            </figure>
          )}
        </div>
      </section>
      <main id="conteudo" className="home-body">
        <article className="doc" dangerouslySetInnerHTML={{ __html: home.rest.html }} />
      </main>
    </>
  );
}

function splitIntro(html: string): [string, string] {
  const i = html.indexOf('<div class="code-block">');
  if (i < 0) return [html, ""];
  const end = html.indexOf("</div>", html.indexOf("</pre>", i)) + "</div>".length;
  return [html.slice(0, i) + html.slice(end), html.slice(i, end)];
}
