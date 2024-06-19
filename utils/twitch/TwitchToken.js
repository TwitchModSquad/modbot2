const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
    user: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    tokenData: {
        accessToken: {
            type: String,
            required: true,
        },
        expiresIn: Number,
        obtainmentTimestamp: Number,
        refreshToken: String,
        scope: [String],
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
});

tokenSchema.methods.use = async function() {
    if (this.uses) {
        this.uses++;
    } else this.uses = 1;
    this.last_used = Date.now();

    await this.save();
}

module.exports = mongoose.model("TwitchToken", tokenSchema);
