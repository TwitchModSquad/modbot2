const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    identity: {
        type: mongoose.Types.ObjectId,
        ref: "Identity",
        required: true,
        index: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    bonus: {
        type: Number,
        default: 0,
        required: true,
    },
    reason: {
        type: String,
        enum: ["daily","message","wos","ad","giveaway"],
        required: true,
    },
    channel: String,
    message: String,
    transferDate: {
        type: Date,
        default: Date.now,
        required: true,
    },
    cancelDate: {
        type: Date,
        default: null,
    },
});

module.exports = mongoose.model("PointLog", schema);
