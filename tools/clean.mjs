#!/usr/bin/env node
// Removes build output and caches that regenerate on the next build.
//   npm run clean        build outputs and caches, including native builds inside node_modules
//   npm run clean:all    also every node_modules (run `npm install` before working again)
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const removeModules = process.argv.includes("--all");

const buildOutputs = [
  "web-admin/.next",
  "admin-portal/.next",
  "backend/dist",
  "mobile/.expo",
  "tenant-mobile/.expo",
  ...["mobile", "tenant-mobile"].flatMap((app) => [
    `${app}/android/app/build`,
    `${app}/android/app/.cxx`,
    `${app}/android/.gradle`,
    `${app}/android/build`,
  ]),
];

const sizeOf = (target) => {
  let total = 0;
  const walk = (p) => {
    const stat = statSync(p, { throwIfNoEntry: false });
    if (!stat) return;
    if (stat.isDirectory()) for (const entry of readdirSync(p)) walk(path.join(p, entry));
    else total += stat.size;
  };
  walk(target);
  return total;
};

const targets = buildOutputs.map((p) => path.join(root, p));

// Gradle compiles native libraries (reanimated, expo-modules-core, worklets...)
// into node_modules/<pkg>/android/{build,.cxx}; after a few APK builds this
// alone reached several GB. It regenerates on the next Android build.
const moduleDirs = [".", "backend", "web-admin", "admin-portal", "mobile", "tenant-mobile"].map((dir) => path.join(root, dir, "node_modules"));
const findNativeBuilds = (dir, depth = 0) => {
  if (depth > 3 || !existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name === "android") {
      for (const sub of ["build", ".cxx", ".gradle"]) {
        if (existsSync(path.join(full, sub))) targets.push(path.join(full, sub));
      }
      continue;
    }
    // node_modules/<pkg> and node_modules/@scope/<pkg>
    if (depth === 0 || (depth === 1 && path.basename(dir).startsWith("@"))) findNativeBuilds(full, depth + 1);
  }
};
if (!removeModules) moduleDirs.forEach((dir) => findNativeBuilds(dir));

if (removeModules) {
  targets.push(...moduleDirs);
}

let freed = 0;
for (const target of targets) {
  if (!existsSync(target)) continue;
  freed += sizeOf(target);
  rmSync(target, { recursive: true, force: true });
  console.log(`removed ${path.relative(root, target)}`);
}
console.log(`Freed ${(freed / 1024 / 1024).toFixed(0)} MB.`);
if (removeModules) console.log("Run `npm install` (and `npm --prefix admin-portal install` / `npm --prefix tenant-mobile install` if needed) before working again.");
