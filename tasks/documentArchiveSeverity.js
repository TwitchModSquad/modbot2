const utils = require("../utils");

const config = require("../config.json");

const io = require("@pm2/io");

const documentArchiveSeverity = async cb => {
    const entries = await utils.Schemas.Archive.find({});

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const messages = await entry.getMessages();
        if (messages.find(x => x.channel === config.discord.modbot.channels.archive_sort_targets[0].value)) {
            console.log("[DAS] Identified entry " + entry._id + " as SERIOUS");
            await utils.Schemas.Archive.findByIdAndUpdate(entry._id, {severity: "serious"});
        } else if (messages.find(x => x.channel === config.discord.modbot.channels.archive_sort_targets[1].value)) {
            console.log("[DAS] Identified entry " + entry._id + " as NORMAL");
            await utils.Schemas.Archive.findByIdAndUpdate(entry._id, {severity: "normal"});
        } else if (messages.find(x => x.channel === config.discord.modbot.channels.archive_sort_targets[2].value)) {
            console.log("[DAS] Identified entry " + entry._id + " as NORMAL");
            await utils.Schemas.Archive.findByIdAndUpdate(entry._id, {severity: "spam"});
        } else if (messages.find(x => x.channel === config.discord.modbot.channels.archive_sort_targets[3].value)) {
            console.log("[DAS] Identified entry " + entry._id + " as NORMAL");
            await utils.Schemas.Archive.findByIdAndUpdate(entry._id, {severity: "minor"});
        } else {
            console.error("[DAS] Could not identify severity of " + entry._id);
        }
    }

    cb({success: true});
}

io.action("archive/document-archive-severity", documentArchiveSeverity);
