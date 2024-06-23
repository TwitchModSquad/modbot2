const utils = require("../utils/");

const ListenClient = require("./ListenClient");

const twitchClient = new ListenClient();

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

(async function() {
    console.log("Waiting until AuthProvider is populated before initializing ListenClient...");
    let i = 0;
    while (!global.twitchAuthReady) {
        await delay(500);
        i++;
        if (i % 10 === 0) {
            console.log(`Waited ${i/2} seconds for AuthProvider population`);
        }
    }
    console.log("AuthProvider populated! Initializing ListenClient...");
    twitchClient.initialize();
    utils.Schemas.TwitchUser
        .find({chat_listen: true})
        .sort({follower_count: -1})
        .then(async users => {
            console.log(`Attempting to join ${users.length} channels!`)
            for (let i = 0; i < users.length; i++) {
                try {
                    await twitchClient.join(users[i]);
                } catch(err) {
                    console.error(err);
                }
            }
            console.log(`Channel joining completed!`)
            global.twitchChannelsJoined = true;
        },
    console.error);
})();

global.client.twitch = twitchClient;

module.exports = twitchClient;
