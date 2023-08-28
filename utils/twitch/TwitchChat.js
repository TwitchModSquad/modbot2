const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    _id: String,
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
    color: String,
    badges: String,
    emotes: String,
    message: {
        type: String,
        default: false,
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    time_sent: {
        type: Date,
        default: Date.now,
        index: true,
    },
    percent: {
        caps: {
            type: Number,
            index: true,
        },
        emotes: {
            type: Number,
            index: true,
        },
    }
});

module.exports = mongoose.model("TwitchChat", chatSchema);
