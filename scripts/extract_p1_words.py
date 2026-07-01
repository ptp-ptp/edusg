import json
import os
import re

try:
    from pypinyin import Style, pinyin
except ImportError:
    pinyin = None

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html_path = os.path.join(root, "Chinese", "P1_words.html")
out_dir = os.path.join(root, "src", "data", "chinese")
out_path = os.path.join(out_dir, "p1-words.json")

with open(html_path, encoding="utf-8") as f:
    html = f.read()

match = re.search(
    r'<script type="application/json" id="p1WordsData">([\s\S]*?)</script>',
    html,
)
data = json.loads(match.group(1))

if pinyin:
    for entry in data["words"]:
        chars = entry["word"]
        syllables = pinyin(chars, style=Style.TONE, heteronym=False)
        entry["pinyin"] = " ".join(s[0] for s in syllables)

os.makedirs(out_dir, exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Extracted {len(data['words'])} words to {out_path}")
