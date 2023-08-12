const mongoose = require("mongoose");

const userSchema = require("./TwitchUserSchema");

module.exports = mongoose.model("TwitchUser", userSchema);
