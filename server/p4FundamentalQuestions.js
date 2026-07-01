import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "p4FundamentalQuestions.json");

export const p4FundamentalMathQuestions = JSON.parse(readFileSync(dataPath, "utf8"));
