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
    duration: {
        type: Number,
        required: true,
    },
    time_start: {
        type: Date,
        default: Date.now,
    },
    time_end: {
        type: Date,
        default: null,
    },
    migrate_id: Number,
});

module.exports = mongoose.model("TwitchTimeout", chatSchema);
