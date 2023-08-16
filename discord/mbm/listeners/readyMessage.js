const client = global.client.mbm;

const utils = require("../../../utils/");

const listener = {
    name: 'readyMessage',
    eventName: 'ready',
    eventType: 'once',
    listener () {
        console.log(`[MBM] Discord bot ready! Logged in as ${client.user.tag}!`);
        console.log(`[MBM] Bot has started with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    }
};

module.exports = listener;
