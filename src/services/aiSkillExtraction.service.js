const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function cleanJsonResponse(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
}

async function extractSkillsFromText(text) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: `
You are an AI assistant that extracts technical skills from coursework assignment descriptions.
Return ONLY valid JSON.
Do not add explanation.
        `,
      },
      {
        role: "user",
        content: `
Analyze this coursework assignment and extract the required skills.

Return JSON exactly in this structure:

{
  "required_skills": [],
  "preferred_skills": [],
  "recommended_roles": [],
  "difficulty": "easy | medium | hard | unknown"
}

Rules:
- required_skills = skills clearly needed to complete the assignment.
- preferred_skills = useful but not mandatory skills.
- recommended_roles = suitable team roles.
- Use normalized skill names like "React", "Node.js", "MongoDB", "UI/UX", "Testing".
- Do not invent skills that are not supported by the text.
- Return JSON only.

Coursework text:
${text}
        `,
      },
    ],
  });

  const raw = completion.choices[0].message.content;
  const cleaned = cleanJsonResponse(raw);

  return JSON.parse(cleaned);
}

module.exports = {
  extractSkillsFromText,
};
