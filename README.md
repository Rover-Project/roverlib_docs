# Documentação da RoverLib (Next.js)

Site de documentação da RoverLib feito com Next.js, no lugar do MkDocs Material.
As páginas continuam em Markdown, com a mesma sintaxe de antes: avisos (`!!!`),
abas (`===`), listas de definição, fórmulas em `$...$` e blocos `::: roverlib...`
da Referência da API.

## Rodar localmente

Requer Node.js 20 ou mais recente.

```bash
npm install
npm run dev          # http://localhost:3000
```

Para gerar o site estático (pasta `out/`) e conferir:

```bash
npm run build
npm run preview
```

## Onde fica cada coisa

| Caminho | Conteúdo |
|---|---|
| `content/*.md` | As páginas (cópia de `docs/`) |
| `content/api.json` | Referência da API gerada das docstrings |
| `lib/nav.ts` | Menu do site (equivale ao `nav:` do `mkdocs.yml`) |
| `lib/site.ts` | Repositório e branch usados nos links |
| `lib/preprocess.ts` | Conversão de `!!!`, `===`, definições e `:::` |
| `lib/markdown.ts` | Pipeline remark/rehype: KaTeX, Shiki, âncoras e índice de busca |
| `app/globals.css` | Cores, tipografia e layout (temas claro e escuro) |
| `public/assets/` | Logo e imagens (comprimidas) |

Para adicionar uma página, crie o `.md` em `content/` e inclua-o em `lib/nav.ts`.

## Referência da API

Os blocos `::: roverlib.modulo.Objeto` são montados a partir de `content/api.json`.
Para atualizá-lo depois de mudar as docstrings:

```bash
pip install griffe
python scripts/gen_api.py --src caminho/para/Rover/roverlib/src
```

O script lê o código sem importá-lo (não precisa de OpenCV nem GPIO), interpreta as
docstrings no estilo Google e segue as opções do `mkdocs.yml` antigo: membros privados
e sem docstring ficam de fora, e o `__init__` é mostrado junto da classe.

## Dentro do repositório Rover

O jeito mais simples de manter tudo sincronizado é colocar este projeto em `Rover/site/`:

```bash
npm run sync   # copia ../docs/*.md para content/
npm run api    # gera content/api.json a partir de ../roverlib/src
npm run build
```

O arquivo `.github/workflows/deploy-docs.yml` faz esses passos e publica no GitHub Pages.
Mova-o para `Rover/.github/workflows/` e, em **Settings > Pages**, escolha **GitHub Actions**
como origem. O build usa `NEXT_PUBLIC_BASE_PATH=/Rover` para funcionar em
`https://rover-project.github.io/Rover/`.
