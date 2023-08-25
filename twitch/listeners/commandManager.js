const fs = require('fs');
const tmi = require("tmi.js");

const utils = require("../../utils/");
const ListenClient = require('../ListenClient');

const grabFiles = path => fs.readdirSync(path).filter(file => file.endsWith('.js'));
const commandFiles = grabFiles('./twitch/commands/');
const commands = {};

for (const file of commandFiles) {
    const command = require(`../commands/${file}`);
    if ("name" in command && "execute" in command) {
        commands[command.name] = command.execute;
    } else {
        console.error(`Command ${file} is missing required attribute!`);
    }
}

const listener = {
    name: "commandManager",
    eventName: "message",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {any} streamer 
     * @param {any} chatter 
     * @param {tmi.ChatUserstate} tags 
     * @param {string} message 
     * @param {boolean} self 
     */
    listener: async (client, streamer, chatter, tags, message, self) => {
        if (self) return;

        const prefix = streamer?.commands?.prefix ? streamer.commands.prefix : "!";
        if (!message.startsWith(prefix)) return;
        const args = message.split(" ");
        const command = args.shift().toLowerCase().substring(prefix.length);

        if (!commands.hasOwnProperty(command)) return;
        if (!streamer?.commands[command]) return;

        const reply = async (msg, mention = true) => {
            return await client.client.say("#"+streamer.login, `${mention ? `@${chatter.display_name}, ` : ""}${msg}`);
        }

        try {
            commands[command](client, streamer, chatter, args, tags, message, reply);
        } catch(err) {
            console.error(`Error while processing command ${command}:`)
            console.error(err);
        }
    }
};

module.exports = listener;
