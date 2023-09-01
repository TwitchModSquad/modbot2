const { REST, Routes } = require('discord.js');
const config = require('../config.json');

let botRoot = config.discord.modbot;
const rest = new REST().setToken(botRoot.token);

let guildId = "934991691402866689";

// for guild-based commands
rest.put(Routes.applicationGuildCommands(botRoot.id, guildId), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);

// for global commands
rest.put(Routes.applicationCommands(botRoot.id), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);
