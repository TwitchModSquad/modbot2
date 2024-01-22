const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    _id: String,
    streamer: {
        type: String,
        ref: "TwitchUser",
        required: true,
    },
    chatter: {
        type: String,
        ref: "TwitchUser",
        required: true,
    },
    color: String,
    badges: String,
    emotes: String,
    message: {
        type: String,
    },
    deleted: {
        type: Boolean,
        default: false,
    },
    time_sent: {
        type: Date,
        default: Date.now,
    },
    percent: {
        caps: {
            type: Number,
        },
        emotes: {
            type: Number,
        },
    }
});

chatSchema.methods.public = function() {
    const obj = {
        id: this._id,
        streamer: this.streamer.public(),
        chatter: this.chatter.public(),
        color: this.color,
        badges: this.badges,
        emotes: this.emotes,
        message: this.message,
        deleted: this.deleted,
        time_sent: this.time_sent,
    };
    if (this?.percent?.caps || this?.percent?.emotes) {
        obj.percent = {
            caps: this.percent.caps,
            emotes: this.percent.emotes,
        };
    }
    return obj;
}

module.exports = mongoose.model("TwitchChat", chatSchema);
