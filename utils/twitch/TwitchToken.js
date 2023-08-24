const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
    user: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    refresh_token: {
        type: String,
        required: true,
    },
    scope: {
        type: String,
        required: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    last_used: {
        type: Date,
        default: Date.now,
    },
    uses: {
        type: Number,
        default: 0,
    }
});

tokenSchema.methods.use = async function() {
    if (this.uses) {
        this.uses++;
    } else this.uses = 1;
    this.last_used = Date.now();

    await this.save();
}

module.exports = mongoose.model("TwitchToken", tokenSchema);
