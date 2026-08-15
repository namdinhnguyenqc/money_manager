#!/usr/bin/env node

import fs from "node:fs/promises";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node tools/content-pipeline/validate-draft.mjs <draft.json>");
  process.exit(1);
}

const draft = JSON.parse(await fs.readFile(inputPath, "utf8"));
const errors = [];
const allowedTypes = new Set(["post_match", "transfer", "injury", "academy", "retro", "opinion"]);
const allowedConfidence = new Set(["confirmed", "reported", "rumor"]);
const allowedClaimStatus = new Set(["confirmed", "reported", "opinion"]);

if (typeof draft.title !== "string" || draft.title.trim().length < 20 || draft.title.length > 140) {
  errors.push("title must be between 20 and 140 characters");
}
if (typeof draft.slug !== "string" || !/^[a-z0-9-]+$/.test(draft.slug)) {
  errors.push("slug must contain only lowercase letters, numbers and hyphens");
}
if (!allowedTypes.has(draft.article_type)) errors.push("invalid article_type");
if (!allowedConfidence.has(draft.confidence)) errors.push("invalid confidence");
if (typeof draft.body_markdown !== "string" || draft.body_markdown.trim().length < 200) {
  errors.push("body_markdown must contain at least 200 characters");
}
if (!Array.isArray(draft.source_urls) || draft.source_urls.length === 0) {
  errors.push("source_urls must contain at least one URL");
} else if (draft.source_urls.some((url) => typeof url !== "string" || !/^https:\/\//.test(url))) {
  errors.push("source_urls must contain HTTPS URLs");
}
if (!Array.isArray(draft.claims) || draft.claims.length === 0) {
  errors.push("claims must contain at least one claim");
} else {
  for (const [index, claim] of draft.claims.entries()) {
    if (!claim || typeof claim.statement !== "string" || !claim.statement.trim()) {
      errors.push(`claims[${index}].statement is required`);
    }
    if (!allowedClaimStatus.has(claim.status)) errors.push(`claims[${index}].status is invalid`);
    if (typeof claim.source_url !== "string" || !/^https:\/\//.test(claim.source_url)) {
      errors.push(`claims[${index}].source_url must be HTTPS`);
    }
  }
}
if (draft.confidence === "rumor" && /đã xác nhận|chính thức/i.test(`${draft.title}\n${draft.body_markdown}`)) {
  errors.push("rumor draft must not say it is confirmed");
}

if (errors.length > 0) {
  console.error(JSON.stringify({ valid: false, errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ valid: true, message: "Draft passed editorial safety checks" }, null, 2));
