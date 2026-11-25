"""Build the static library from the ranking and original slide decks."""

import argparse
import csv
import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def paragraph_text(node):
    return "".join(text.text or "" for text in node.iter(W + "t"))


def read_essay(path):
    with ZipFile(path) as doc:
        body = ET.fromstring(doc.read("word/document.xml")).find(W + "body")
        relations = ET.fromstring(doc.read("word/_rels/document.xml.rels"))
        links = {r.get("Id"): r.get("Target") for r in relations
                 if r.get("TargetMode") == "External"
                 and urlsplit(r.get("Target", "")).scheme in {"http", "https"}}

    paragraphs = []
    for paragraph in body.findall(W + "p"):
        style = paragraph.find(f"{W}pPr/{W}pStyle")
        kind = style.get(W + "val") if style is not None else ""
        if kind in {"Title", "EssayLabel"} or not paragraph_text(paragraph).strip():
            continue
        parts = [{"text": paragraph_text(part), "href": links.get(part.get(R + "id"))}
                 for part in paragraph if part.tag in {W + "r", W + "hyperlink"}]
        paragraphs.append({"heading": kind == "Heading1", "parts": parts})
    return paragraphs


def build(output):
    output.mkdir(parents=True, exist_ok=True)
    for asset in ("index.html", "styles.css", "reader.js"):
        shutil.copyfile(ROOT / "site" / asset, output / asset)

    ranked = ROOT / "ranked-essays"
    row_pattern = re.compile(
        r"(?m)^\| (\d+) \| (.*?) \(\[Word\].*?\) \| \[(\d+-\d+)\]\(\.\./([^)]+)\)"
        r" \| ([^|]+) \| ([^|]+) \|$"
    )
    rows = row_pattern.findall((ranked / "README.md").read_text(encoding="utf-8"))
    if [int(row[0]) for row in rows] != list(range(1, len(rows) + 1)) or not rows:
        raise ValueError("The ranked essay table must have consecutive ranks beginning at 1.")

    with (ROOT / "site" / "briefs.tsv").open(encoding="utf-8", newline="") as source:
        briefs = {}
        for brief in csv.DictReader(source, delimiter="\t"):
            code = brief.pop("draft")
            if code in briefs or not all(brief.get(field) for field in ("thesis", "example", "fit")):
                raise ValueError(f"Invalid or duplicate brief for {code}.")
            briefs[code] = brief
    codes = {row[2] for row in rows}
    if codes != briefs.keys() or len(codes) != len(rows):
        raise ValueError("Every ranked draft must have one short guide.")

    entries = []
    with tempfile.TemporaryDirectory(prefix="essay-slides-") as workspace:
        profile = (Path(workspace) / "libreoffice").as_uri()
        for rank, title, code, original, strength, tradeoff in rows:
            folder = ROOT / unquote(original)
            files = output / "files" / rank
            files.mkdir(parents=True, exist_ok=True)
            word = ranked / f"{rank}.docx"
            shutil.copyfile(word, files / "essay.docx")
            shutil.copyfile(ranked / "pdf" / f"{rank}.pdf", files / "essay.pdf")
            slides = files / "slides.pptx"
            shutil.copyfile(folder / "Presentation.pptx", slides)
            preview = files / "slides.pdf"
            preview.unlink(missing_ok=True)
            subprocess.run(["soffice", f"-env:UserInstallation={profile}", "--headless",
                            "--convert-to", "pdf", "--outdir", str(files), str(slides)],
                           check=True, stdout=subprocess.DEVNULL)
            if not preview.is_file():
                raise RuntimeError(f"Unable to render the presentation for draft {code}.")
            topic = folder.parent.name.split(" - ", 1)[1]
            entries.append({"rank": int(rank), "title": title, "code": code, "topic": topic,
                            "original": original, "strength": strength, "tradeoff": tradeoff,
                            "brief": briefs[code], "paragraphs": read_essay(word)})

    (output / "catalog.json").write_text(json.dumps(entries, ensure_ascii=False), encoding="utf-8")
    print(f"Built the library with {len(entries)} essays and presentations.")


if __name__ == "__main__":
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("output", type=Path)
    build(cli.parse_args().output.resolve())
