const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
    guild: {
        type: String,
        ref: "DiscordGuild",
        required: true,
        index: true,
    },
    user: {
        type: String,
        ref: "DiscordUser",
        required: true,
        index: true,
    },
    executor: {
        type: String,
        ref: "DiscordUser",
        index: true,
    },
    reason: String,
    time_start: {
        type: Date,
        default: Date.now,
    },
    time_end: {
        type: Date,
        default: null,
    }
});

module.exports = mongoose.model("DiscordBan", banSchema);
