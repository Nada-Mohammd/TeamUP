const { HfInference } = require("@huggingface/inference");

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
const MODEL = "sentence-transformers/all-MiniLM-L6-v2";

async function getEmbedding(text) {
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: text,
  });
  return result; // float32 array
}

async function getEmbeddingsBatch(texts = []) {
  if (!texts.length) return [];
  const result = await hf.featureExtraction({
    model: MODEL,
    inputs: texts,
  });
  return result; // array of float32 arrays
}

function cosineSimilarity(vecA, vecB) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot   += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function enrichSkillText(skill) {
  return `programming skill: ${skill}`;
}

async function getSemanticMatchedSkills(
  candidateSkills = [],
  targetSkills = [],
  threshold = 0.55,   
) {
  if (!candidateSkills.length || !targetSkills.length) return [];

  try {
    // Enrich both sides with context
    const enrichedCandidates = candidateSkills.map(enrichSkillText);
    const enrichedTargets    = targetSkills.map(enrichSkillText);

    const allTexts      = [...enrichedCandidates, ...enrichedTargets];
    const allEmbeddings = await getEmbeddingsBatch(allTexts);

    const candidateEmbeddings = allEmbeddings.slice(0, candidateSkills.length);
    const targetEmbeddings    = allEmbeddings.slice(candidateSkills.length);

    const matched = [];

    for (let t = 0; t < targetSkills.length; t++) {
      let bestSim = 0;
      for (let c = 0; c < candidateSkills.length; c++) {
        const sim = cosineSimilarity(candidateEmbeddings[c], targetEmbeddings[t]);
        if (sim > bestSim) bestSim = sim;
      }
      console.log(`  Best sim for "${targetSkills[t]}": ${bestSim.toFixed(4)} → ${bestSim >= threshold ? "✅ MATCHED" : "❌"}`);
      if (bestSim >= threshold) {
        matched.push(targetSkills[t]);
      }
    }

    console.log("✅ Matched:", matched);
    return matched;

  } catch (err) {
    console.error("❌ Embedding error:", err.message);
    return [];
  }
}

module.exports = {
  getEmbedding,
  getEmbeddingsBatch,
  cosineSimilarity,
  getSemanticMatchedSkills,
};
