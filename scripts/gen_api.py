"""
Gera content/api.json a partir das docstrings da RoverLib (sem importar o pacote).

Faz o papel do mkdocstrings: lê o código com o griffe, interpreta as docstrings
no estilo Google e grava um JSON que o site Next.js usa para montar a Referência da API.

Uso:
    pip install griffe
    python scripts/gen_api.py --src ../Rover/roverlib/src

Só são exportados os objetos citados nas páginas (linhas "::: caminho.do.objeto").
"""
import argparse
import json
import re
import sys
from pathlib import Path

import griffe

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "content"


def ann(x):
    return None if x is None else str(x)


SECTION_RE = re.compile(
    r"(?<=\S)\n(?=[ \t]*(Args|Arguments|Parameters|Params|Returns|Return|Raises|Yields|"
    r"Examples?|Attributes|Notes?|Warnings?|Tip|Important):[ \t]*\n)"
)


def parse_docstring(obj):
    """Seções da docstring (estilo Google), como lista de dicts serializáveis."""
    if not obj.docstring:
        return []
    # O parser do griffe só reconhece "Args:" etc. depois de uma linha em branco;
    # várias docstrings da RoverLib não a têm, então ela é inserida aqui.
    obj.docstring.value = SECTION_RE.sub("\n\n", obj.docstring.value)
    sections = []
    for s in obj.docstring.parse("google", warn_missing_types=False, warnings=False):
        kind = s.kind.value
        if kind == "text":
            sections.append({"kind": "text", "value": s.value})
        elif kind in ("parameters", "other parameters", "attributes"):
            sections.append({
                "kind": kind,
                "value": [
                    {"name": p.name, "annotation": ann(p.annotation),
                     "description": p.description or "", "default": ann(getattr(p, "default", None))}
                    for p in s.value
                ],
            })
        elif kind in ("returns", "yields", "receives", "raises", "warns"):
            sections.append({
                "kind": kind,
                "value": [
                    {"name": getattr(r, "name", "") or "", "annotation": ann(r.annotation),
                     "description": r.description or ""}
                    for r in s.value
                ],
            })
        elif kind == "examples":
            parts = []
            for sub_kind, text in s.value:
                parts.append({"kind": sub_kind.value, "value": text})
            sections.append({"kind": "examples", "value": parts})
        elif kind == "admonition":
            sections.append({"kind": "admonition", "title": s.title or "",
                             "annotation": s.value.annotation, "value": s.value.description})
        else:
            sections.append({"kind": "text", "value": str(getattr(s, "value", ""))})
    return sections


def params_of(fn, drop_self=True):
    out = []
    for p in fn.parameters:
        if drop_self and p.name in ("self", "cls"):
            continue
        out.append({"name": p.name, "kind": p.kind.value if p.kind else None,
                    "annotation": ann(p.annotation), "default": ann(p.default)})
    return out


SRC = None


def _rel(path):
    try:
        return Path(path).resolve().relative_to(SRC).as_posix()
    except Exception:  # noqa: BLE001
        return None


def has_doc(o):
    return bool(o.docstring and o.docstring.value.strip())


def dump(obj, depth=0):
    if obj.is_alias:
        obj = obj.final_target
    d = {"name": obj.name, "path": obj.path, "kind": obj.kind.value,
         "labels": sorted(obj.labels), "lineno": obj.lineno,
         "filepath": _rel(obj.filepath)}

    if obj.is_function:
        d["parameters"] = params_of(obj, drop_self=obj.parent is not None and obj.parent.is_class)
        d["returns"] = ann(obj.returns)
        d["docstring"] = parse_docstring(obj)
    elif obj.is_attribute:
        d["annotation"] = ann(obj.annotation)
        d["value"] = ann(obj.value)
        d["docstring"] = parse_docstring(obj)
    elif obj.is_class:
        d["bases"] = [str(b) for b in obj.bases]
        doc = parse_docstring(obj)
        init = obj.members.get("__init__")
        if init is not None and not init.is_alias and init.is_function:
            d["parameters"] = params_of(init)
            # Como merge_init_into_class: a docstring do __init__ completa a da classe
            doc += parse_docstring(init)
        else:
            d["parameters"] = []
        d["docstring"] = doc
        members = []
        for name, m in obj.members.items():  # ordem do código-fonte
            if name.startswith("_") or m.is_alias:
                continue
            if not has_doc(m):  # como show_if_no_docstring: false
                continue
            if m.is_class or m.is_function or m.is_attribute:
                members.append(dump(m, depth + 1))
        members.sort(key=lambda x: x.get("lineno") or 0)
        d["members"] = members
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="pasta que contém o pacote roverlib (ex.: Rover/roverlib/src)")
    ap.add_argument("--out", default=str(CONTENT / "api.json"))
    args = ap.parse_args()
    global SRC
    SRC = Path(args.src).resolve()

    refs = []
    for md in sorted(CONTENT.rglob("*.md")):
        refs += re.findall(r"^:::\s+([\w.]+)", md.read_text(encoding="utf-8"), flags=re.M)

    pkg = griffe.load("roverlib", search_paths=[args.src], docstring_parser="google",
                      allow_inspection=False, resolve_aliases=True, resolve_external=False)
    out, missing = {}, []
    for ref in refs:
        try:
            out[ref] = dump(pkg[ref.removeprefix("roverlib.")])
        except Exception as e:  # noqa: BLE001
            missing.append(f"{ref}: {e}")

    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(out)} objetos gravados em {args.out}")
    if missing:
        print("Não encontrados:\n  " + "\n  ".join(missing), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
