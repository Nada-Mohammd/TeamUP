const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function cleanJson(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

async function normalizeSkillsWithAI(skills = []) {
  if (!skills.length) return [];

  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `
You normalize technical skills for a student team matching system.

Return ONLY valid JSON.

Your job:
- Convert equivalent skills into one canonical name.
- Match meanings, not only spelling.
- Do not invent unrelated skills.
- Keep names short and professional.
- Use title case where appropriate.

Examples:
"kmeans" -> "K-Means Clustering"
"k-means" -> "K-Means Clustering"
"gui" -> "GUI Development"
"graphical user interface" -> "GUI Development"
"reactjs" -> "React"
"node js" -> "Node.js"
"mongo db" -> "MongoDB"
"data mining" -> "Data Mining"
        `,
      },
      {
        role: "user",
        content: `
Normalize this skills array:

${JSON.stringify(skills)}

Return JSON exactly like this:
{
  "normalized_skills": []
}
        `,
      },
    ],
  });

  const raw = completion.choices[0].message.content;
  const parsed = JSON.parse(cleanJson(raw));

  return parsed.normalized_skills || [];
}

module.exports = {
  normalizeSkillsWithAI,
};
