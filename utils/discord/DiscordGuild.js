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
        archive: {
            type: Boolean,
            default: false,
        },
        banscan: {
            type: Boolean,
            default: false,
        },
        chatdump: {
            type: Boolean,
            default: false,
        },
        giveaway: {
            type: Boolean,
            default: false,
        },
        mention: {
            type: Boolean,
            default: false,
        },
        points: {
            type: Boolean,
            default: false,
        },
        user: {
            type: Boolean,
            default: false,
        },
    },
    spammoderation: {
        type: String,
        enum: ["none", "kick", "ban"],
        default: "none",
    },
});

schema.methods.iconURL = function() {
    return `https://cdn.discordapp.com/icons/${this._id}/${this.icon}.png`;
}

schema.methods.public = function() {
    return {
        id: this._id,
        name: this.name,
        icon: this.iconURL(),
        commands: this.commands,
        spammoderation: this.spammoderation,
    };
}

module.exports = mongoose.model("DiscordGuild", schema);
