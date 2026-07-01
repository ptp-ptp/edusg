import json
import os

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json_path = os.path.join(root, "src", "data", "chinese", "p1-words.json")
groups_path = os.path.join(root, "src", "data", "chinese", "p1-practice-groups.json")

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
    "colours": "白",
    "family": "人爸妈父母哥弟姐妹爷儿女你我也他她老师徒",
    "body": "耳牙口目舌手足心头身体男",
    "animals": "鱼马羊鸟牛虫贝象",
    "nature": "水火山河雨云风雷电天地月日阳石土木禾米草花叶竹田苗瓜果",
    "school": "书字笔画尺",
    "objects": "衣刀网包伞车门床玩具井厂",
    "actions": "吃看见问说话走跑飞来去开关哭笑站立",
    "places": "家出在里上下",
    "opposites": "大小多少长广好坏对古今正反有无没",
    "time": "早午今",
    "grammar": (
        "的了吗也不什么可以以和合气是只把句个支条粒朵片点华文们又巴己它自"
        "太安半奶玩具可去吗几"
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

LESSON_SUBGROUPS = [
    {"id": "lesson-1", "lesson": "第一课", "label": "Lesson 1", "labelZh": "第一课", "emoji": "1️⃣"},
    {"id": "lesson-2", "lesson": "第二课", "label": "Lesson 2", "labelZh": "第二课", "emoji": "2️⃣"},
    {"id": "lesson-3", "lesson": "第三课", "label": "Lesson 3", "labelZh": "第三课", "emoji": "3️⃣"},
    {"id": "lesson-4", "lesson": "第四课", "label": "Lesson 4", "labelZh": "第四课", "emoji": "4️⃣"},
    {"id": "lesson-5", "lesson": "第五课", "label": "Lesson 5", "labelZh": "第五课", "emoji": "5️⃣"},
    {"id": "lesson-6", "lesson": "第六课", "label": "Lesson 6", "labelZh": "第六课", "emoji": "6️⃣"},
    {"id": "lesson-7", "lesson": "第七课", "label": "Lesson 7", "labelZh": "第七课", "emoji": "7️⃣"},
    {"id": "lesson-8", "lesson": "第八课", "label": "Lesson 8", "labelZh": "第八课", "emoji": "8️⃣"},
    {"id": "lesson-9", "lesson": "第九课", "label": "Lesson 9", "labelZh": "第九课", "emoji": "9️⃣"},
    {"id": "lesson-10", "lesson": "第十课", "label": "Lesson 10", "labelZh": "第十课", "emoji": "🔟"},
]

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
lesson_groups = {g["id"]: {**g, "wordKeys": []} for g in LESSON_SUBGROUPS}

for entry in data["words"]:
    key = entry_key(entry)
    theme_groups[entry["group"]]["wordKeys"].append(key)
    lesson_id = next((g["id"] for g in LESSON_SUBGROUPS if g["lesson"] == entry["lesson"]), None)
    if lesson_id:
        lesson_groups[lesson_id]["wordKeys"].append(key)

thematic = [theme_groups[g["id"]] for g in GROUP_META if theme_groups[g["id"]]["wordKeys"]]
lesson_list = [lesson_groups[g["id"]] for g in LESSON_SUBGROUPS if lesson_groups[g["id"]]["wordKeys"]]

output = {
    "grade": "P1",
    "practiceModes": [
        {"id": "all", "label": "All To Learn", "hint": "Every word not yet remembered"},
        {"id": "group", "label": "By Group", "hint": "Pick a theme or lesson"}
    ],
    "themeGroups": thematic,
    "lessonGroups": lesson_list
}

with open(json_path, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

with open(groups_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

for g in thematic:
    print(f"{g['id']}: {len(g['wordKeys'])}")
