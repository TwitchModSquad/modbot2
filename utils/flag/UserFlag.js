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
        required: true,
        index: true,
    },
    discordUser: {
        type: String,
        ref: "DiscordUser",
        required: true,
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
