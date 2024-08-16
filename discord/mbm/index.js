const fs = require('fs');
const Discord = require('discord.js');

const client = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildInvites,
        Discord.GatewayIntentBits.GuildMembers,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.GuildModeration,
        Discord.GatewayIntentBits.MessageContent,
    ]
});
global.client.mbm = client;

client.commands = new Discord.Collection();
client.listeners = new Discord.Collection();

const config = require("../../config.json");
const utils = require('../../utils');

const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));

const commandFiles = grabFiles('./discord/mbm/commands');
const listenerFiles = grabFiles('./discord/mbm/listeners');

const actionListenerFiles = grabFiles('./discord/mbm/listeners/actionListeners');

// process command files
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// process listener files
for (const file of listenerFiles) {
    const listener = require(`./listeners/${file}`);
    client.listeners.set(listener.name, listener);
}

// process action listener files
for (const file of actionListenerFiles) {
    const listener = require(`./listeners/actionListeners/${file}`);
    client.listeners.set(listener.name, listener);
}

client.setMaxListeners(0);

// Register listeners.
client.listeners.forEach(listener => {
    client[listener.eventType](listener.eventName, listener.listener);
});

let page = 1;
setInterval(() => {
    if (!client.isReady()) {
        return;
    }

    if (page === 1) {
        let totalChannels = 0;
    
        totalChannels += global.client.twitch.totalChannels();
    
        client.user.setPresence({
            activities: [
                {
                    name: `${totalChannels} Twitch channels`,
                    type: Discord.ActivityType.Watching,
                }
            ],
            status: "online",
        })
        page = 2;
    } else if (page === 2) {
        client.user.setPresence({
            activities: [
                {
                    name: `${client.guilds.cache.size} Discord guilds`,
                    type: Discord.ActivityType.Watching,
                }
            ],
            status: "online",
        })
        page = 1;
    }
}, 30000);

client.login(config.discord.mbm.token).catch(console.error);

// Register slash commands.
require("./slashCommands")(client);

utils.Discord.guildManager.setClient(client);

module.exports = client;
