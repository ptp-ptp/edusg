import json
import os
import re
import time
import unicodedata

try:
    from pypinyin import Style, pinyin
except ImportError:
    pinyin = None

try:
    from deep_translator import GoogleTranslator
except ImportError:
    GoogleTranslator = None

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
source_path = os.path.join(root, "Chinese", "HCL", "Term 3", "HCL_Chinese_Tuition_Review_Complete_Plus.json")
out_dir = os.path.join(root, "src", "data", "chinese")
words_path = os.path.join(out_dir, "p4-extra-words.json")
groups_path = os.path.join(out_dir, "p4-extra-practice-groups.json")
cache_path = os.path.join(out_dir, "p4-extra-en-cache.json")
chinese_path = os.path.join(out_dir, "p4-chinese-words.json")
higher_path = os.path.join(out_dir, "p4-higher-words.json")

p1a_words_path = os.path.join(out_dir, "p1a-words.json")
p1b_words_path = os.path.join(out_dir, "p1b-words.json")

MANUAL_CHAR_MEANINGS = {
    "见": "see; perceive",
    "义": "justice; righteousness",
    "勇": "brave; courageous",
    "为": "act; do",
    "风": "wind",
    "驰": "gallop; speed",
    "电": "electricity; lightning",
    "掣": "pull back; brake",
    "形": "form; appearance",
    "迹": "trace; track",
    "可": "can; may",
    "疑": "doubt; suspicious",
    "魂": "soul; spirit",
    "飞": "fly",
    "魄": "spirit; vigor",
    "散": "scatter; disperse",
    "拔": "pull out",
    "腿": "leg",
    "就": "then; at once",
    "跑": "run",
    "贼": "thief",
    "头": "head",
    "脑": "brain; mind",
    "目": "eye",
    "转": "turn",
    "睛": "eyeball",
    "触": "touch; violate",
    "犯": "offend; violate",
    "法": "law",
    "律": "law; statute",
    "刀": "knife",
    "相": "mutual; each other",
    "助": "help",
    "擦": "rub; brush",
    "肩": "shoulder",
    "而": "and; thus",
    "过": "pass; cross",
    "失": "lose",
    "复": "again; restore",
    "得": "obtain; get",
    "逃": "escape; flee",
    "之": "of; it",
    "夭": "die young",
    "空": "empty",
    "无": "none; without",
    "人": "person",
    "束": "bind; restrain",
    "手": "hand",
    "擒": "capture",
    "机": "clever; opportunity",
    "智": "wisdom; smart",
    "东": "east",
    "张": "stretch; open",
    "西": "west",
    "望": "look; hope",
    "若": "as if; like",
    "无": "none",
    "事": "matter; affair",
    "神": "god; spirit",
    "知": "know",
    "鬼": "ghost; demon",
    "觉": "feel; sense",
    "蹑": "walk lightly",
    "脚": "foot",
    "花": "flower; complexion",
    "容": "appearance; face",
    "色": "color",
    "惊": "startle; alarm",
    "慌": "panic; flustered",
    "措": "arrange; handle",
    "犹": "still; yet",
    "豫": "hesitate",
    "毫": "hair; tiny bit",
    "不": "not",
    "迟": "late; delay",
    "疑": "doubt",
    "三": "three",
    "步": "step",
    "并": "combine; together",
    "两": "two",
    "九": "nine",
    "牛": "cow",
    "虎": "tiger",
    "力": "strength; force",
    "竖": "stand upright",
    "起": "rise; start",
    "大": "big",
    "拇": "thumb",
    "指": "finger; point",
    "激": "excite; stir",
    "动": "move",
    "万": "ten thousand; very",
    "分": "part; minute",
    "挺": "stand straight; thrust",
    "身": "body",
    "出": "go out; emerge",
    "热": "hot; enthusiastic",
    "心": "heart; mind",
    "乐": "happy; willing",
    "临": "face; approach",
    "惧": "fear",
    "大": "big",
    "惊": "startle",
    "色": "color",
    "余": "surplus; remaining",
    "悸": "palpitate; fear",
    "喜": "happy; joy",
    "出": "go out",
    "望": "look; hope",
    "外": "outside",
    "安": "peace; safe",
    "然": "so; -ly",
    "恙": "illness; harm",
    "公": "public; fair",
    "德": "virtue; morality",
    "孝": "filial piety",
    "顺": "obey; follow",
    "父": "father",
    "母": "mother",
    "尊": "respect; honor",
    "敬": "respect",
    "长": "elder; long",
    "辈": "generation",
    "贴": "post; stick",
    "告": "announce; tell",
    "示": "show; display",
    "牌": "sign; plate",
    "传": "spread; pass",
    "单": "list; sheet",
    "责": "responsibility",
    "任": "duty; bear",
    "撑": "support; hold up",
    "卧": "lie down",
    "伸": "stretch",
    "展": "expand; stretch",
}

MANUAL_ENGLISH = {
    "回家": "go home",
    "墨镜": "sunglasses",
    "打扮": "dress up; get dressed up",
    "挎包": "shoulder bag; crossbody bag",
    "抢匪": "robber; mugger",
    "报警": "call the police; report to the police",
    "捉住": "catch; capture",
    "称赞": "praise; compliment",
    "5W1H1OF": "5W1H1OF (When, Who, Where, What, Result, Opinion, Feeling)",
    "担心": "worrying",
    "开心": "happy",
    "高兴": "glad; happy",
    "感动": "touched; moved",
    "生气": "angry",
    "羞愧": "ashamed",
    "反感": "disgusted; averse",
    "厌恶": "disgust; loathe",
    "惭愧": "ashamed; guilty",
    "危险": "dangerous",
    "残忍": "cruel",
    "洗碗": "wash dishes",
    "洗衣服": "do laundry",
    "打扫卫生": "clean up; do housework",
    "晾衣服": "hang clothes to dry",
    "折衣服": "fold clothes",
    "减轻父母负担": "lighten parents' burden",
    "乐于助人": "helpful; willing to help others",
    "上前阻止": "step forward to stop (someone)",
    "提醒": "remind; warn",
    "由他做起": "start with oneself",
    "以身作则": "lead by example",
    "像他一样": "be like him/her",
    "向他学习": "learn from him/her",
    "没有爱心": "uncaring; lacking compassion",
}

EXCLUDE_SECTION_PREFIXES = (
    "目录",
    "口试考试分类对比",
    "会话答题技巧",
    "朗读短文必备技巧",
    "P4COC 课堂讲义",
    "范文欣赏：《抓抢匪》看图写作提示",
)

# Drop entirely — not student learnable content
REMOVE_WORDS = frozenset(
    {
        "阻止",
        "活动",
        "视频",
        "游戏",
        "美好",
        "《抓抢匪》",
        "5分钟",
        "10分钟",
        "15分钟",
        "C 不太流利",
        "开头一句",
        "经过三句",
        "结尾一句",
        "通过媒体，如电视",
        "A 流利，有感情",
        "B 流利，感情一般",
        "林叔叔去哪里？像往常一样，回家",
        "林叔叔在路上看到了谁？迎面走来一名男子",
        "那名男子长什么样？短发，墨镜，打扮得很时尚",
        "那名男子做了什么？擦肩而过",
        "女士被抢后有什么反应？花容失色，惊慌失措",
        "语言：抢劫了，快抓抢匪啊！",
        "林叔叔听见喊叫声后有什么反应？一个箭步，冲上去",
        "林叔叔有没有抓住抢匪？费了九牛二虎之力，追上，抓住",
        "女士看到抢匪被抓后有什么反应？松了一口气",
        "警察赶到现场之后会做什么？捉拿归案",
    }
)

# Collocations / oral phrases that must be phrases even when ≤3 chars (optional override)
VOCAB_TO_PHRASE = frozenset(
    {
        "关心同学",
        "有公德心",
        "有礼貌",
        "有爱心",
        "孝顺父母",
        "尊敬长辈",
        "没有爱心",
        "没有礼貌",
        "像他一样",
        "向他学习",
        "上前阻止",
        "教育孩子",
        "由我做起",
        "举办讲座",
        "奖励学生",
        "张贴海报",
        "有责任感",
        "发传单",
        "告示牌等",
        "跑步",
        "骑车",
        "俯卧撑",
        "伸展运动",
    }
)

# Full sentences / essay outlines / study instructions
PHRASE_TO_PARAGRAPH = frozenset(
    {
        "学校鼓励学生做个有公德心的好公民，应当做到以下几点：",
        "学校要鼓励学生做个有礼貌的好孩子，应该做到以下几点：",
        "遵守校规，准时到校上课，保持学校环境的清洁和卫生",
        "第三，在社会上，我们要遵守一些基本的公共规则",
        "发现朋友做不对的行为时，会及时提醒",
        "告诉孩子有关的新闻，提醒注意",
        "报纸或广告等教育和灌输国民",
        "第二，举行体育比赛，培养团队精神，增进友谊",
        "第三，邀请著名运动员来演讲，号召大家参与体育活动",
        "第二，在德育课上给学生观看有关义工活动的录像",
        "早睡早起，多喝水，足够休息，三多三少，多做运动",
        "其次，我们也要养成早睡早起的好习惯，有精神，吸收知识",
        "第三，我会建议他做一个时间表，合理安排时间",
        "最后，我们要养成爱运动的习惯",
        "每天读一遍《抓抢匪》，先读慢，再读顺，再读出感情",
        "先背15个好词，再背8个参考词汇，最后背5个默写佳句",
        "好词 → 解释 → 造句 → 佳句 → 看图讲故事 → 完整作文",
        "让孩子用自己的话复述，不必一开始就逐字背",
    }
)

MAX_PHRASE_CJK = 24

EXCLUDE_PHRASE_PATTERNS = [
    re.compile(r"^练习\d+：《"),
    re.compile(r"^会话练习[一二三四五六七八九十\d]+[：:]"),
    re.compile(r"^问题[一二三四五六七八九十\d]+[：:]"),
    re.compile(r"^第[一二三四五六七八九十]+步[：:]"),
    re.compile(r"^[A-Z]\.\s"),
    re.compile(r"^(When|Who|Where|What|Result|Opinion|Feeling)[：:]"),
    re.compile(r"^5W1H1OF$"),
    re.compile(r"^朗读短文必备技巧$"),
    re.compile(r"^可以用[：:]"),
    re.compile(r"^谈谈"),
    re.compile(r"^在这张图片中"),
    re.compile(r"^在图片中，我看到"),
    re.compile(r"^这段录像的主要内容是"),
    re.compile(r"^在录像中，我看到（"),
    re.compile(r"^看了这一幕，我感到"),
    re.compile(r"^我认为……"),
    re.compile(r"^因为……"),
    re.compile(r"^如果是我，……"),
    re.compile(r"^你有什么感受"),
    re.compile(r"^[一二三四五六七八九十]+、"),
    re.compile(r"^P4COC\s"),
    re.compile(r"^Week\s+\d+", re.IGNORECASE),
    re.compile(r"^系列作文"),
]

EXAMPLE_PREFIX_ZH = re.compile(
    r"^(?:事例[一二三四五六七八九十\d]+|例[一二三四五六七八九十\d]+)[：:]\s*"
)
EXAMPLE_PREFIX_EN = re.compile(
    r"^Example\s*\d+\s*[：:]\s*",
    re.IGNORECASE,
)

SECTION_ENGLISH = {
    "目录": "Contents",
    "感受和看法": "Feelings and opinions",
    "口试考试分类对比": "Oral exam format comparison",
    "会话答题技巧：经历类": "Conversation skills: personal experience",
    "会话答题技巧：看法／建议／喜欢／注意类": "Conversation skills: opinions, suggestions, preferences, reminders",
    "犯罪系列：好词佳句表（含英文意思和5个中英例句）": "Crime theme: useful phrases with examples",
}


def normalize_text(value):
    if not value:
        return ""
    text = unicodedata.normalize("NFKC", str(value))
    text = re.split(r"[：:／/|｜]", text, maxsplit=1)[0]
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[，。！？、；;,.!?\"'“”‘’（）()【】\[\]《》…·\-—]", "", text)
    return text.strip()


def is_mostly_english(text):
    if not text:
        return False
    cjk = len(re.findall(r"[\u4e00-\u9fff]", text))
    latin = len(re.findall(r"[A-Za-z]", text))
    return latin > 0 and latin >= cjk


def load_translation_cache():
    if not os.path.isfile(cache_path):
        return {}
    with open(cache_path, encoding="utf-8") as handle:
        return json.load(handle)


def save_translation_cache(cache):
    os.makedirs(out_dir, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as handle:
        json.dump(cache, handle, ensure_ascii=False, indent=2)


def translate_to_english(text, cache, lookup):
    text = (text or "").strip()
    if not text:
        return ""
    if is_mostly_english(text):
        return text
    if text in MANUAL_ENGLISH:
        return MANUAL_ENGLISH[text]
    if text in lookup and is_mostly_english(lookup[text]):
        return lookup[text]
    key = normalize_text(text)
    if key in lookup and is_mostly_english(lookup[key]):
        return lookup[key]
    if text in cache:
        return cache[text]
    if not GoogleTranslator:
        raise SystemExit("Install deep-translator: pip install deep-translator")

    translated = GoogleTranslator(source="zh-CN", target="en").translate(text)
    cache[text] = translated
    time.sleep(0.08)
    return translated


def add_pinyin(entry):
    if pinyin is None or entry.get("pinyin"):
        return
    chars = entry["word"]
    if not chars or len(chars) > 40:
        return
    syllables = pinyin(chars, style=Style.TONE, heteronym=False)
    entry["pinyin"] = " ".join(s[0] for s in syllables)


def pinyin_for_text(text):
    if pinyin is None or not text:
        return ""
    chars = re.findall(r"[\u4e00-\u9fff]", text)
    if not chars:
        return ""
    syllables = pinyin("".join(chars), style=Style.TONE, heteronym=False)
    return " ".join(s[0] for s in syllables)


_char_gloss_cache = None


def build_char_gloss_lookup():
    global _char_gloss_cache
    if _char_gloss_cache is not None:
        return _char_gloss_cache

    lookup = dict(MANUAL_CHAR_MEANINGS)
    for path in (p1a_words_path, p1b_words_path):
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        for entry in data.get("words", []):
            word = (entry.get("word") or "").strip()
            english = (entry.get("english") or "").strip()
            if len(word) == 1 and english and word not in lookup:
                lookup[word] = english

    _char_gloss_cache = lookup
    return lookup


def add_character_breakdown(entry):
    if entry.get("category") != "phrase":
        return
    text = entry.get("word") or ""
    chars = re.findall(r"[\u4e00-\u9fff]", text)
    if not chars:
        return
    gloss_lookup = build_char_gloss_lookup()
    breakdown = []
    for char in chars:
        syllables = pinyin(char, style=Style.TONE, heteronym=False) if pinyin else [[]]
        breakdown.append(
            {
                "char": char,
                "pinyin": syllables[0][0] if syllables and syllables[0] else "",
                "meaning": gloss_lookup.get(char, ""),
            }
        )
    entry["breakdown"] = breakdown


def add_example_pinyin(entry):
    examples = entry.get("examples")
    if not examples:
        return
    for example in examples:
        if example.get("pinyin"):
            continue
        zh = example.get("zh") or ""
        if zh:
            example["pinyin"] = pinyin_for_text(zh)


def lesson_from_section(section):
    if not section:
        return "Extra"
    section = section.strip()
    if section in SECTION_ENGLISH:
        return section
    if len(section) <= 24:
        return section
    if "：" in section:
        return section.split("：", 1)[0]
    return section[:24]


def slugify(value):
    slug = re.sub(r"[^\w\-]+", "-", value, flags=re.UNICODE).strip("-").lower()
    return slug or "group"


def cjk_len(text):
    return len(re.findall(r"[\u4e00-\u9fff]", text or ""))


def section_is_excluded(section):
    section = (section or "").strip()
    for prefix in EXCLUDE_SECTION_PREFIXES:
        if section == prefix or section.startswith(prefix):
            return True
    return False


def should_exclude_phrase(text, section):
    text = (text or "").strip()
    if not text:
        return True
    if section_is_excluded(section):
        return True
    for pattern in EXCLUDE_PHRASE_PATTERNS:
        if pattern.search(text):
            return True
    if "……" in text:
        return True
    if cjk_len(text) > MAX_PHRASE_CJK:
        return True
    return False


def expand_compound_phrase(text):
    text = (text or "").strip()
    if not text or should_exclude_phrase(text, ""):
        return []

    context = ""
    content = text
    colon_match = re.match(r"^(.+?)[：:](.+)$", text)
    if colon_match:
        label, right = colon_match.group(1).strip(), colon_match.group(2).strip()
        if not should_exclude_phrase(f"{label}：", ""):
            context = label
            content = right

    if re.search(r"[／/|、；;]", content):
        parts = re.split(r"[／/|、；;]", content)
    else:
        parts = [content]

    results = []
    for part in parts:
        part = part.strip().rstrip("。")
        if not part:
            continue
        if should_exclude_phrase(part, ""):
            continue
        results.append({"word": part, "chinese_explanation": context})

    return results


def classify_word_entry(word):
    if word.strip() in VOCAB_TO_PHRASE:
        return "phrase", "短语"
    # Single characters and 2–3 character words = vocab; 4+ = phrase (idioms, collocations)
    if cjk_len(word) <= 3:
        return "vocab", "词语"
    return "phrase", "短语"


def should_remove_word(word):
    return (word or "").strip() in REMOVE_WORDS


def apply_category_rules(entry):
    word = entry["word"].strip()
    if entry.get("category") == "paragraph":
        return
    if word in PHRASE_TO_PARAGRAPH:
        entry["category"] = "paragraph"
        entry["type"] = "段落"
        return
    category, entry_type = classify_word_entry(word)
    entry["category"] = category
    entry["type"] = entry_type


def clean_example_prefix(text, lang="zh"):
    text = (text or "").strip()
    if not text:
        return text
    if lang == "en":
        return EXAMPLE_PREFIX_EN.sub("", text).strip()
    return EXAMPLE_PREFIX_ZH.sub("", text).strip()


def load_exclude_set():
    exclude = set()
    for path in (chinese_path, higher_path):
        if not os.path.isfile(path):
            continue
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        for entry in data.get("words", []):
            exclude.add(normalize_text(entry.get("word")))
            exclude.add(normalize_text(entry.get("phrase")))
    exclude.discard("")
    return exclude


def build_english_lookup(data):
    lookup = dict(MANUAL_ENGLISH)

    for item in data.get("phrase_table", []):
        phrase = item.get("phrase", "").strip()
        english = item.get("english", "").strip()
        if phrase and english:
            lookup[phrase] = english
            lookup[normalize_text(phrase)] = english

    for record in data.get("records", []):
        if record.get("kind") != "vocabulary":
            continue
        parsed = parse_vocabulary_text(record.get("text", ""), record.get("section", ""), lookup_only=True)
        phrase = parsed["word"]
        english = parsed.get("english", "")
        if phrase and english and is_mostly_english(english):
            lookup[phrase] = english
            lookup[normalize_text(phrase)] = english

    return lookup


def parse_vocabulary_text(text, section, lookup_only=False):
    phrase = text
    english = ""
    chinese_explanation = ""
    examples = []

    main = text.split("例句1", 1)[0].strip()
    if " / English:" in main:
        left, english_part = main.split(" / English:", 1)
        english = english_part.strip().rstrip("。")
    elif " / English：" in main:
        left, english_part = main.split(" / English：", 1)
        english = english_part.strip().rstrip("。")
    else:
        left = main

    if "：" in left:
        phrase, chinese_explanation = left.split("：", 1)
        phrase = phrase.strip()
        chinese_explanation = chinese_explanation.strip().rstrip("。")
    else:
        phrase = left.strip()

    example_pattern = re.compile(
        r"例句\d+：(.+?) / (.+?)(?= 例句\d+：|$)",
        re.DOTALL,
    )
    for match in example_pattern.finditer(text):
        examples.append({"zh": match.group(1).strip(), "en": match.group(2).strip()})

    result = {
        "lesson": lesson_from_section(section),
        "word": phrase,
        "type": "词语",
        "category": "vocab",
        "english": english,
        "chinese_explanation": chinese_explanation,
        "examples": examples,
        "section": section,
        "group": slugify(lesson_from_section(section)),
    }
    if lookup_only:
        return result
    return result


def build_entry(word, section, category, entry_type, english="", chinese_explanation="", examples=None):
    return {
        "lesson": lesson_from_section(section),
        "word": word,
        "type": entry_type,
        "category": category,
        "english": english,
        "chinese_explanation": chinese_explanation,
        "examples": examples or [],
        "section": section,
        "group": slugify(lesson_from_section(section)),
    }


def resolve_entry_english(entry, cache, lookup):
    proposed = (entry.get("english") or "").strip()
    word = entry["word"].strip()

    if is_mostly_english(proposed):
        entry["english"] = proposed
        return

    if word in lookup and is_mostly_english(lookup[word]):
        entry["english"] = lookup[word]
        return

    key = normalize_text(word)
    if key in lookup and is_mostly_english(lookup[key]):
        entry["english"] = lookup[key]
        return

    if entry.get("category") == "paragraph" and len(word) > 120:
        source = word
    elif "：" in word and not is_mostly_english(proposed):
        source = word
    else:
        source = key or word

    entry["english"] = translate_to_english(source, cache, lookup)


def main():
    with open(source_path, encoding="utf-8") as handle:
        data = json.load(handle)

    lookup = build_english_lookup(data)
    cache = load_translation_cache()
    exclude = load_exclude_set()
    entries = []
    seen = set()

    def append_entry(entry):
        word = entry["word"].strip()
        if should_remove_word(word):
            return
        apply_category_rules(entry)
        key = normalize_text(entry["word"])
        if not key or key in seen:
            return
        if key in exclude:
            return
        seen.add(key)
        resolve_entry_english(entry, cache, lookup)
        if entry.get("category") == "paragraph":
            entry["english"] = clean_example_prefix(entry.get("english", ""), "en")
        add_pinyin(entry)
        add_character_breakdown(entry)
        add_example_pinyin(entry)
        entries.append(entry)

    for item in data.get("phrase_table", []):
        phrase = item["phrase"]
        category, entry_type = classify_word_entry(phrase)
        append_entry(
            build_entry(
                phrase,
                item.get("section") or "犯罪系列",
                category,
                entry_type,
                english=item.get("english", ""),
                chinese_explanation=item.get("chinese_explanation", ""),
                examples=item.get("examples", []),
            )
        )

    for record in data.get("records", []):
        kind = record.get("kind")
        section = record.get("section", "")
        text = record.get("text", "").strip()
        if not text:
            continue

        if kind == "vocabulary":
            append_entry(parse_vocabulary_text(text, section))
        elif kind == "words_phrases":
            if section_is_excluded(section):
                continue
            if should_exclude_phrase(text, section):
                continue
            for part in expand_compound_phrase(text):
                category, entry_type = classify_word_entry(part["word"])
                append_entry(
                    build_entry(
                        part["word"],
                        section,
                        category,
                        entry_type,
                        chinese_explanation=part.get("chinese_explanation", ""),
                    )
                )
        elif kind == "reading":
            cleaned = clean_example_prefix(text, "zh")
            append_entry(build_entry(cleaned, section, "paragraph", "段落"))

    save_translation_cache(cache)

    theme_groups = []
    section_titles = []
    for section in data.get("sections", []):
        title = section.get("title", "").strip()
        if not title:
            continue
        section_titles.append(title)
        word_keys = []
        for entry in entries:
            if entry.get("section") == title or entry.get("lesson") == lesson_from_section(title):
                word_keys.append(f"{entry['lesson']}|{entry['word']}|{entry['type']}")
        if word_keys:
            theme_groups.append(
                {
                    "id": slugify(title),
                    "label": title[:40],
                    "labelZh": title,
                    "emoji": "📘",
                    "hint": title,
                    "wordKeys": word_keys,
                }
            )

    for entry in entries:
        if any(entry["section"] == title for title in section_titles):
            continue
        group_id = entry.get("group") or slugify(entry["lesson"])
        existing = next((group for group in theme_groups if group["id"] == group_id), None)
        key = f"{entry['lesson']}|{entry['word']}|{entry['type']}"
        if existing:
            if key not in existing["wordKeys"]:
                existing["wordKeys"].append(key)
        else:
            theme_groups.append(
                {
                    "id": group_id,
                    "label": entry["lesson"][:40],
                    "labelZh": entry["lesson"],
                    "emoji": "📘",
                    "hint": entry["lesson"],
                    "wordKeys": [key],
                }
            )

    bad = [entry for entry in entries if not is_mostly_english(entry.get("english", ""))]
    if bad:
        print(f"Warning: {len(bad)} entries still lack English meanings")

    os.makedirs(out_dir, exist_ok=True)
    with open(words_path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "name": "P4 Extra Words",
                "grade": "P4-extra",
                "pathway": "extra",
                "source": "Chinese/HCL/Term 3/HCL_Chinese_Tuition_Review_Complete_Plus.json",
                "words": entries,
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )

    with open(groups_path, "w", encoding="utf-8") as handle:
        json.dump(
            {
                "grade": "P4-extra",
                "pathway": "extra",
                "themeGroups": theme_groups,
                "lessonGroups": [],
            },
            handle,
            ensure_ascii=False,
            indent=2,
        )

    counts = {}
    for entry in entries:
        counts[entry["category"]] = counts.get(entry["category"], 0) + 1
    print(f"Wrote {len(entries)} entries to {words_path}")
    print("By category:", counts)
    print(f"Wrote {len(theme_groups)} theme groups to {groups_path}")
    print(f"Translation cache: {len(cache)} entries")


if __name__ == "__main__":
    main()
