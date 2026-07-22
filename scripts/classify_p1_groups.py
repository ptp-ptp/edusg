import json
import os
import sys

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tier = (sys.argv[1] if len(sys.argv) > 1 else "p1a").lower()
if tier not in ("p1a", "p1b"):
    raise SystemExit("Usage: python classify_p1_groups.py [p1a|p1b]")

grade_code = "P1A" if tier == "p1a" else "P1B"
semester = "Sem 1–2" if tier == "p1a" else "Sem 3–4"
json_path = os.path.join(root, "src", "data", "chinese", f"{tier}-words.json")
groups_path = os.path.join(root, "src", "data", "chinese", f"{tier}-practice-groups.json")

# Character -> group (first matching group in PRIORITY wins)
GROUP_PRIORITY = [
    "numbers",
    "colours",
    "family",
    "body",
    "animals",
    "nature",
    "school",
    "objects",
    "actions",
    "places",
    "opposites",
    "time",
    "grammar",
]

CHAR_TO_GROUP = {
    "numbers": "一二三四五六七八九十两",
    "colours": "白红黑",
    "family": "人爸妈父母哥弟姐妹爷儿女你我也他她老师徒友朋叔姨兄孩童",
    "body": "耳牙口目舌手足心头身体男脸睛爪尾",
    "animals": "鱼马羊鸟牛虫贝象鸡鸭狗猫兔虎狮",
    "nature": "水火山河雨云风雷电天地月日阳石土木禾米草花叶竹田苗瓜果",
    "school": "书字笔画尺学校课写业习",
    "objects": "衣刀网包伞车门床玩具井厂桌椅球图笔",
    "actions": "吃看见问说话走跑飞来去开关哭笑站立洗刷抹放冲穿扫打听唱玩拍",
    "places": "家出在里上下园场店房",
    "opposites": "大小多少长短广好坏对古今正反有无没苦甜臭干湿轻重急弯圆尖短",
    "time": "早午今昨晚明周末期",
    "grammar": (
        "的了吗也不什么可以以和合气是只把句个支条粒朵片点华文们又巴己它自"
        "太安半奶玩具可去吗几同学前友坐高发起回末元饿饱喜欢用要请很泡变谢"
        "这双那件服被还色都动作快收拾做事做甘买串选最抱拿办法切啊完账进净谁"
        "声庆祝节爱国乐台讲故每因为给再认话组屋公校场商梯扶常步伙伴游兴戏"
        "甲丁间边直周鸡饭鸭饼干采歌青菜汤香巾脸凉到先皮尺己好苦臭重生重喝汁"
        "斤它办看户阿会写业账进净谁打听声昨星明爱给乐课台讲故每童因为兔短眼"
        "睛尖物虎狮期带黑站叫认再孩组公校场商店梯扶常球步图习伙伴游拍兴戏"
    ),
}

GROUP_META = [
    {"id": "numbers", "label": "Numbers", "labelZh": "数字", "emoji": "🔢", "hint": "一 to 十 and counting"},
    {"id": "colours", "label": "Colours", "labelZh": "颜色", "emoji": "🎨", "hint": "Colours and shades"},
    {"id": "family", "label": "Family & People", "labelZh": "家人", "emoji": "👨‍👩‍👧", "hint": "Family, pronouns and people"},
    {"id": "body", "label": "Body", "labelZh": "身体", "emoji": "🧒", "hint": "Body parts and senses"},
    {"id": "animals", "label": "Animals", "labelZh": "动物", "emoji": "🐟", "hint": "Animals and creatures"},
    {"id": "nature", "label": "Nature", "labelZh": "大自然", "emoji": "🌿", "hint": "Weather, plants and land"},
    {"id": "school", "label": "School & Reading", "labelZh": "学校", "emoji": "📚", "hint": "Books, writing and school"},
    {"id": "objects", "label": "Objects", "labelZh": "物品", "emoji": "🎒", "hint": "Things around us"},
    {"id": "actions", "label": "Actions", "labelZh": "动作", "emoji": "🏃", "hint": "Verbs and movement"},
    {"id": "places", "label": "Places", "labelZh": "地方", "emoji": "🏠", "hint": "Home and positions"},
    {"id": "opposites", "label": "Opposites", "labelZh": "反义词", "emoji": "↔️", "hint": "Big/small, good/bad and more"},
    {"id": "time", "label": "Time", "labelZh": "时间", "emoji": "⏰", "hint": "Morning, noon and today"},
    {"id": "grammar", "label": "Words & Grammar", "labelZh": "词语", "emoji": "💬", "hint": "Particles and measure words"},
]

LESSON_EMOJI = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟", "1️⃣1️⃣", "1️⃣2️⃣", "1️⃣3️⃣", "1️⃣4️⃣", "1️⃣5️⃣", "1️⃣6️⃣", "1️⃣7️⃣", "1️⃣8️⃣", "1️⃣9️⃣", "2️⃣0️⃣"]


def build_lesson_subgroups(words):
    seen = []
    for entry in words:
        lesson = entry["lesson"]
        if lesson not in seen:
            seen.append(lesson)

    subgroups = []
    for index, lesson in enumerate(seen, start=1):
        emoji = LESSON_EMOJI[index - 1] if index - 1 < len(LESSON_EMOJI) else "📘"
        subgroups.append(
            {
                "id": f"lesson-{index}",
                "lesson": lesson,
                "label": f"Lesson {index}",
                "labelZh": lesson,
                "emoji": emoji,
            }
        )
    return subgroups

CHAR_SETS = {gid: set(chars) for gid, chars in CHAR_TO_GROUP.items()}


def classify_char(char: str) -> str:
    for group_id in GROUP_PRIORITY:
        if char in CHAR_SETS.get(group_id, set()):
            return group_id
    return "grammar"


def entry_key(entry: dict) -> str:
    return f"{entry['lesson']}|{entry['word']}|{entry['type']}"


with open(json_path, encoding="utf-8") as f:
    data = json.load(f)

for entry in data["words"]:
    chars = list(entry["word"])
    if len(chars) == 1:
        entry["group"] = classify_char(chars[0])
    else:
        entry["group"] = classify_char(chars[0])

theme_groups = {g["id"]: {**g, "wordKeys": []} for g in GROUP_META}
lesson_subgroups = build_lesson_subgroups(data["words"])
lesson_groups = {g["id"]: {**g, "wordKeys": []} for g in lesson_subgroups}

for entry in data["words"]:
    key = entry_key(entry)
    theme_groups[entry["group"]]["wordKeys"].append(key)
    lesson_id = next((g["id"] for g in lesson_subgroups if g["lesson"] == entry["lesson"]), None)
    if lesson_id:
        lesson_groups[lesson_id]["wordKeys"].append(key)

thematic = [theme_groups[g["id"]] for g in GROUP_META if theme_groups[g["id"]]["wordKeys"]]
lesson_list = [lesson_groups[g["id"]] for g in lesson_subgroups if lesson_groups[g["id"]]["wordKeys"]]

output = {
    "grade": grade_code,
    "semester": semester,
    "themeGroups": thematic,
    "lessonGroups": lesson_list
}

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(groups_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

for g in thematic:
    print(f"{g['id']}: {len(g['wordKeys'])}")
print(f"lessons: {len(lesson_list)}")
print(f"words: {len(data['words'])}")
