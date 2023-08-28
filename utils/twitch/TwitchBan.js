const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
    streamer: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    chatter: {
        type: String,
        ref: "TwitchUser",
        required: true,
        index: true,
    },
    time_start: {
        type: Date,
        default: Date.now,
    },
    time_end: {
        type: Date,
        default: null,
    }
});

banSchema.methods.public = function() {
    return {
        id: this._id,
        streamer: this.streamer.public(),
        chatter: this.chatter.public(),
        time_start: this.time_start,
        time_end: this.time_end,
    };
}

module.exports = mongoose.model("TwitchBan", banSchema);
