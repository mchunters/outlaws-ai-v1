import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits
} from 'discord.js';
import { connectDatabase, settingsCollection, closeDatabase } from './database.js';
import { clearConversation, generateReply } from './ai.js';

for (const key of ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'HOME_GUILD_ID', 'GEMINI_API_KEY', 'MONGODB_URI']) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const HOME = process.env.HOME_GUILD_ID;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

const busy = new Set();

async function isMember(userId) {
  try {
    const guild = await client.guilds.fetch(HOME);
    await guild.members.fetch({ user: userId, force: true });
    return true;
  } catch {
    return false;
  }
}

async function replyLong(message, content) {
  const parts = content.match(/[\s\S]{1,1900}/g) || [''];
  for (const part of parts) {
    await message.reply({
      content: part,
      allowedMentions: { repliedUser: false }
    });
  }
}

client.once(Events.ClientReady, currentClient => {
  console.log(`${process.env.BOT_NAME || 'Outlaws AI'} is online as ${currentClient.user.tag}`);
});

client.on(Events.MessageCreate, async message => {
  if (message.author.bot || !message.content?.trim()) return;
  if (message.guild && message.guild.id !== HOME) return;

  const config = await settingsCollection().findOne({ guildId: HOME });
  if (!config?.enabled) return;

  if (message.guild) {
    if (!config.channelIds?.includes(message.channel.id)) return;
  } else if (!(await isMember(message.author.id))) {
    await message.reply('Outlaws AI DMs are available only to members of our server.');
    return;
  }

  const key = `${HOME}:${message.author.id}`;
  if (busy.has(key)) {
    await message.reply('Please wait. I am still working on your previous message.');
    return;
  }

  busy.add(key);
  try {
    await message.channel.sendTyping();
    await replyLong(message, await generateReply(HOME, message.author.id, message.content));
  } catch (error) {
    console.error(error);
    await message.reply('Sorry, I could not generate an AI response right now. Please try again later.');
  } finally {
    busy.delete(key);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'ai') {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === 'clear') {
        if (!(await isMember(interaction.user.id))) {
          return interaction.reply({
            content: 'Only members of our server can use this bot.',
            ephemeral: true
          });
        }

        await clearConversation(HOME, interaction.user.id);
        return interaction.reply({
          content: 'Your AI conversation memory has been cleared.',
          ephemeral: true
        });
      }

      if (!interaction.inGuild() || interaction.guildId !== HOME) {
        return interaction.reply({
          content: 'This command can only be used in the configured server.',
          ephemeral: true
        });
      }

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: 'You need the Manage Server permission to use this command.',
          ephemeral: true
        });
      }

      if (subcommand === 'disable') {
        await settingsCollection().updateOne(
          { guildId: HOME },
          { $set: { guildId: HOME, enabled: false, updatedAt: new Date() } },
          { upsert: true }
        );

        return interaction.reply({
          content: 'Outlaws AI has been disabled in channels and DMs.',
          ephemeral: true
        });
      }

      const menu = new ChannelSelectMenuBuilder()
        .setCustomId('outlaws_ai_setup')
        .setPlaceholder('Select AI chat channels')
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        .setMinValues(1)
        .setMaxValues(25);

      return interaction.reply({
        content: 'Select one or more AI chat channels (up to 25):',
        components: [new ActionRowBuilder().addComponents(menu)],
        ephemeral: true
      });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'outlaws_ai_setup') {
      if (
        interaction.guildId !== HOME ||
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
      ) {
        return interaction.update({
          content: 'Manage Server permission and the configured server are required.',
          components: []
        });
      }

      await settingsCollection().updateOne(
        { guildId: HOME },
        {
          $set: {
            guildId: HOME,
            enabled: true,
            channelIds: interaction.values,
            updatedAt: new Date()
          }
        },
        { upsert: true }
      );

      return interaction.update({
        content: `Outlaws AI is enabled! Selected channels: ${interaction.values.map(id => `<#${id}>`).join(', ')}`,
        components: []
      });
    }
  } catch (error) {
    console.error(error);

    if (interaction.isRepliable()) {
      const payload = {
        content: 'Something went wrong. Please check the Render logs.',
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  }
});

async function stop() {
  client.destroy();
  await closeDatabase().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await connectDatabase();
await client.login(process.env.DISCORD_TOKEN);
