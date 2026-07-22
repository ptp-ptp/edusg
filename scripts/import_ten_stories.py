"""One-off import: convert the ten-stories interactive HTML handout into
src/data/chinese/readings.json seed entries (P1), preserving all five
difficulty levels per story."""
import io
import json

SRC = r"Chinese/HCL/P1/Term 3/ten_chinese_stories_interactive.html"
READINGS = "src/data/chinese/readings.json"
LEVELS = ["Simple", "Medium", "Hard", "Harder", "Advance"]


def convert_token(tok):
    if tok.get("p"):
        return {"t": tok["t"], "p": True}
    return {"t": tok["t"], "py": tok.get("py", ""), "en": tok.get("en", "")}


def main():
    line = [
        l for l in io.open(SRC, encoding="utf-8").read().split("\n")
        if l.startswith("const stories=")
    ][0]
    stories = json.loads(line[len("const stories="):].rstrip(";"))

    data = json.load(io.open(READINGS, encoding="utf-8"))
    p1 = data.setdefault("P1", [])
    existing_ids = {r["id"] for r in p1}

    added = 0
    for story in stories:
        rid = f"p1-story-{story['rank']:02d}"
        if rid in existing_ids:
            continue
        levels = []
        for key in LEVELS:
            v = story["versions"][key]
            levels.append({
                "key": key,
                "description": v.get("description", ""),
                "sentences": [
                    [convert_token(t) for t in s["tokens"]] for s in v["sentences"]
                ],
                "vocabulary": [
                    {"word": x["t"], "pinyin": x.get("py", ""), "english": x.get("en", "")}
                    for x in v.get("vocab", [])
                ],
            })
        p1.append({
            "id": rid,
            "title": story["title"],
            "titleEn": story["english"],
            "subtitle": story["pinyin"],
            "term": "Term 3",
            "levels": levels,
        })
        added += 1

    with io.open(READINGS, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("added", added, "total P1 readings", len(p1))


if __name__ == "__main__":
    main()
