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
});

const updateLastUsed = async function(obj) {
    obj.last_used = Date.now();
    await obj.save();
}

tokenSchema.post("find", updateLastUsed);
tokenSchema.post("findOne", updateLastUsed);

module.exports = mongoose.model("TwitchToken", tokenSchema);
