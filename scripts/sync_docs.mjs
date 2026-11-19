// Copia as páginas .md de ../docs para content/ (uso: npm run sync).
// Pensado para quando este projeto fica dentro do repositório, em Rover/site/.
import fs from "node:fs";
import path from "node:path";

const src = path.resolve(process.argv[2] ?? "../docs");
const dest = path.resolve("content");
if (!fs.existsSync(src)) {
  console.error(`Pasta não encontrada: ${src}`);
  process.exit(1);
}
let n = 0;
for (const entry of fs.readdirSync(src, { recursive: true })) {
  const rel = entry.toString();
  if (!rel.endsWith(".md")) continue;
  fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true });
  fs.copyFileSync(path.join(src, rel), path.join(dest, rel));
  n++;
}
console.log(`${n} páginas copiadas de ${src} para ${dest}`);
