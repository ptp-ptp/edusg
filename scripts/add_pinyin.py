import json
import os
import re
import sys

from pypinyin import Style, pinyin

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tier = (sys.argv[1] if len(sys.argv) > 1 else "p1a").lower()
if tier not in ("p1a", "p1b"):
    raise SystemExit("Usage: python add_pinyin.py [p1a|p1b]")

json_path = os.path.join(root, "src", "data", "chinese", f"{tier}-words.json")
html_name = "P1_words.html" if tier == "p1a" else "P1B_words.html"
html_path = os.path.join(root, "Chinese", html_name)

with open(json_path, encoding="utf-8") as f:
    data = json.load(f)

for entry in data["words"]:
    chars = entry["word"]
    syllables = pinyin(chars, style=Style.TONE, heteronym=False)
    entry["pinyin"] = " ".join(s[0] for s in syllables)

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(html_path, encoding="utf-8") as f:
    html = f.read()

new_json = json.dumps(data, ensure_ascii=False, indent=2)
html = re.sub(
    r'(<script type="application/json" id="p1WordsData">)([\s\S]*?)(</script>)',
    lambda match: f"{match.group(1)}\n{new_json}\n  {match.group(3)}",
    html,
    count=1,
)

with open(html_path, "w", encoding="utf-8") as f:
    f.write(html)

print(f"Added pinyin to {len(data['words'])} words")
