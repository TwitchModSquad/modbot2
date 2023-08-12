const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
    _id: {
        type: String,
    },
    name: {
        type: String,
        minLength: 2,
        maxLength: 100,
        required: true,
    },
    owner: {
        type: String,
        ref: "DiscordUser",
    },
    icon: String,
    banner: String,
});

module.exports = mongoose.model("DiscordGuild", banSchema);
