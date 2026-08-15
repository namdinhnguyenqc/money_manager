#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node tools/video-pipeline/create-video-plan.mjs <video-config.json>");
  process.exit(1);
}

const config = JSON.parse(await fs.readFile(inputPath, "utf8"));
const errors = [];
const aiMode = config.ai_mode || "local";
const voiceSource = config.voice_source || "own_recording";

if (!config.title || typeof config.title !== "string") errors.push("title is required");
if (!config.brand || typeof config.brand !== "string") errors.push("brand is required");
if (!config.cta || typeof config.cta !== "string") errors.push("cta is required");
if (!["local", "assist", "review"].includes(aiMode)) errors.push("ai_mode must be local, assist or review");
if (!["own_recording", "voice_actor", "tts"].includes(voiceSource)) errors.push("voice_source must be own_recording, voice_actor or tts");
if (!Array.isArray(config.segments) || config.segments.length === 0) {
  errors.push("segments must be a non-empty array");
}
if (!Array.isArray(config.assets) || config.assets.length === 0) {
  errors.push("assets must be a non-empty array");
}

const segments = Array.isArray(config.segments) ? config.segments : [];
const assets = Array.isArray(config.assets) ? config.assets : [];
const totalSeconds = segments.reduce((sum, segment) => {
  if (typeof segment.text !== "string" || !segment.text.trim()) errors.push("each segment needs text");
  if (!Number.isFinite(segment.seconds) || segment.seconds <= 0) errors.push("each segment needs positive seconds");
  return sum + (Number(segment.seconds) || 0);
}, 0);

if (totalSeconds > 60) errors.push("video is longer than 60 seconds; split it into multiple shorts");
if (assets.some((asset) => !asset.path || !asset.kind || !asset.license || asset.license === "unknown")) {
  errors.push("every asset needs path, kind and a non-unknown license");
}

if (errors.length > 0) {
  console.error(JSON.stringify({ valid: false, errors }, null, 2));
  process.exit(1);
}

const outputDir = path.resolve(config.outputDir || path.dirname(inputPath));
await fs.mkdir(outputDir, { recursive: true });

let elapsed = 0;
const timeline = segments.map((segment, index) => {
  const start = Number(elapsed.toFixed(2));
  elapsed += Number(segment.seconds);
  return {
    index,
    start,
    end: Number(elapsed.toFixed(2)),
    text: segment.text.trim(),
    asset: assets[index % assets.length],
  };
});

const plan = {
  schema: "sutu-xanh-video-plan.v1",
  brand: config.brand,
  ai_mode: aiMode,
  voice: { source: voiceSource, path: config.voiceover_path || null },
  title: config.title,
  hook: config.hook || config.title,
  cta: config.cta,
  format: { width: 1080, height: 1920, fps: 30, max_seconds: 60 },
  total_seconds: Number(totalSeconds.toFixed(2)),
  narration: segments.map((segment) => segment.text.trim()).join(" "),
  timeline,
  assets,
  generated_at: new Date().toISOString(),
};

const planPath = path.join(outputDir, "video-plan.json");
const narrationPath = path.join(outputDir, "voiceover.txt");
const socialPath = path.join(outputDir, "social-copy.json");
const previewPath = path.join(outputDir, "preview.html");

await fs.writeFile(planPath, `${JSON.stringify(plan, null, 2)}\n`);
await fs.writeFile(narrationPath, `${plan.narration}\n`);
await fs.writeFile(socialPath, `${JSON.stringify({
  title: config.title,
  caption: `${config.hook || config.title}\n\n${config.cta}`,
  hashtags: config.hashtags || ["#SuTuXanh", "#Chelsea", "#BongDa"],
}, null, 2)}\n`);

const slides = timeline.map((item) => `
  <section class="slide" style="--duration:${item.end - item.start}s;background-image:url('${escapeHtml(item.asset.path)}')">
    <div class="shade"></div>
    <div class="copy"><small>${item.start.toFixed(1)}s–${item.end.toFixed(1)}s</small><h2>${escapeHtml(item.text)}</h2></div>
  </section>`).join("\n");

await fs.writeFile(previewPath, `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><title>${escapeHtml(config.title)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#0b1020;color:#fff;font-family:Inter,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh}.phone{width:min(360px,100vw);height:min(640px,100vh);overflow:hidden;background:#081a46}.slide{height:100%;display:grid;align-items:end;padding:28px;position:relative;background-size:cover;background-position:center;animation:show var(--duration) linear both}.slide:not(:first-child){display:none}.shade{position:absolute;inset:0;background:linear-gradient(transparent 35%,rgba(3,8,24,.9)}.copy{position:relative;z-index:1}.copy small{opacity:.7}.copy h2{font-size:28px;line-height:1.08;margin:10px 0 0}@keyframes show{from{opacity:0}to{opacity:1}}</style>
</head><body><main class="phone">${slides}</main></body></html>\n`);

console.log(JSON.stringify({ valid: true, outputDir, files: [planPath, narrationPath, socialPath, previewPath] }, null, 2));

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
