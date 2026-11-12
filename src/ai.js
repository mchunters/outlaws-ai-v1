import OpenAI from 'openai';
import { conversationsCollection } from './database.js';
const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const model = process.env.OPENAI_MODEL || 'gpt-5.5';
const locks = new Map();
const keyFor = (guildId,userId) => `${guildId}:${userId}`;
async function locked(key, fn) {
  const previous = locks.get(key) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const queued = previous.then(() => current);
  locks.set(key, queued);
  await previous;
  try { return await fn(); }
  finally { release(); if (locks.get(key) === queued) locks.delete(key); }
}
export async function clearConversation(guildId,userId) {
  await conversationsCollection().deleteOne({key:keyFor(guildId,userId)});
}
export async function generateReply(guildId,userId,text) {
  const key = keyFor(guildId,userId);
  return locked(key, async () => {
    const col = conversationsCollection();
    const saved = await col.findOne({key});
    const history = (saved?.messages || []).slice(-12);
    const response = await openai.responses.create({
      model,
      instructions:`You are ${process.env.BOT_NAME || 'Outlaws AI'}, a friendly, smart and slightly funny Discord assistant. Reply in the same language as the user (Bengali, Hindi, English, etc.). Be helpful, respectful and conversational. Do not claim to be human.`,
      input:[...history,{role:'user',content:text.slice(0,6000)}],
      max_output_tokens:700
    });
    const answer = response.output_text?.trim() || 'Sorry, I could not generate a reply.';
    await col.updateOne({key},{$set:{guildId,userId,messages:[...history,{role:'user',content:text.slice(0,6000)},{role:'assistant',content:answer}].slice(-12),updatedAt:new Date()}},{upsert:true});
    return answer;
  });
}
