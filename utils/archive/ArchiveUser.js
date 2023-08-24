const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    entry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Archive",
        required: true,
    },
    twitchUser: {
        type: String,
        ref: "TwitchUser",
    },
    discordUser: {
        type: String,
        ref: "DiscordUser",
    },
    raw: String,
});

schema.pre("save", async function() {
    if (this.isNew) {
        await global.utils.Schemas.ArchiveLog.create({entry: this._id, newUser: true});
    }
});

module.exports = mongoose.model("ArchiveUser", schema);
