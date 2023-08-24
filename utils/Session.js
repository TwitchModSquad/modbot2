const mongoose = require("mongoose");

const SESSION_LENGTH = 14 * 24 * 60 * 60 * 1000;
// 14 days

const sessionSchema = new mongoose.Schema({
    _id: String,
    identity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    expires_at: {
        type: Date,
        default: () => Date.now() + SESSION_LENGTH,
    },
    last_used: {
        type: Date,
        default: Date.now,
    },
});

const updateLastUsed = async function(obj) {
    if (!obj) return;
    obj.last_used = Date.now();
    await obj.save();
}

sessionSchema.post("find", updateLastUsed);
sessionSchema.post("findOne", updateLastUsed);

module.exports = mongoose.model("Session", sessionSchema);
