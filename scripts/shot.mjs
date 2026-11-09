// Dev helper: full-page screenshots for visual review. Usage: node scripts/shot.mjs <url> <out.jpg> [width] [height] [fullPage]
import { chromium } from "@playwright/test";
const [url, out, w = "1440", h = "900", full = "true"] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, reducedMotion: "reduce" });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); } window.scrollTo(0, 0); });
await page.waitForTimeout(600);
await page.screenshot({ path: out, fullPage: full === "true", type: "jpeg", quality: 55 });
if (errors.length) console.log("ERRORS:\n" + errors.join("\n"));
await browser.close();
