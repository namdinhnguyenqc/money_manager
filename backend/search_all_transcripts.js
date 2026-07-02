import fs from "fs";
import path from "path";

const searchDir = "C:/Users/PC/.gemini/antigravity";

function walk(dir) {
  let files = [];
  try {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files = files.concat(walk(fullPath));
      } else {
        files.push(fullPath);
      }
    }
  } catch (err) {}
  return files;
}

async function search() {
  console.log("Searching all files in antigravity folder...");
  const files = walk(searchDir);
  console.log(`Found ${files.length} files. Searching for user ID...`);
  
  for (const file of files) {
    if (file.endsWith(".log") || file.endsWith(".jsonl") || file.endsWith(".json") || file.endsWith(".txt") || file.endsWith(".md")) {
      try {
        const content = fs.readFileSync(file, "utf8");
        if (content.includes("a63f0af3-795a-47f0-b565-5c65a385cb3f")) {
          console.log(`Found match in file: ${file}`);
        }
      } catch (err) {}
    }
  }
  console.log("Search finished.");
}

search();
