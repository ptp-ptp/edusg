import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "question-assets", "counting-shapes");
mkdirSync(outDir, { recursive: true });

const teal = "#0d9488";
const ink = "#1e293b";
const slate = "#64748b";
const light = "#f1f5f9";
const coral = "#f97316";

function wrap(content, w = 320, h = 240) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  <rect width="100%" height="100%" fill="${light}" rx="8"/>
  ${content}
</svg>`;
}

function triangle(points, fill = "none", stroke = ink, sw = 2) {
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

function line(x1, y1, x2, y2, stroke = ink, sw = 2, dash = "") {
  const d = dash ? ` stroke-dasharray="${dash}"` : "";
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${d}/>`;
}

function text(x, y, t, fill = coral, size = 14) {
  return `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="700" font-family="system-ui,sans-serif" text-anchor="middle">${t}</text>`;
}

function cube(x, y, s = 22) {
  const d = s * 0.35;
  return `<g>
    <polygon points="${x},${y} ${x + s},${y} ${x + s + d},${y - d} ${x + d},${y - d}" fill="#99f6e4" stroke="${ink}" stroke-width="1.5"/>
    <polygon points="${x + s},${y} ${x + s},${y + s} ${x + s + d},${y + s - d} ${x + s + d},${y - d}" fill="#5eead4" stroke="${ink}" stroke-width="1.5"/>
    <polygon points="${x},${y + s} ${x + s},${y + s} ${x + s + d},${y + s - d} ${x + d},${y + s - d}" fill="${teal}" stroke="${ink}" stroke-width="1.5"/>
  </g>`;
}

const svgs = {
  "lesson-sam.svg": wrap(`
    ${triangle("160,40 60,200 260,200")}
    ${line(160, 40, 110, 200)}
    ${line(160, 40, 160, 200)}
    ${line(160, 40, 210, 200)}
    ${line(80, 130, 240, 130, slate, 1.5, "4 3")}
    ${text(95, 125, "S")}
    ${text(160, 125, "M")}
    ${text(225, 125, "L")}
    ${text(160, 225, "SAM: Small → Medium → Large", slate, 11)}
  `),
  "lesson-vertex.svg": wrap(`
    ${triangle("160,35 55,205 265,205")}
    ${line(160, 35, 95, 205)}
    ${line(160, 35, 160, 205)}
    ${line(160, 35, 225, 205)}
    ${text(125, 215, "1")}
    ${text(160, 215, "2")}
    ${text(195, 215, "3")}
    ${text(160, 25, "1+2+3 = 6", coral)}
  `),
  "lesson-diagonal.svg": wrap(`
    <rect x="80" y="50" width="160" height="160" fill="none" stroke="${ink}" stroke-width="2.5"/>
    ${line(80, 50, 240, 210)}
    ${line(240, 50, 80, 210)}
    ${text(160, 135, "×2", coral, 18)}
  `),
  "lesson-nested.svg": wrap(`
    <rect x="60" y="45" width="200" height="200" fill="none" stroke="${ink}" stroke-width="2.5"/>
    <rect x="105" y="90" width="110" height="110" fill="none" stroke="${teal}" stroke-width="2.5"/>
    ${line(60, 45, 240, 245)}
    ${line(240, 45, 60, 245)}
    ${line(105, 90, 215, 200)}
    ${line(215, 90, 105, 200)}
    ${text(70, 40, "outer", slate, 11)}
    ${text(110, 85, "inner", teal, 11)}
  `),
  "lesson-3d.svg": wrap(`
    ${[0, 1, 2].map((c) => [0, 1].map((r) => cube(70 + c * 28 + r * 10, 140 - r * 14))).flat().join("")}
    ${[0, 1, 2].map((c) => [0, 1].map((r) => cube(70 + c * 28 + r * 10, 100 - r * 14))).flat().join("")}
    ${text(160, 220, "6 per layer × 2 layers = 12", slate, 11)}
  `, 320, 260),
  "try-01.svg": wrap(`
    ${triangle("160,40 60,200 260,200")}
    ${line(160, 40, 110, 200)}
    ${line(160, 40, 160, 200)}
    ${line(160, 40, 210, 200)}
  `),
  "try-02.svg": wrap(`
    ${triangle("160,35 50,205 270,205")}
    ${line(160, 35, 80, 205)}
    ${line(160, 35, 120, 205)}
    ${line(160, 35, 200, 205)}
    ${line(160, 35, 240, 205)}
  `),
  "try-03.svg": wrap(`
    <rect x="80" y="50" width="160" height="160" fill="none" stroke="${ink}" stroke-width="2.5"/>
    ${line(80, 50, 240, 210)}
    ${line(240, 50, 80, 210)}
  `),
  "try-04.svg": wrap(`
    ${[0, 1, 2].map((c) => [0, 1].map((r) => cube(70 + c * 28 + r * 10, 140 - r * 14))).flat().join("")}
    ${[0, 1, 2].map((c) => [0, 1].map((r) => cube(70 + c * 28 + r * 10, 100 - r * 14))).flat().join("")}
  `, 320, 260),
  "q-01.svg": wrap(`
    ${triangle("160,45 70,195 250,195")}
    ${line(160, 45, 120, 195)}
    ${line(160, 45, 200, 195)}
  `),
  "q-02.svg": wrap(`
    <rect x="90" y="55" width="140" height="140" fill="none" stroke="${ink}" stroke-width="2.5"/>
    ${line(90, 55, 230, 195)}
  `),
  "q-03.svg": wrap(`
    ${triangle("160,35 50,205 270,205")}
    ${line(160, 35, 80, 205)}
    ${line(160, 35, 120, 205)}
    ${line(160, 35, 200, 205)}
    ${line(160, 35, 240, 205)}
  `),
  "q-04.svg": wrap(`
    <rect x="70" y="60" width="180" height="120" fill="none" stroke="${ink}" stroke-width="2.5"/>
    ${line(70, 60, 250, 180)}
    ${line(250, 60, 70, 180)}
  `),
  "q-05.svg": wrap(`
    ${triangle("160,30 50,210 270,210")}
    ${line(160, 30, 90, 210)}
    ${line(160, 30, 130, 210)}
    ${line(160, 30, 190, 210)}
    ${line(160, 30, 230, 210)}
    ${line(75, 140, 245, 140)}
    ${line(100, 95, 220, 95)}
  `, 320, 260),
  "q-06.svg": wrap(`
    ${triangle("160,30 50,210 270,210")}
    ${triangle("160,80 100,180 220,180", "none", teal)}
    ${line(100, 180, 220, 180, teal)}
  `),
  "q-07.svg": wrap(`
    <rect x="50" y="40" width="220" height="220" fill="none" stroke="${ink}" stroke-width="2"/>
    <rect x="100" y="90" width="120" height="120" fill="none" stroke="${teal}" stroke-width="2"/>
    ${line(50, 40, 270, 260)}
    ${line(270, 40, 50, 260)}
    ${line(100, 90, 220, 210)}
    ${line(220, 90, 100, 210)}
  `, 320, 280),
  "q-08.svg": wrap(`
    <rect x="80" y="60" width="80" height="80" fill="none" stroke="${ink}" stroke-width="2"/>
    <rect x="160" y="60" width="80" height="80" fill="none" stroke="${ink}" stroke-width="2"/>
    <rect x="80" y="140" width="80" height="80" fill="none" stroke="${ink}" stroke-width="2"/>
    <rect x="160" y="140" width="80" height="80" fill="none" stroke="${ink}" stroke-width="2"/>
    <rect x="80" y="60" width="160" height="160" fill="none" stroke="${teal}" stroke-width="2" stroke-dasharray="6 4"/>
  `),
  "q-09.svg": wrap(`
    ${[0, 1, 2].map((c) => `<rect x="${80 + c * 55}" y="70" width="50" height="50" fill="none" stroke="${ink}" stroke-width="2"/>`).join("")}
    ${[0, 1].map((r) => `<rect x="80" y="${70 + r * 55}" width="160" height="50" fill="none" stroke="${ink}" stroke-width="2"/>`).join("")}
  `),
  "q-10.svg": wrap(`
    ${[0, 1, 2].map((c) => [0, 1].map((r) => cube(70 + c * 28 + r * 10, 140 - r * 14))).flat().join("")}
    ${[0, 1, 2].map((c) => [0, 1].map((r) => cube(70 + c * 28 + r * 10, 100 - r * 14))).flat().join("")}
  `, 320, 260),
  "q-11.svg": wrap(`
    ${cube(90, 150, 24)}
    ${cube(114, 150, 24)}
    ${cube(138, 150, 24)}
    ${cube(114, 126, 24)}
    ${cube(138, 126, 24)}
    ${cube(138, 102, 24)}
    ${cube(102, 138, 24)}
    ${cube(126, 138, 24)}
    ${cube(150, 138, 24)}
    ${text(160, 220, "Include hidden cubes!", slate, 11)}
  `, 320, 260),
  "q-12.svg": wrap(`
    ${triangle("160,30 50,210 270,210")}
    ${line(160, 30, 90, 210)}
    ${line(160, 30, 130, 210)}
    ${line(160, 30, 190, 210)}
    ${line(160, 30, 230, 210)}
    ${line(75, 140, 245, 140)}
  `, 320, 260)
};

for (const [name, svg] of Object.entries(svgs)) {
  writeFileSync(path.join(outDir, name), svg.trim() + "\n", "utf8");
}

console.log(`Wrote ${Object.keys(svgs).length} SVGs to ${outDir}`);
