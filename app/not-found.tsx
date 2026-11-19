import Link from "next/link";

export default function NotFound() {
  return (
    <main id="conteudo" className="home-body">
      <article className="doc">
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter mudado. Use a busca (Ctrl K) ou volte para o <Link href="/">início da documentação</Link>.</p>
      </article>
    </main>
  );
}
