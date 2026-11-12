# Outlaws AI

Standalone Discord AI chatbot: discord.js v14 + OpenAI Responses API + MongoDB.

## Discord setup
1. Create an app at https://discord.com/developers/applications and add a bot.
2. Enable **Message Content Intent** and **Server Members Intent** in Bot > Privileged Gateway Intents.
3. Invite it with `bot` and `applications.commands` scopes and View Channels, Send Messages, Read Message History permissions.
4. Copy the bot token, application ID, and your server ID.

## OpenAI and MongoDB
- Create an API key at https://platform.openai.com/api-keys. API usage is billed separately from ChatGPT.
- Create a MongoDB Atlas database and copy its connection URI.

## Environment variables
Set these in Render:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `HOME_GUILD_ID` (the server whose members may use DMs)
- `OPENAI_API_KEY`
- `MONGODB_URI`
Optional: `MONGODB_DB` (default `outlaws_ai`), `OPENAI_MODEL` (default `gpt-5.5`), `BOT_NAME` (default `Outlaws AI`).

## Render
Create a **Background Worker** connected to your GitHub repo.
Build command: `npm install`
Start command: `npm start`
Add all environment variables. No web server/port is needed.

## Register slash commands
On your computer, after setting env variables:
```sh
npm install
npm run deploy
```
Global commands may take some time to appear.

## Use
- `/ai setup`: Manage Server permission; select up to 25 text/announcement channels.
- AI responds only in selected channels.
- DMs work only for members of `HOME_GUILD_ID`, and only while AI is enabled.
- `/ai clear`: clears your personal conversation memory.
- `/ai disable`: disables AI in selected channels and DMs.

Conversation text is stored in MongoDB. Do not use the bot for sensitive personal information. Set API usage limits in OpenAI Platform.
