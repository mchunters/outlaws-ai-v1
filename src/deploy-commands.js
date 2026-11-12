import 'dotenv/config';
import {
  REST,
  Routes,
  SlashCommandBuilder,
  InteractionContextType,
  ApplicationIntegrationType
} from 'discord.js';

for (const key of ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID']) {
  if (!process.env[key]) throw new Error(`Missing ${key}`);
}

const commands = [
  new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Outlaws AI controls')
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addSubcommand(subcommand =>
      subcommand.setName('setup').setDescription('Select multiple AI chat channels')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('disable').setDescription('Disable AI in channels and DMs')
    )
    .addSubcommand(subcommand =>
      subcommand.setName('clear').setDescription('Clear your personal chat memory')
    )
].map(command => command.toJSON());

await new REST({ version: '10' })
  .setToken(process.env.DISCORD_TOKEN)
  .put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });

console.log('Registered /ai commands');
