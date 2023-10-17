const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    _id: String,
    guild: String,
    channel: String,
    content: String,
    twitchBan: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TwitchBan",
    },
    live: {
        type: String,
        ref: "TwitchLivestream",
    },
    giveaway: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Giveaway",
    },
    twitchGlobalTimeouts: Boolean,
    twitchGlobalBans: Boolean,
    time_sent: {
        type: Date,
        default: Date.now,
    },
});

messageSchema.methods.getMessage = function(client = global.client.mbm) {
    return new Promise((resolve, reject) => {
        if (!this.channel) {
            return reject("Channel was not stored with message!");
        }
        client.channels.fetch(this.channel).then(channel => {
            channel.messages.fetch(this._id).then(resolve, reject);
        }, reject);
    })
}

module.exports = mongoose.model("DiscordMessage", messageSchema);
