const mongoose = require("mongoose");

const userFlagSchema = new mongoose.Schema({
    flag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Flag",
        required: true,
        index: true,
    },
    twitchUser: {
        type: String,
        ref: "TwitchUser",
        index: true,
    },
    discordUser: {
        type: String,
        ref: "DiscordUser",
        index: true,
    },
    addedBy: {
        type: String,
        ref: "Identity",
        required: true,
    },
    added: {
        type: Date,
        default: Date.now,
    },
    removed: {
        type: Date,
        default: null,
    }
});

module.exports = mongoose.model("UserFlag", userFlagSchema);
