const mongoose = require("mongoose");
const config = require("../config.json");

const TwitchChat = require("../utils/twitch/TwitchChat");
const TwitchUserChat = require("../utils/twitch/TwitchUserChat");

const data = [];

const NOTIFY_EVERY = 10000; // entries

mongoose.connect(config.mongodb.url).then(async () => {
    console.log("Getting chat aggregate");
    const chats = (await TwitchChat.aggregate([
        {
            $group: {
                _id: {
                    chatter: "$chatter",
                    streamer: "$streamer"
                },
                first_message: {
                    $min: "$time_sent",
                },
                last_message: {
                    $max: "$time_sent",
                },
                messages: { $sum: 1 },
            }
        },
    ])).map(x => {return {chatter: x._id.chatter, streamer: x._id.streamer, first_message: x.first_message, last_message: x.last_message, messages: x.messages}});
    console.log(`Completed. ${chats.length} entries`);
    console.log("Flushing TwitchUserChat");
    await TwitchUserChat.deleteMany({});
    console.log("Flushed.");
    console.log("Adding TwitchUserChat entries");
    let cache = [];
    for (let i = 0; i < chats.length; i++) {
        cache.push(chats[i]);
        if (i % NOTIFY_EVERY === 0) {
            console.log(`Completed ${i}/${chats.length} entries`);
        }
        if (cache.length >= 10000) {
            await TwitchUserChat.create(cache);
            cache = [];
        }
    }
    if (cache.length > 0) {
        await TwitchUserChat.create(cache);
    }
    console.log("Completed TwitchUserChat seed");
});
