const mongoose = require("mongoose");

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

module.exports = userSchema;
