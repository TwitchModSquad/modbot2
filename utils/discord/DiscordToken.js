const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
    user: {
        type: String,
        ref: "DiscordUser",
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
    },
});

const updateLastUsed = async function(obj) {
    if (!obj || !obj.save) return;
    if (obj.uses) {
        obj.uses++;
    } else obj.uses = 1;
    obj.last_used = Date.now();
    await obj.save();
}

tokenSchema.post("find", updateLastUsed);
tokenSchema.post("findOne", updateLastUsed);

module.exports = mongoose.model("DiscordToken", tokenSchema);
