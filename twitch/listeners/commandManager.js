const fs = require('fs');

const utils = require("../../utils/");
const ListenClient = require('../ListenClient');
const { ChatMessage } = require('@twurple/chat');

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
     * @param {utils.Schemas.TwitchUser} streamer 
     * @param {utils.Schemas.TwitchUser} chatter 
     * @param {ChatMessage} msg 
     * @param {string} message 
     * @param {boolean} self
     */
    listener: async (client, streamer, chatter, msg, message, self) => {
        if (self) return;

        const prefix = streamer?.commands?.prefix ? streamer.commands.prefix : "!";
        if (!message.startsWith(prefix)) return;

        const args = message.split(" ");
        const command = args.shift().toLowerCase().substring(prefix.length);

        if (!commands.hasOwnProperty(command)) return;
        if (!streamer?.commands[command]) return;

        const reply = async (text, mention = true) => {
            return await utils.Twitch.Helix.asIntent(["tms:chat"], async ctx => {
                return await ctx.chat.sendChatMessage(msg.channelId, text, {
                    replyParentMessageId: mention ? msg.id : null,
                });
            });
        }

        try {
            console.log(`#${streamer.login}: processing command ${command}`);
            commands[command](client, streamer, chatter, args, msg, message, reply);
        } catch(err) {
            console.error(`Error while processing command ${command}:`)
            console.error(err);
        }
    }
};

module.exports = listener;
