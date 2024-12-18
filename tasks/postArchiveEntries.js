const client = require("../discord/modbot");
const utils = require("../utils");

const config = require("../config.json");

const io = require("@pm2/io");

const postArchiveEntries = async cb => {
    const entries = await utils.Schemas.Archive.find({});

    const archiveChannel = await client.channels.fetch(config.discord.modbot.channels.archive);

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        let tagId = null;

        const messages = await entry.getMessages();
        if (messages.length > 0) {
            console.log(`Ignoring ${entry._id}: Post already exists`);
            continue;
        }

        console.log(`Continuing with ${entry._id}: No post exists`);

        if (entry.severity === "serious") {
            tagId = config.discord.modbot.channels.archive_sort_targets[0].value.split("-")[1];
        } else if (entry.severity === "normal") {
            tagId = config.discord.modbot.channels.archive_sort_targets[1].value.split("-")[1];
        } else if (entry.severity === "spam") {
            tagId = config.discord.modbot.channels.archive_sort_targets[2].value.split("-")[1];
        } else if (entry.severity === "minor") {
            tagId = config.discord.modbot.channels.archive_sort_targets[3].value.split("-")[1];
        } else {
            console.error("Could not determine tag for " + entry._id);
            continue;
        }
        console.log("Found tag " + tagId + " for " + entry._id);

        archiveChannel.threads.create({
            name: entry.offense.substring(0, 100),
            message: await entry.message(),
            appliedTags: [tagId],
            reason: "Post Archive Entries action",
        }).then(channel => {
            utils.Schemas.ArchiveMessage.create({
                entry: entry._id,
                channel: channel.id,
                message: channel.id,
            }).catch(console.error);

            console.log("Created post for " + entry._id);
        });
    }


    cb({success: true});
}

io.action("archive/post-archive-entries", postArchiveEntries);
