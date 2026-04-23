const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractTextFromFile(file) {
  const filePath = file.path;
  const mimeType = file.mimetype;

  console.log("📄 File received:");
  console.log("MIME:", mimeType);
  console.log("Original name:", file.originalname);

  try {
    // ✅ PDF handling
    if (
      mimeType === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);

      console.log("📊 PDF TEXT LENGTH:", data.text.length);
      console.log("📊 PDF PREVIEW:", data.text.slice(0, 200));

      // ❌ If no readable text
      if (!data.text || data.text.trim().length < 50) {
        throw new Error(
          "This PDF does not contain readable text. It might be scanned (image-based). Please upload a DOCX or a text-based PDF.",
        );
      }

      return data.text;
    }

    // ✅ DOCX handling
    if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.originalname.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ path: filePath });

      console.log("📊 DOCX TEXT LENGTH:", result.value.length);

      return result.value;
    }

    throw new Error("Unsupported file type. Please upload PDF or DOCX.");
  } finally {
    // always delete temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = {
  extractTextFromFile,
};
