# Outlaws AI

A standalone Discord AI chatbot built with discord.js v14, the Google Gemini API, and MongoDB.

## Discord setup

1. Create an application at https://discord.com/developers/applications and add a bot.
2. Enable **Message Content Intent** and **Server Members Intent** under Bot > Privileged Gateway Intents.
3. Invite the bot with the `bot` and `applications.commands` scopes. Grant View Channels, Send Messages, and Read Message History permissions.
4. Copy the bot token, application ID, and server ID.

## Gemini and MongoDB setup

1. Create a Gemini API key at https://aistudio.google.com/apikey.
2. Create a MongoDB Atlas database and copy its connection URI.
3. Add the values to your hosting provider's environment variables.

## Environment variables

Required:

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `HOME_GUILD_ID`
- `GEMINI_API_KEY`
- `MONGODB_URI`

Optional:

- `MONGODB_DB` (default: `outlaws_ai`)
- `GEMINI_MODEL` (default: `gemini-2.5-flash`)
- `BOT_NAME` (default: `Outlaws AI`)

Copy `.env.example` to `.env` for local development and fill in your own values. Never share your API key or commit it to GitHub.

## Render deployment

Create a **Background Worker** connected to your GitHub repository.

- Build command: `npm install`
- Start command: `npm start`

Add all required environment variables in Render. No web server or port is required.

## Register slash commands

After setting the environment variables, run:

```sh
npm install
npm run deploy
```

Global slash commands may take some time to appear.

## Usage

- `/ai setup`: Requires Manage Server permission. Select up to 25 text or announcement channels.
- The AI responds only in the selected channels.
- DMs are available only to members of `HOME_GUILD_ID`, while AI is enabled.
- `/ai clear`: Clears your personal conversation memory.
- `/ai disable`: Disables AI in selected channels and DMs.

Conversation text is stored in MongoDB. Do not use the bot to process sensitive personal information. Configure API usage limits in Google AI Studio where available.
