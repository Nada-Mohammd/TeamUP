const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractTextFromFile(file) {
  const mimeType = file.mimetype;
  const originalname = file.originalname;

  // Support both local file path and buffer
  const buffer = file.buffer
    ? file.buffer
    : fs.readFileSync(file.path);

  try {
    if (
      mimeType === "application/pdf" ||
      originalname.toLowerCase().endsWith(".pdf")
    ) {
      const data = await pdfParse(buffer);
      if (!data.text || data.text.trim().length < 50) {
        throw new Error("This PDF does not contain readable text.");
      }
      return data.text;
    }

    if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      originalname.toLowerCase().endsWith(".docx")
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    throw new Error("Unsupported file type. Please upload PDF or DOCX.");
  } finally {
    // Only delete if it was a local file
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

module.exports = { extractTextFromFile };