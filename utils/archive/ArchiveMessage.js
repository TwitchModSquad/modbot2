const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    entry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Archive",
        required: true,
    },
    channel: String,
    message: String,
});

module.exports = mongoose.model("ArchiveMessage", schema);
