const mongoose = require("mongoose");

const livestreamSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        default: null,
    },
    language: {
        type: String,
        required: true,
    },
    user: {
        type: String,
        ref: "TwitchUser",
        required: true,
    }
});

const TwitchLivestream = mongoose.model("TwitchLivestream", livestreamSchema);

const gameSchema = new mongoose.Schema({
    _id: String,
    boxArtUrl: String,
    name: String,
});

const TwitchGame = mongoose.model("TwitchGame", gameSchema);

const tagSchema = new mongoose.Schema({
    _id: String,
    name: String,
    description: String,
    isAuto: Boolean,
});

const TwitchTag = mongoose.model("TwitchTag", tagSchema);

const streamStatusSchema = new mongoose.Schema({
    live: {
        type: String,
        ref: "TwitchLivestream",
        required: true,
    },
    game: {
        type: String,
        ref: "TwitchGame",
    },
    tags: [{
        type: String,
        ref: "TwitchTag",
        required: true,
    }],
    title: String,
    viewers: Number,
    timestamp: {
        type: Date,
        default: Date.now,
    }
});

const TwitchStreamStatus = mongoose.model("TwitchStreamStatus", streamStatusSchema);

module.exports = {
    TwitchGame: TwitchGame,
    TwitchLivestream: TwitchLivestream,
    TwitchStreamStatus: TwitchStreamStatus,
    TwitchTag: TwitchTag,
};
