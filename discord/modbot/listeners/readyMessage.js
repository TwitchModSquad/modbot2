const client = global.client.modbot;

const listener = {
    name: 'readyMessage',
    eventName: 'ready',
    eventType: 'once',
    listener () {
        console.log(`[MB] Discord bot ready! Logged in as ${client.user.tag}!`);
        console.log(`[MB] Bot has started with ${client.users.cache.size} users, in ${client.channels.cache.size} channels of ${client.guilds.cache.size} guilds.`);
    }
};

module.exports = listener;
