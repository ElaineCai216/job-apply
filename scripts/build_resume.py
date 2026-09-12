#!/usr/bin/env python3
"""按岗位定制简历：读取 profile.json + 定制 spec → 生成 HTML → Chrome 无头导出 PDF。

用法:
    python3 build_resume.py --profile ../profile/profile.json --lang zh --out /tmp/cv-zh.html --pdf /tmp/cv-zh.pdf [--spec spec.json]

spec.json 可选字段:
    headline        字符串，放在姓名下方的一句话定位（按 JD 重写）
    order_exp       实习经历顺序，如 ["bocom","beichen","boc","putuo"]
    limit_bullets   每条经历保留几条 bullet，如 {"bocom":4,"beichen":3,"boc":2,"putuo":2}
    sections        区块顺序，如 ["education","experience","projects","skills"]
    skills_order    技能分组顺序，如 ["office","programming","design"]
    emphasize       关键词数组（会在文中高亮加粗命中项）
"""
import argparse, html, json, os, re, subprocess, sys

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

T = {
    "zh": {
        "education": "教育背景", "experience": "实习经历", "projects": "项目与活动", "skills": "技能与语言",
        "languages": "语言能力", "grade": "",
    },
    "en": {
        "education": "EDUCATION", "experience": "INTERNSHIP EXPERIENCE", "projects": "PROJECTS & ACTIVITIES", "skills": "SKILLS & LANGUAGES",
        "languages": "Languages", "grade": "",
    },
}

CSS = """
@page { size: A4; margin: 11mm 12mm; }
* { box-sizing: border-box; }
body { font-family: %(bodyfont)s; color:#1f1c19; font-size:%(fs)s; line-height:1.36; margin:0; }
h1 { font-family:%(titlefont)s; font-size:%(h1)s; letter-spacing:.02em; margin:0 0 1.5mm; font-weight:600; }
.contact { color:#5f5850; font-size:%(meta)s; margin-bottom:3.5mm; }
h2 { font-family:%(titlefont)s; font-size:%(h2)s; font-weight:600; color:#8f2d22; margin:2.9mm 0 1.3mm; padding-bottom:.8mm; border-bottom:.6pt solid #d9b7b0; letter-spacing:.06em; }
.entry { margin-bottom:1.7mm; }
.entry:last-child { margin-bottom:0; }
.row { display:flex; justify-content:space-between; align-items:baseline; gap:6mm; }
.org { font-weight:700; }
.role { color:#3f3a35; }
.date { color:#6b6459; font-size:%(meta)s; white-space:nowrap; }
ul { margin:.8mm 0 0; padding-left:4.4mm; }
li { margin-bottom:.35mm; }
.skills-line { margin-bottom:1mm; }
.skills-line b { color:#8f2d22; font-weight:600; }
.hl { font-weight:700; }
"""


def esc(s): return html.escape(str(s or ""))


def hl(text, keywords, lang):
    out = esc(text)
    for k in keywords or []:
        if not k: continue
        out = re.sub("(" + re.escape(esc(k)) + ")", r'<span class="hl">\1</span>', out, flags=re.I)
    return out


DEFAULT_LIMITS = {
    "zh": {"bocom": 4, "beichen": 3, "boc": 2, "putuo": 2},
    "en": {"bocom": 3, "beichen": 2, "boc": 2, "putuo": 1},
}


def build(profile, lang, spec):
    t = T[lang]; zh = lang == "zh"
    spec = dict(spec or {})
    limits = dict(DEFAULT_LIMITS[lang]); limits.update(spec.get("limit_bullets") or {})
    spec["limit_bullets"] = limits
    b = profile["basics"]
    name = b["name_zh"] if zh else b["name_en"]
    contact = " | ".join(x for x in ([b["phone_cn"] + " / " + b["phone_hk"], b["email_hku"] if zh else b["email_163"],
                                     b["location"], ("" if zh else b.get("work_auth_note_en", ""))]) if x)
    parts = ['<!doctype html><html lang="%s"><head><meta charset="utf-8"><style>%s</style></head><body>' % (lang, CSS % {
        "bodyfont": '"STHeiti","Arial Unicode MS","Heiti SC",sans-serif' if zh else 'Helvetica,Arial,sans-serif',
        "titlefont": '"STHeiti","Arial Unicode MS",sans-serif' if zh else 'Georgia,"Times New Roman",serif',
        "fs": "9.5pt" if zh else "9.0pt", "h1": "20pt" if zh else "19pt", "h2": "10.5pt", "meta": "8.4pt"})]
    parts.append("<h1>%s</h1>" % esc(name))
    if spec.get("headline"): parts.append('<div class="contact" style="margin:-1mm 0 1mm"><b>%s</b></div>' % esc(spec["headline"]))
    parts.append('<div class="contact">%s</div>' % esc(contact))

    for sec in spec.get("sections", ["education", "experience", "projects", "skills"]):
        if sec == "education":
            parts.append("<h2>%s</h2>" % t["education"])
            for e in profile["education"]:
                inst = e["institution_zh"] if zh else e["institution_en"]
                deg = e["degree_zh"] if zh else e["degree_en"]
                parts.append('<div class="entry"><div class="row"><span><span class="org">%s</span> — <span class="role">%s</span></span>'
                             '<span class="date">%s – %s</span></div><ul>%s</ul></div>' % (
                    esc(inst), esc(deg), esc(e["start"]), esc(e["end"]),
                    "".join("<li>%s</li>" % hl(x, spec.get("emphasize"), zh) for x in (e["highlights_zh"] if zh else e["highlights_en"]))))
        elif sec == "experience":
            parts.append("<h2>%s</h2>" % t["experience"])
            order = spec.get("order_exp") or [x["id"] for x in profile["experience"]]
            limits = spec.get("limit_bullets", {})
            for eid in order:
                e = next((x for x in profile["experience"] if x["id"] == eid), None)
                if not e: continue
                comp = e["company_zh"] if zh else e["company_en"]
                role = e["title_zh"] if zh else e["title_en"]
                loc = e["location_zh"] if zh else e["location_en"]
                bullets = (e["bullets_zh"] if zh else e["bullets_en"])
                n = limits.get(eid)
                if n: bullets = bullets[:n]
                parts.append('<div class="entry"><div class="row"><span><span class="org">%s</span> — <span class="role">%s</span></span>'
                             '<span class="date">%s &nbsp;|&nbsp; %s – %s</span></div><ul>%s</ul></div>' % (
                    esc(comp), esc(role), esc(loc), esc(e["start"]), esc(e["end"]),
                    "".join("<li>%s</li>" % hl(x, spec.get("emphasize"), zh) for x in bullets)))
        elif sec == "projects":
            parts.append("<h2>%s</h2>" % t["projects"])
            for p in profile["projects_activities"]:
                nm = p["name_zh"] if zh else p["name_en"]
                dt = ""
                if p.get("start"): dt = "%s – %s" % (p["start"], p.get("end", ""))
                bullets = p.get("bullets_zh" if zh else "bullets_en") or []
                bullets = bullets[:int(spec.get("limit_activity_bullets", 1))] if bullets else bullets
                body = ("<ul>%s</ul>" % "".join("<li>%s</li>" % hl(x, spec.get("emphasize"), zh) for x in bullets)) if bullets else ""
                if not bullets:
                    detail = p.get("detail_zh" if zh else "detail_en", "")
                    body = '<div style="margin-top:.6mm">%s</div>' % esc(detail)
                parts.append('<div class="entry"><div class="row"><span class="org">%s</span><span class="date">%s</span></div>%s</div>' % (esc(nm), esc(dt), body))
        elif sec == "skills":
            parts.append("<h2>%s</h2>" % t["skills"])
            sk = profile["skills"]
            labels = {"office": "Office", "programming": "Programming", "design": "Design"}
            for k in spec.get("skills_order", list(sk.keys())):
                if k in sk: parts.append('<div class="skills-line"><b>%s:</b> %s</div>' % (labels.get(k, k), esc("、".join(sk[k]) if zh else ", ".join(sk[k]))))
            langs = "、".join("%s（%s）" % (l["language"], l["level"]) for l in profile["languages"]) if zh else "; ".join(l["en"] for l in profile["languages"])
            parts.append('<div class="skills-line"><b>%s:</b> %s</div>' % (t["languages"], esc(langs)))
    parts.append("</body></html>")
    return "\n".join(parts)


def to_pdf(html_path, pdf_path):
    cmd = [CHROME, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
           "--print-to-pdf=" + pdf_path, "file://" + os.path.abspath(html_path)]
    subprocess.run(cmd, capture_output=True, check=True)
    return pdf_path


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", required=True)
    ap.add_argument("--lang", choices=["zh", "en"], required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--pdf")
    ap.add_argument("--spec")
    a = ap.parse_args()
    profile = json.load(open(a.profile, encoding="utf-8"))
    spec = json.load(open(a.spec, encoding="utf-8")) if a.spec else {}
    doc = build(profile, a.lang, spec)
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    open(a.out, "w", encoding="utf-8").write(doc)
    print("HTML →", a.out)
    if a.pdf:
        to_pdf(a.out, a.pdf); print("PDF  →", a.pdf)
