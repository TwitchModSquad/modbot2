const { REST, Routes } = require('discord.js');
const config = require('../config.json');

let botRoot = config.discord.modbot;
const rest = new REST().setToken(botRoot.token);

const guilds = [
	config.discord.guilds.community_lobbies,
	config.discord.guilds.little_modsquad,
	config.discord.guilds.modsquad,
];

const io = require("@pm2/io");

io.action("discord/delete-commands", cb => {
	// for guild-based commands
	for (let i = 0; i < guilds.length; i++) {
		rest.put(Routes.applicationGuildCommands(botRoot.id, guilds[i]), { body: [] })
			.then(() => console.log(`Successfully deleted guild commands for ${guilds[i]}.`))
			.catch(console.error);
	}
	
	// for global commands
	rest.put(Routes.applicationCommands(botRoot.id), { body: [] })
		.then(() => console.log('Successfully deleted all application commands.'))
		.catch(console.error);

	cb({ok: true});
});
