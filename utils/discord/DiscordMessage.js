const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    _id: String,
    guild: String,
    channel: String,
    content: String,
    twitchBan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TwitchBan",
    },
    live: {
        type: String,
        ref: "TwitchLivestream",
    },
    giveaway: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Giveaway",
    },
    twitchGlobalTimeouts: Boolean,
    twitchGlobalBans: Boolean,
    time_sent: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("DiscordMessage", messageSchema);
