#!/usr/bin/env node
// Regenerates docs/04-api-contract/endpoints-map.md from the backend source.
// Usage: node tools/gen-endpoints-map.mjs
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const srcDir = path.join(root, "backend/src");
const index = readFileSync(path.join(srcDir, "index.ts"), "utf8");

// variable name -> route file, from `import x from "./routes/x.js"` and `import { a, b } from ...`
const varToFile = new Map();
for (const m of index.matchAll(/import\s+(\w+)\s+from\s+"\.\/routes\/([\w.-]+)\.js"/g)) varToFile.set(m[1], m[2]);
for (const m of index.matchAll(/import\s+\{([^}]+)\}\s+from\s+"\.\/routes\/([\w.-]+)\.js"/g)) {
  for (const name of m[1].split(",").map((s) => s.trim()).filter(Boolean)) varToFile.set(name, m[2]);
}

const mounts = [...index.matchAll(/app\.route\("([^"]*)",\s*(\w+)\)/g)].map((m) => ({ prefix: m[1], variable: m[2] }));

const rows = [];
for (const { prefix, variable } of mounts) {
  const file = varToFile.get(variable);
  if (!file) continue;
  const source = readFileSync(path.join(srcDir, "routes", `${file}.ts`), "utf8");
  const pattern = new RegExp(`${variable}\\.(get|post|put|patch|delete)\\(\\s*"([^"]*)"`, "g");
  for (const m of source.matchAll(pattern)) {
    const sub = m[2] === "/" ? "" : m[2];
    rows.push({ method: m[1].toUpperCase(), path: `${prefix}${sub}` || "/", file: `routes/${file}.ts` });
  }
}

const groups = new Map();
for (const row of rows) {
  const key = row.file;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

let out = `# Danh sách endpoint

Sinh tự động từ \`backend/src\` bằng \`node tools/gen-endpoints-map.mjs\`. Đừng sửa tay; chạy lại script sau khi thêm hoặc đổi route.

Tổng cộng ${rows.length} endpoint. Quy tắc lỗi và header chung: [api-governance.md](api-governance.md).
`;
for (const [file, list] of [...groups.entries()].sort()) {
  out += `\n## \`${file}\`\n\n| Method | Đường dẫn |\n|---|---|\n`;
  for (const row of list) out += `| \`${row.method}\` | \`${row.path}\` |\n`;
}

writeFileSync(path.join(root, "docs/04-api-contract/endpoints-map.md"), out);
console.log(`Wrote ${rows.length} endpoints from ${groups.size} route files.`);
