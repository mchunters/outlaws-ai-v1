import 'dotenv/config';
import {REST,Routes,SlashCommandBuilder,InteractionContextType,ApplicationIntegrationType} from 'discord.js';
const commands = [new SlashCommandBuilder().setName('ai').setDescription('Outlaws AI controls')
.setContexts(InteractionContextType.Guild,InteractionContextType.BotDM)
.setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
.addSubcommand(s=>s.setName('setup').setDescription('Select multiple AI chat channels'))
.addSubcommand(s=>s.setName('disable').setDescription('Disable AI in channels and DMs'))
.addSubcommand(s=>s.setName('clear').setDescription('Clear your personal chat memory'))].map(x=>x.toJSON());
await new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN).put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),{body:commands});
console.log('Registered /ai commands');
