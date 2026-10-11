const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

async function askTutor(question) {
  const systemPrompt = `You are an environmental education tutor for school students.
Explain environmental concepts in simple, clear language.
Give practical, accurate examples.
Stay focused on environmental topics.
If uncertain, say so. Keep answers under 200 words.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\nStudent question: ${question}` }] }],
    config: { temperature: 0.7, maxOutputTokens: 1024 }
  });

  return response.text;
}

async function generateQuiz(topic, difficulty = 'easy', numQuestions = 5) {
  const prompt = `Generate ${numQuestions} multiple-choice quiz questions about "${topic}" for a ${difficulty} level student.

Return ONLY a valid JSON array. No markdown, no code fences, no extra text.
Format:
[
  {
    "question": "question text",
    "options": ["A", "B", "C", "D"],
    "correctIndex": 0,
    "explanation": "why this is correct"
  }
]

Rules:
- 4 options per question
- correctIndex is 0-based (0-3)
- Questions must be educational and environmentally focused`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.7, maxOutputTokens: 2048 }
  });

  const text = response.text;
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

async function analyzePerformance(scoreData) {
  const prompt = `A student has completed quizzes with these results:
${JSON.stringify(scoreData, null, 2)}

Analyze their performance and return ONLY a valid JSON object with this shape:
{
  "strengths": ["topic1", "topic2"],
  "weakAreas": ["topic3"],
  "recommendation": "1-2 sentence advice",
  "suggestedTopics": ["topic to study next"]
}

Rules:
- Use only the topics present in the data
- "strengths" = topics with avgScore >= 70
- "weakAreas" = topics with avgScore < 70
- No markdown, no extra text`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.7, maxOutputTokens: 1024 }
  });

  const text = response.text;
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { askTutor, generateQuiz, analyzePerformance };