const mongoose = require("mongoose");

const userFlagSchema = new mongoose.Schema({
    user: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    flag: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Flag",
        required: true,
        index: true,
    },
    added: {
        type: Date,
        default: Date.now(),
    },
    removed: {
        type: Date,
        default: null,
    }
});

module.exports = mongoose.model("TwitchUserFlag", userFlagSchema);
