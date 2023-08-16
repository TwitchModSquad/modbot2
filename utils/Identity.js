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

identitySchema.methods.getStreamers = async function () {
    let streamerRoles = [];
    const twitchUsers = await this.getTwitchUsers();
    for (let i = 0; i < twitchUsers.length; i++) {
        const roles = await twitchUsers[i].getStreamers();
        for (let r = 0; r < roles.length; r++) {
            const role = roles[r];
            if (!streamerRoles.find(x => x.streamer.id === role.streamer.id)) {
                streamerRoles.push(role);
            }
        }
    }
    return streamerRoles;
}

module.exports = mongoose.model("Identity", identitySchema);
