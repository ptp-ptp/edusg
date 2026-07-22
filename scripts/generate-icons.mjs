import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const iconsDir = path.join(rootDir, "public", "icons");
const svgPath = path.join(iconsDir, "icon.svg");

const sizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "icon-maskable-512.png", size: 512, maskable: true }
];

async function renderIcon(page, svg, size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.1) : 0;
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: ${size}px; height: ${size}px; background: transparent; }
      body { display: grid; place-items: center; }
      img { width: ${size - padding * 2}px; height: ${size - padding * 2}px; display: block; }
    </style>
  </head>
  <body>
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}" alt="" />
  </body>
</html>`;

  await page.setContent(html, { waitUntil: "load" });
  return page.screenshot({
    type: "png",
    omitBackground: false,
    clip: { x: 0, y: 0, width: size, height: size }
  });
}

async function main() {
  await mkdir(iconsDir, { recursive: true });
  const svg = await readFile(svgPath, "utf8");
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage();
    for (const item of sizes) {
      const buffer = await renderIcon(page, svg, item.size, item.maskable);
      await writeFile(path.join(iconsDir, item.name), buffer);
      console.log(`Wrote ${item.name}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
