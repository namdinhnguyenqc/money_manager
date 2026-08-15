#!/usr/bin/env node

import fs from "node:fs/promises";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node tools/content-pipeline/generate-prompt.mjs <source-item.json>");
  process.exit(1);
}

const item = JSON.parse(await fs.readFile(inputPath, "utf8"));
const required = ["title", "url", "source_key", "source_type", "trust_level", "content_type", "facts"];
const missing = required.filter((key) => item[key] === undefined || item[key] === null || item[key] === "");
if (missing.length > 0) {
  console.error(`Missing fields: ${missing.join(", ")}`);
  process.exit(1);
}
if (!Array.isArray(item.facts) || item.facts.length === 0) {
  console.error("facts must be a non-empty array");
  process.exit(1);
}

const certainty = item.trust_level >= 3 && item.source_type === "official"
  ? "confirmed"
  : item.trust_level === 2
    ? "reported"
    : "rumor";

const prompt = `Bạn là biên tập viên thể thao của Sư Tử Xanh, một trang fan Chelsea không chính thức.

Viết bản nháp tiếng Việt dựa CHỈ trên dữ kiện trong input. Không bịa quote, số liệu,
chấn thương, thời điểm trở lại hay tình trạng đàm phán. Không sao chép câu chữ từ nguồn.
Nếu là tin chuyển nhượng/chấn thương chưa được CLB xác nhận, phải dùng ngôn ngữ điều kiện
và ghi rõ "chưa xác nhận".

Trả về JSON đúng schema:
{
  "title": string,
  "slug": string,
  "excerpt": string,
  "article_type": "post_match" | "transfer" | "injury" | "academy" | "retro" | "opinion",
  "confidence": "confirmed" | "reported" | "rumor",
  "body_markdown": string,
  "claims": [{ "statement": string, "status": "confirmed" | "reported" | "opinion", "source_url": string }],
  "source_urls": [string],
  "image_brief": string,
  "social_caption": string
}

Quy tắc biên tập:
- 1 tiêu đề rõ, không giật tít sai.
- Body gồm: điều đã biết, bối cảnh Chelsea, nhận xét riêng, điều cần chờ xác nhận.
- Nhận xét phải được gắn nhãn là phân tích, không trình bày như dữ kiện.
- Không dùng logo/ảnh cầu thủ không có quyền sử dụng.
- image_brief chỉ mô tả ảnh tự thiết kế/AI/ảnh đã cấp phép.

Độ tin cậy được suy ra ban đầu: ${certainty}

INPUT:
${JSON.stringify(item, null, 2)}`;

console.log(prompt);
