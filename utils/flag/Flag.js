const mongoose = require("mongoose");

const flagSchema = new mongoose.Schema({
    name: {
        type: String,
        minLength: 2,
        maxLength: 32,
        required: true,
        unique: true,
    },
    icon: {
        type: String,
    },
    description: {
        type: String,
        minLength: 1,
        maxLength: 128,
    },
});

module.exports = mongoose.model("Flag", flagSchema);
