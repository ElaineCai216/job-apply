#!/usr/bin/env python3
"""定制简历工具：在保留原版式的前提下，对 .docx 做跨 run 文本替换。

用法:
    python3 docx_tailor.py input.docx output.docx edits.json

edits.json 格式:
    [{"find": "原文", "replace": "新文"}, ...]

特性:
- 支持 Word 把一句话拆成多个 run 的情况（如 "核对" + "6" + "个月以来…"）
- 只替换匹配到的文字，保留其余格式（加粗、字号、颜色不变）
- 输出替换/未命中报告，便于核对
"""
import json, sys, zipfile, shutil, os
from xml.etree import ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def replace_in_paragraph(tnodes, find, repl):
    texts = [t.text or "" for t in tnodes]
    full = "".join(texts)
    idx = full.find(find)
    if idx < 0:
        return False
    end = idx + len(find)
    spans, pos = [], 0
    for i, t in enumerate(texts):
        spans.append((pos, pos + len(t), i))
        pos += len(t)
    first = True
    for (s, e, i) in spans:
        if e <= idx or s >= end:
            continue
        local_s = max(0, idx - s)
        local_e = min(len(texts[i]), end - s)
        before, after = texts[i][:local_s], texts[i][local_e:]
        if first:
            texts[i] = before + repl + after
            first = False
        else:
            texts[i] = before + after
    for i, t in enumerate(tnodes):
        t.text = texts[i]
        if texts[i] != texts[i].strip():
            t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
    return True


def tailor(in_path, out_path, edits):
    tmp = out_path + ".tmpdir"
    if os.path.exists(tmp):
        shutil.rmtree(tmp)
    os.makedirs(tmp)
    with zipfile.ZipFile(in_path) as z:
        z.extractall(tmp)
    doc = os.path.join(tmp, "word", "document.xml")
    tree = ET.parse(doc)
    root = tree.getroot()
    results = []
    for e in edits:
        find, repl = e["find"], e["replace"]
        done = False
        for p in root.iter(W + "p"):
            tnodes = [t for t in p.iter(W + "t")]
            if not tnodes:
                continue
            if replace_in_paragraph(tnodes, find, repl):
                done = True
                break
        results.append({"find": find, "applied": done})
    tree.write(doc, encoding="UTF-8", xml_declaration=True)
    if os.path.exists(out_path):
        os.remove(out_path)
    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        for base, _, files in os.walk(tmp):
            for f in files:
                full = os.path.join(base, f)
                z.write(full, os.path.relpath(full, tmp))
    shutil.rmtree(tmp)
    return results


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    edits = json.load(open(sys.argv[3], encoding="utf-8"))
    res = tailor(sys.argv[1], sys.argv[2], edits)
    ok = sum(1 for r in res if r["applied"])
    for r in res:
        print(("  ✅ " if r["applied"] else "  ❌ 未命中 ") + repr(r["find"])[:70])
    print(f"完成：{ok}/{len(res)} 处替换生效 → {sys.argv[2]}")
    sys.exit(0 if ok == len(res) else 2)
