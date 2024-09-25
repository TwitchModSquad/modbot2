const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RegexGroup",
        required: true,
    },
    regex: {
        type: String,
        required: true,
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

module.exports = mongoose.model("Regex", schema);
