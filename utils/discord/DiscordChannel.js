const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    _id: {
        type: String,
    },
    guild: {
        type: String,
        ref: "DiscordGuild",
    },
    name: {
        type: String,
        minLength: 2,
        maxLength: 100,
        required: true,
    },
    actions: {
        // Guild
        guildEdit: {
            type: Boolean,
            default: false,
        },
        // Channel
        channelCreate: {
            type: Boolean,
            default: false,
        },
        channelDelete: {
            type: Boolean,
            default: false,
        },
        channelEdit: {
            type: Boolean,
            default: false,
        },
        // Invite
        inviteCreate: {
            type: Boolean,
            default: false,
        },
        // Member
        memberAdd: {
            type: Boolean,
            default: false,
        },
        // Member Remove
        memberRemove: {
            type: Boolean,
            default: false,
        },
        memberRemoveLeave: {
            type: Boolean,
            default: true,
        },
        memberRemoveKick: {
            type: Boolean,
            default: true,
        },
        // Member Edit
        memberEdit: {
            type: Boolean,
            default: false,
        },
        memberEditName: {
            type: Boolean,
            default: true,
        },
        memberEditAvatar: {
            type: Boolean,
            default: true,
        },
        memberEditRoles: {
            type: Boolean,
            default: true,
        },
        // Message Edit
        messageEdit: {
            type: Boolean,
            default: true,
        },
        // Message Delete
        messageDelete: {
            type: Boolean,
            default: true,
        },
        messageDeleteDelete: {
            type: Boolean,
            default: true,
        },
        messageDeleteModerator: {
            type: Boolean,
            default: true,
        },
        // Twitch Integration
        twitchLivestream: {
            type: Boolean,
            default: false,
        },
        twitchLivestreamChannels: {
            type: [String],
            ref: "TwitchUser",
            default: [],
        },
        twitchBan: {
            type: Boolean,
            default: false,
        },
        twitchBanChannels: {
            type: [String],
            ref: "TwitchUser",
            default: [],
        },
    },
});

schema.methods.public = function() {
    return {
        id: this._id,
        name: this.name,
        actions: this.actions,
    };
}

module.exports = mongoose.model("DiscordChannel", schema);
