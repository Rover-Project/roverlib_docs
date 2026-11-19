import { allFiles, getDoc } from "./content";
import { fileToRoute, flatPages } from "./nav";

export type SearchDoc = {
  id: number;
  route: string;
  anchor: string;
  page: string;
  section: string;
  heading: string;
  text: string;
};

export async function buildSearchDocs(): Promise<SearchDoc[]> {
  const docs: SearchDoc[] = [];
  let id = 0;
  for (const file of allFiles()) {
    const doc = await getDoc(file);
    const navPage = flatPages.find((p) => p.file === file);
    for (const s of doc.sections) {
      docs.push({
        id: id++,
        route: fileToRoute(file),
        anchor: s.anchor,
        page: doc.title,
        section: navPage?.section ?? "",
        heading: s.heading || doc.title,
        text: s.text.slice(0, 1800),
      });
    }
  }
  return docs;
}
