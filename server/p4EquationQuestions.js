import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, "..", "data", "p4EquationQuestions.json");

export const p4EquationQuestions = JSON.parse(readFileSync(dataPath, "utf8"));
