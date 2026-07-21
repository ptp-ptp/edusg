/**
 * Build a compact offline Chinese→English dictionary (≤3 characters)
 * from CC-CEDICT for the Dictionary draw-to-lookup feature.
 *
 * Usage:
 *   node scripts/build-chinese-dictionary.mjs
 *
 * Downloads CC-CEDICT if scripts/data/cedict_ts.u8 is missing.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dataDir = path.join(__dirname, "data");
const cedictPath = path.join(dataDir, "cedict_ts.u8");
const outPath = path.join(root, "public", "chinese", "dictionary", "cedict-lite.json");

const CEDICT_URL = "https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz";
const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/\s*$/;
const HAN_RE = /^[\u4e00-\u9fff]{1,3}$/;

const TONE_MAP = {
  a: "āáǎàa",
  e: "ēéěèe",
  i: "īíǐìi",
  o: "ōóǒòo",
  u: "ūúǔùu",
  v: "ǖǘǚǜü",
  ü: "ǖǘǚǜü"
};

function numberedToToneMarks(pinyin) {
  return String(pinyin || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((syllable) => {
      const match = syllable.match(/^([a-zA-ZüÜ:]+)([1-5])$/);
      if (!match) return syllable.replace(/u:/g, "ü").replace(/U:/g, "Ü");
      let base = match[1].replace(/u:/g, "ü").replace(/U:/g, "Ü");
      const tone = Number(match[2]);
      if (tone === 5) return base;

      const lower = base.toLowerCase();
      let targetIndex = -1;
      if (lower.includes("a")) targetIndex = lower.indexOf("a");
      else if (lower.includes("e")) targetIndex = lower.indexOf("e");
      else if (lower.includes("ou")) targetIndex = lower.indexOf("o");
      else {
        for (let i = lower.length - 1; i >= 0; i -= 1) {
          if ("aeiouü".includes(lower[i])) {
            targetIndex = i;
            break;
          }
        }
      }
      if (targetIndex < 0) return base;

      const vowel = lower[targetIndex];
      const marked = TONE_MAP[vowel]?.[tone - 1];
      if (!marked) return base;
      const isUpper = base[targetIndex] === base[targetIndex].toUpperCase() && base[targetIndex] !== base[targetIndex].toLowerCase();
      const replacement = isUpper ? marked.toUpperCase() : marked;
      return base.slice(0, targetIndex) + replacement + base.slice(targetIndex + 1);
    })
    .join(" ");
}

async function ensureCedict() {
  if (fs.existsSync(cedictPath) && fs.statSync(cedictPath).size > 1_000_000) {
    console.log("Using existing", cedictPath);
    return;
  }
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("Downloading CC-CEDICT…");
  const response = await fetch(CEDICT_URL);
  if (!response.ok) throw new Error(`Failed to download CEDICT: ${response.status}`);
  const gzipPath = path.join(dataDir, "cedict_1_0_ts_utf-8_mdbg.txt.gz");
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(gzipPath, buffer);
  await pipeline(Readable.from(buffer), createGunzip(), fs.createWriteStream(cedictPath));
  console.log("Saved", cedictPath);
}

function buildDictionary() {
  const dict = Object.create(null);
  let kept = 0;
  let skipped = 0;

  const text = fs.readFileSync(cedictPath, "utf8");
  for (const line of text.split(/\n/)) {
    if (!line || line.startsWith("#")) continue;
    const match = LINE_RE.exec(line);
    if (!match) {
      skipped += 1;
      continue;
    }
    const simp = match[2];
    if (!HAN_RE.test(simp)) {
      skipped += 1;
      continue;
    }
    const pinyin = numberedToToneMarks(match[3]);
    const english = match[4]
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join("; ");
    if (!english) continue;

    if (!dict[simp]) dict[simp] = [];
    // Cap senses per headword to keep file size down
    if (dict[simp].length >= 3) continue;
    // Deduplicate identical sense
    if (dict[simp].some((sense) => sense.p === pinyin && sense.e === english)) continue;
    dict[simp].push({ p: pinyin, e: english });
    kept += 1;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(dict));
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`Wrote ${outPath}`);
  console.log(`Headwords: ${Object.keys(dict).length}, senses: ${kept}, skipped lines: ${skipped}, size: ${sizeMb} MB`);
}

await ensureCedict();
buildDictionary();
