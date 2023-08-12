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
});

module.exports = mongoose.model("DiscordMessage", messageSchema);
