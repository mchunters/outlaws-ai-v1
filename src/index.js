import 'dotenv/config';
import {Client,GatewayIntentBits,Partials,Events,ActionRowBuilder,ChannelSelectMenuBuilder,ChannelType,PermissionFlagsBits} from 'discord.js';
import {connectDatabase,settingsCollection,closeDatabase} from './database.js';
import {clearConversation,generateReply} from './ai.js';
for (const k of ['DISCORD_TOKEN','DISCORD_CLIENT_ID','HOME_GUILD_ID','OPENAI_API_KEY','MONGODB_URI']) if (!process.env[k]) throw new Error(`Missing ${k}`);
const HOME = process.env.HOME_GUILD_ID;
const client = new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.DirectMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildMembers],partials:[Partials.Channel]});
const busy = new Set();
async function isMember(id) {
  try { const g=await client.guilds.fetch(HOME); await g.members.fetch({user:id,force:true}); return true; }
  catch { return false; }
}
async function replyLong(message,text) {
  for (const part of (text.match(/[\\s\\S]{1,1900}/g)||[''])) await message.reply({content:part,allowedMentions:{repliedUser:false}});
}
client.once(Events.ClientReady,c=>console.log(`${process.env.BOT_NAME||'Outlaws AI'} online as ${c.user.tag}`));
client.on(Events.MessageCreate,async m=>{
  if (m.author.bot || !m.content?.trim()) return;
  if (m.guild && m.guild.id!==HOME) return;
  const cfg=await settingsCollection().findOne({guildId:HOME});
  if (!cfg?.enabled) return;
  if (m.guild) { if (!cfg.channelIds?.includes(m.channel.id)) return; }
  else if (!(await isMember(m.author.id))) { await m.reply('Outlaws AI DM is only available to members of our server.'); return; }
  const k=`${HOME}:${m.author.id}`;
  if (busy.has(k)) { await m.reply('একটু অপেক্ষা করো—আগের উত্তরের কাজ চলছে।'); return; }
  busy.add(k);
  try { await m.channel.sendTyping(); await replyLong(m,await generateReply(HOME,m.author.id,m.content)); }
  catch(e) { console.error(e); await m.reply('দুঃখিত, এখন AI reply দিতে সমস্যা হচ্ছে। পরে আবার চেষ্টা করো।'); }
  finally { busy.delete(k); }
});
client.on(Events.InteractionCreate,async i=>{
  try {
    if (i.isChatInputCommand() && i.commandName==='ai') {
      const sub=i.options.getSubcommand();
      if (sub==='clear') {
        if (!(await isMember(i.user.id))) return i.reply({content:'শুধু server members এই bot ব্যবহার করতে পারবে।',ephemeral:true});
        await clearConversation(HOME,i.user.id);
        return i.reply({content:'তোমার AI conversation memory clear করা হয়েছে।',ephemeral:true});
      }
      if (!i.inGuild() || i.guildId!==HOME) return i.reply({content:'এই command শুধু configured server-এ ব্যবহার করা যাবে।',ephemeral:true});
      if (!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return i.reply({content:'Manage Server permission লাগবে।',ephemeral:true});
      if (sub==='disable') {
        await settingsCollection().updateOne({guildId:HOME},{$set:{guildId:HOME,enabled:false,updatedAt:new Date()}},{upsert:true});
        return i.reply({content:'Outlaws AI channel ও DM—দুটোতেই বন্ধ করা হয়েছে।',ephemeral:true});
      }
      const menu=new ChannelSelectMenuBuilder().setCustomId('outlaws_ai_setup').setPlaceholder('AI channel select করো').setChannelTypes(ChannelType.GuildText,ChannelType.GuildAnnouncement).setMinValues(1).setMaxValues(25);
      return i.reply({content:'এক বা একাধিক AI chat channel select করো (সর্বোচ্চ ২৫টি):',components:[new ActionRowBuilder().addComponents(menu)],ephemeral:true});
    }
    if (i.isChannelSelectMenu() && i.customId==='outlaws_ai_setup') {
      if (i.guildId!==HOME || !i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return i.update({content:'Manage Server permission এবং সঠিক server প্রয়োজন।',components:[]});
      await settingsCollection().updateOne({guildId:HOME},{$set:{guildId:HOME,enabled:true,channelIds:i.values,updatedAt:new Date()}},{upsert:true});
      return i.update({content:`Outlaws AI চালু! Selected channels: ${i.values.map(x=>`<#${x}>`).join(', ')}`,components:[]});
    }
  } catch(e) {
    console.error(e);
    if (i.isRepliable()) {
      const p={content:'কিছু সমস্যা হয়েছে। Render logs চেক করো।',ephemeral:true};
      if (i.replied||i.deferred) await i.followUp(p).catch(()=>{}); else await i.reply(p).catch(()=>{});
    }
  }
});
async function stop(){client.destroy();await closeDatabase().catch(()=>{});process.exit(0);}
process.on('SIGINT',stop); process.on('SIGTERM',stop);
await connectDatabase(); await client.login(process.env.DISCORD_TOKEN);
