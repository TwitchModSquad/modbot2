const mongoose = require("mongoose");

const flagSchema = new mongoose.Schema({
    name: {
        type: String,
        minLength: 2,
        maxLength: 32,
        required: true,
        unique: true,
    },
    aliases: {
        type: [String],
        default: [],
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

const toTitleCase = str => {
    return str.replace(
        /\w\S*/g,
        text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
    );
}

flagSchema.methods.displayName = function() {
    return toTitleCase(this.name);
}

module.exports = mongoose.model("Flag", flagSchema);
