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

module.exports = userSchema;
