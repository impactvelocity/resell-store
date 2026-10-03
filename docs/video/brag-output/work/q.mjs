import { readFileSync } from "node:fs";
const [id, maxY = "1000", filter = ""] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(`rects/${id}.json`, "utf8"));
for (const r of rows) if (r.y < +maxY && r.text && r.text.toLowerCase().includes(filter.toLowerCase())) console.log(`${r.x},${r.y} ${r.w}x${r.h} ${r.tag} | ${r.text.slice(0, 70)}`);
