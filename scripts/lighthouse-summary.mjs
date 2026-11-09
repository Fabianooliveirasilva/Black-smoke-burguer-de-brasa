// Prints the median Lighthouse scores per URL as GitHub annotations (::notice / ::warning),
// readable on the run page and through the public check-runs API, plus a Markdown job summary.
import { appendFileSync, readFileSync } from "node:fs";

const runs = JSON.parse(readFileSync(".lighthouseci/reports/manifest.json", "utf8")).filter((r) => r.isRepresentativeRun);
const targets = { performance: 90, accessibility: 95, "best-practices": 95, seo: 95 };
let md = "| Página | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |\n|---|---|---|---|---|---|---|---|\n";
for (const r of runs) {
  const lhr = JSON.parse(readFileSync(r.jsonPath, "utf8"));
  const path = new URL(r.url).pathname;
  const s = Object.fromEntries(Object.keys(targets).map((k) => [k, Math.round(r.summary[k] * 100)]));
  const a = lhr.audits;
  const lcp = a["largest-contentful-paint"].displayValue, cls = a["cumulative-layout-shift"].displayValue, tbt = a["total-blocking-time"].displayValue;
  const below = Object.entries(targets).filter(([k, t]) => s[k] < t).map(([k]) => k);
  const line = `${path} — perf ${s.performance} · a11y ${s.accessibility} · bp ${s["best-practices"]} · seo ${s.seo} · LCP ${lcp} · CLS ${cls} · TBT ${tbt}`;
  console.log(`::${below.length ? "warning" : "notice"} title=Lighthouse ${path}::${line}${below.length ? ` (abaixo da meta: ${below.join(", ")})` : ""}`);
  md += `| \`${path}\` | ${s.performance} | ${s.accessibility} | ${s["best-practices"]} | ${s.seo} | ${lcp} | ${cls} | ${tbt} |\n`;
}
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Lighthouse (mobile, mediana de 3)\n\n${md}`);
console.log(md);
