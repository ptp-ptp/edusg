import json
import os
import re
import sys

try:
    from pypinyin import Style, pinyin
except ImportError:
    pinyin = None

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tier = (sys.argv[1] if len(sys.argv) > 1 else "p1a").lower()
if tier not in ("p1a", "p1b"):
    raise SystemExit("Usage: python extract_p1_words.py [p1a|p1b]")

grade_code = "P1A" if tier == "p1a" else "P1B"
semester = "Sem 1–2" if tier == "p1a" else "Sem 3–4"
html_name = "P1_words.html" if tier == "p1a" else "P1B_words.html"
script_id = "p1WordsData" if tier == "p1a" else "p1bWordsData"

html_path = os.path.join(root, "Chinese", html_name)
out_dir = os.path.join(root, "src", "data", "chinese")
out_path = os.path.join(out_dir, f"{tier}-words.json")

with open(html_path, encoding="utf-8") as f:
    html = f.read()

match = re.search(
    rf'<script type="application/json" id="{script_id}">([\s\S]*?)</script>',
    html,
)
if not match:
    raise SystemExit(f"Could not find JSON block id={script_id} in {html_path}")

data = json.loads(match.group(1))
data["name"] = f"{grade_code} Words"
data["semester"] = semester

if pinyin:
    for entry in data["words"]:
        chars = entry["word"]
        syllables = pinyin(chars, style=Style.TONE, heteronym=False)
        entry["pinyin"] = " ".join(s[0] for s in syllables)

os.makedirs(out_dir, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Wrote {len(data['words'])} words to {out_path}")
