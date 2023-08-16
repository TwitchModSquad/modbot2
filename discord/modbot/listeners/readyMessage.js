const client = global.client.modbot;

const utils = require("../../../utils/");

const listener = {
    name: 'readyMessage',
    eventName: 'ready',
    eventType: 'once',
    listener () {
        console.log(`[MB] Discord bot ready! Logged in as ${client.user.tag}!`);
        console.log(`[MB] Bot has started with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
        utils.Discord.init().catch(console.error);
    }
};

module.exports = listener;
