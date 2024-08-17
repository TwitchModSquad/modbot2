const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    actionName: {
        type: String,
        required: true,
    },
    subactionName: {
        type: String,
        default: null,
    },
    embedData: {
        type: String,
    },
});

module.exports = mongoose.model("DiscordAction", schema);
