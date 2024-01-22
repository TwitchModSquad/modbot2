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
    },
    member: {
        type: Boolean,
        default: false,
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
        index: true,
    },
    game: {
        type: String,
        ref: "TwitchGame",
    },
    tags: [{
        type: String,
        ref: "TwitchTag",
    }],
    title: String,
    viewers: {
        type: Number,
        index: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true,
    },
});

const TwitchStreamStatus = mongoose.model("TwitchStreamStatus", streamStatusSchema);

module.exports = {
    TwitchGame: TwitchGame,
    TwitchLivestream: TwitchLivestream,
    TwitchStreamStatus: TwitchStreamStatus,
    TwitchTag: TwitchTag,
};
