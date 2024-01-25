const mongoose = require("mongoose");

const schema = new mongoose.Schema({
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
    messages: {
        type: Number,
        default: 1,
    },
    first_message: {
        type: Date,
        default: Date.now,
    },
    last_message: {
        type: Date,
        default: Date.now,
    }
});

module.exports = mongoose.model("TwitchUserChat", schema);
