const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    _id: String,
    content: String,
    twitchBan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TwitchBan",
    },
    live: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TwitchBan",
    },
    twitchGlobalTimeouts: Boolean,
    twitchGlobalBans: Boolean,
    time_sent: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("DiscordMessage", messageSchema);
