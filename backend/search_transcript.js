import fs from "fs";
import readline from "readline";

async function search() {
  const fileStream = fs.createReadStream("C:/Users/PC/.gemini/antigravity/brain/db221dc3-23fd-4fb9-a523-76fc6ceccce5/.system_generated/logs/transcript.jsonl");

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes("namdinhnguyen") || line.includes("xóa") || line.includes("xoa")) {
      const obj = JSON.parse(line);
      if (obj.type === "USER_INPUT") {
        console.log(`Step ${obj.step_index}: ${obj.content}`);
      }
    }
  }
}

search();
