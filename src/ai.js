import { GoogleGenAI } from '@google/genai';
import { conversationsCollection } from './database.js';

if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is missing');

const gemini = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const locks = new Map();

const keyFor = (guildId, userId) => `${guildId}:${userId}`;

async function locked(key, fn) {
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const queued = previous.then(() => current);

  locks.set(key, queued);
  await previous;

  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === queued) locks.delete(key);
  }
}

export async function clearConversation(guildId, userId) {
  await conversationsCollection().deleteOne({ key: keyFor(guildId, userId) });
}

export async function generateReply(guildId, userId, text) {
  const key = keyFor(guildId, userId);

  return locked(key, async () => {
    const collection = conversationsCollection();
    const saved = await collection.findOne({ key });
    const history = (saved?.messages || []).slice(-12);

    const contents = [
      ...history.map(message => ({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }]
      })),
      { role: 'user', parts: [{ text: text.slice(0, 6000) }] }
    ];

    const response = await gemini.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction: `You are ${process.env.BOT_NAME || 'Outlaws AI'}, a friendly, smart, and slightly funny Discord assistant. Reply in the same language as the user (Bengali, Hindi, English, etc.). Be helpful, respectful, and conversational. Do not claim to be human.`,
        maxOutputTokens: 700,
        temperature: 0.8
      }
    });

    const answer = response.text?.trim() || 'Sorry, I could not generate a reply.';

    await collection.updateOne(
      { key },
      {
        $set: {
          guildId,
          userId,
          messages: [
            ...history,
            { role: 'user', content: text.slice(0, 6000) },
            { role: 'assistant', content: answer }
          ].slice(-12),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return answer;
  });
}
