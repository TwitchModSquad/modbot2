const mongoose = require("mongoose");

const schema = new mongoose.Schema({
    entry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Archive",
        required: true,
    },
    label: {
        type: String,
        minLength: 3,
        maxLength: 64,
    },
    image: {
        contentType: String,
        data: Buffer,
    },
    remote: {
        type: String,
        maxLength: 256,
    },
});

schema.pre("save", async function() {
    if (this.isNew) {
        await global.utils.Schemas.ArchiveLog.create({entry: this._id, newFile: true});
    }
});

module.exports = mongoose.model("ArchiveFile", schema);
