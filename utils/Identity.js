const mongoose = require("mongoose");

const identitySchema = new mongoose.Schema({
    authenticated: {
        type: Boolean,
        default: false,
    },
    admin: {
        type: Boolean,
        default: false,
    },
    moderator: {
        type: Boolean,
        default: false,
    },
});

identitySchema.methods.getTwitchUsers = async function () {
    return await global.utils.Schemas.TwitchUser.find({identity: this._id});
}

identitySchema.methods.getDiscordUsers = async function () {
    return await global.utils.Schemas.DiscordUser.find({identity: this._id});
}

module.exports = mongoose.model("Identity", identitySchema);
