const mongoose = require("mongoose");

const userSchema = require("./DiscordUserSchema");

module.exports = mongoose.model("DiscordUser", userSchema);
