const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const fs = require("fs");
const config = require("../../config.json");

const commandFiles = fs.readdirSync('./discord/modbot/commands').filter(file => file.endsWith('.js'));

let commands = [];

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands = [
        ...commands,
        command.data
    ]
}

const rest = new REST({ version: '9' }).setToken(config.discord.modbot.token);

module.exports = (async client => {
    try {
        await rest.put(
			Routes.applicationCommands(config.discord.modbot.id),
			{ body: commands },
		);

        console.log('[MB] Successfully set commands');
    } catch (error) {
        console.error(error);
    }
});
