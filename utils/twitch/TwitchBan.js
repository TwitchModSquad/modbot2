const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    streamer: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    chatter: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    time_start: {
        type: Date,
        default: Date.now,
    },
    time_end: {
        type: Date,
        default: null,
    }
});

module.exports = mongoose.model("TwitchBan", chatSchema);
