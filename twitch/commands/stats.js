const tmi = require("tmi.js");

const ListenClient = require("../ListenClient");
const utils = require("../../utils");

let stats = [];
let statsIndex = [];

const command = {
    name: "stats",
    /**
     * Listener for a message
     * @param {ListenClient} client 
     * @param {any} streamer 
     * @param {any} chatter 
     * @param {tmi.ChatUserstate} tags 
     * @param {string} message 
     * @param {function} reply
     */
    execute: async (client, streamer, chatter, args, tags, message, reply) => {
        let target = chatter;
        if (args.length > 0) {
            if (args[0].toLowerCase() === "top") {
                try {
                    const top1 = await utils.Twitch.getUserById(stats[0]._id);
                    const top2 = await utils.Twitch.getUserById(stats[1]._id);
                    const top3 = await utils.Twitch.getUserById(stats[2]._id);
                    const top4 = await utils.Twitch.getUserById(stats[3]._id);
                    const top5 = await utils.Twitch.getUserById(stats[4]._id);
                    reply(`the top 5 TMS chatters are: ` +
                            `#1. ${top1.display_name} (${utils.comma(stats[0].total)} msgs) | ` +
                            `#2. ${top2.display_name} (${utils.comma(stats[1].total)} msgs) | ` +
                            `#3. ${top3.display_name} (${utils.comma(stats[2].total)} msgs) | ` +
                            `#4. ${top4.display_name} (${utils.comma(stats[3].total)} msgs) | ` +
                            `#5. ${top5.display_name} (${utils.comma(stats[4].total)} msgs)`);
                } catch(e) {
                    console.error(e);
                    reply("unable to retrieve top users!");
                }
                return;
            }

            try {
                target = await utils.Twitch.getUserByName(args[0].replace("@", ""), false);
            } catch(e) {
                reply(`we were unable to find a user with the name of ${args[0]}!`)
                return;
            }
        }
        const statsObj = stats.find(x => x._id === target._id);
        if (statsObj) {
            const place = statsIndex.indexOf(target._id) + 1;
            let mostActiveUser;
            try {
                mostActiveUser = await utils.Twitch.getUserById(statsObj.streamers[0].streamer, false, false);
            } catch(e) {
                console.error(e);
            }
            const percentile = (((stats.length - place) / stats.length)*100).toFixed(1);
            if (target._id === chatter._id) {
                reply((`you have sent ${utils.comma(statsObj.total)} messages across ${statsObj.streamers.length} communit${statsObj.streamers.length === 1 ? "y" : "ies"}.`) +
                        (mostActiveUser ? ` Your most active community is ${mostActiveUser.display_name} with ${utils.comma(statsObj.streamers[0].total)} messages!` : "") +
                        (place ? ` You are the #${utils.comma(place)} highest chatter on TMS! (That's higher than ${percentile}% of other users!)` : ""));
            } else {
                reply((`${target.display_name} has sent ${utils.comma(statsObj.total)} messages across ${statsObj.streamers.length} communit${statsObj.streamers.length === 1 ? "y" : "ies"}.`) +
                        (mostActiveUser ? ` Their most active community is ${mostActiveUser.display_name} with ${utils.comma(statsObj.streamers[0].total)} messages!` : "") +
                        (place ? ` They are the #${utils.comma(place)} highest chatter on TMS! (That's higher than ${percentile}% of other users!)` : ""));
            }
        } else {
            if (stats.length === 0) {
                reply("we haven't generated the stats table yet!");
            } else reply(`we were unable to find ${target._id === chatter._id ? "your" : `${target.display_name}'s`} stats table!`);
        }
    }
}

const updateStats = async () => {
    const startTime = Date.now();
    console.log("Updating stats...");
    let allowedUsers = await utils.Schemas.TwitchUser.find({chat_listen: true})
            .select("_id");
    allowedUsers = allowedUsers.map(x => x._id);
    const chats = await utils.Schemas.TwitchUserChat.aggregate([
        {
            $group: {
                _id: "$chatter",
                streamers: {
                    $push: {
                        streamer: "$streamer",
                        total: "$messages",
                    },
                },
            },
        },
    ]);
    console.log(`Retrieved chat messages in ${Date.now() - startTime} ms`)
    const sortTime = Date.now();
    chats.forEach(chat => {
        chat.total = 0;
        chat.streamers.sort((a, b) => b.total - a.total);
        chat.streamers.forEach(streamer => {
            chat.total += streamer.total;
        })
    });
    chats.sort((a,b) => b.total - a.total);
    stats = chats;
    statsIndex = chats.map(x => x._id);
    console.log(`Sorted in ${Date.now() - sortTime} ms - ${Date.now() - startTime} ms total`)
}

setInterval(updateStats, 3600000);

setTimeout(updateStats, 1000);

module.exports = command;
