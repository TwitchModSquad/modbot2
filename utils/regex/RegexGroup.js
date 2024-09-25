const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
        index: true,
    },
    created_at: {
        type: Date,
        default: Date.now,
    },
    last_updated: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("RegexGroup", schema);
