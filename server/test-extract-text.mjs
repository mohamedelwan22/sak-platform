import fs from "node:fs/promises";
import pdfParse from "pdf-parse";

async function main() {
  const files = (await fs.readdir("uploads/certificates")).filter(
    (f) => f.startsWith("test-") && f.endsWith(".pdf"),
  );

  for (const file of files) {
    const buf = await fs.readFile(`uploads/certificates/${file}`);
    try {
      const data = await pdfParse(buf);
      console.log(`\n=== ${file} (${buf.length} bytes) ===`);
      console.log("Pages:", data.numpages);
      console.log("Text:", JSON.stringify(data.text.substring(0, 500)));
    } catch (e) {
      console.log(`\n=== ${file} (${buf.length} bytes) ===`);
      console.log("PARSE ERROR:", e.message);
    }
  }
}

main().catch((e) => console.error(e));
