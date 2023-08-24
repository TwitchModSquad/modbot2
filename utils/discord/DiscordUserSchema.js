const mongoose = require("mongoose");
const mongoosastic = require("mongoosastic");

const config = require("../../config.json");

const userSchema = new mongoose.Schema({
    _id: {
        type: String,
    },
    globalName: {
        type: String,
        minLength: 2,
        maxLength: 32,
        required: true,
        index: true,
        es_type: "completion",
        es_search_analyzer: "simple",
        es_indexed: true,
    },
    displayName: {
        type: String,
        minLength: 1,
        maxLength: 32,
    },
    discriminator: {
        type: String,
        maxLength: 4,
    },
    avatar: String,
    identity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
        index: true,
    },
    updated_at: {
        type: Date,
        default: Date.now,
    }
});

userSchema.pre("save", function(next) {
    this.updated_at = Date.now();
    next();
});

userSchema.methods.getTokens = async function(requiredScopes = []) {
    const tokens = await global.utils.Schemas.DiscordToken.find({user: this._id});
    let finalTokens = [];
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const scopes = token.scope.split(" ");
        let validToken = true;
        for (let s = 0; s < requiredScopes.length; s++) {
            if (!scopes.includes(requiredScopes[s])) validToken = false;
        }
        if (validToken) finalTokens.push(token);
    }
    return finalTokens;
}

userSchema.methods.public = function() {
    return {
        id: this._id,
        globalName: this.globalName,
        displayName: this.displayName,
        discriminator: this.discriminator,
        avatar: this.avatar,
        avatarURL: this.avatarURL(),
        identity: this.identity,
        updated_at: this.updated_at,
    };
}

userSchema.methods.createIdentity = async function() {
    if (this.identity) {
        await this.populate("identity");
        return this.identity;
    }

    const identity = await global.utils.Schemas.Identity.create({});
    this.identity = identity;
    await this.save();
    return identity;
}

userSchema.methods.avatarURL = function(size = 64) {
    if (this.avatar)
        return `https://cdn.discordapp.com/avatars/${this._id}/${this.avatar}.png?size=${size}`;

    if (this.discriminator === "0") {
        return `https://cdn.discordapp.com/embed/avatars/${(this._id >> 22) % 5}.png?size=${size}`;
    } else
        return `https://cdn.discordapp.com/embed/avatars/${Number(this.discriminator) % 5}.png?size=${size}`;
}

userSchema.plugin(mongoosastic, config.elasticsearch);

module.exports = userSchema;
