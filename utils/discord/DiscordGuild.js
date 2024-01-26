const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    _id: {
        type: String,
    },
    name: {
        type: String,
        minLength: 2,
        maxLength: 100,
        required: true,
    },
    owner: {
        type: String,
        ref: "DiscordUser",
    },
    icon: String,
    banner: String,
    commands: {
        archive: Boolean,
        banscan: Boolean,
        chatdump: Boolean,
        giveaway: Boolean,
        mention: Boolean,
        points: Boolean,
        user: Boolean,
    }
});

schema.methods.iconURL = function() {
    return `https://cdn.discordapp.com/icons/${this._id}/${this.icon}.png`;
}

module.exports = mongoose.model("DiscordGuild", schema);
