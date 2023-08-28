const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        required: true,
    },
    user: {
        type: String,
        ref: "TwitchUser",
        required: true,
    },
});

module.exports = mongoose.model("GroupUser", schema);
