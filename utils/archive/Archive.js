const mongoose = require("mongoose");
const { EmbedBuilder, codeBlock, cleanCodeBlockContent, StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js");

const config = require("../../config.json");

const archiveSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Identity",
        required: true,
    },
    offense: {
        type: String,
        minLength: 3,
        maxLength: 256,
        required: true,
    },
    description: {
        type: String,
        minLength: 50,
        maxLength: 2048,
        required: true,
    },
    submitted: {
        type: Date,
        default: Date.now,
    },
    tlmsAllowed: Boolean,
});

archiveSchema.pre("save", async function() {
    const messages = await global.utils.Schemas.ArchiveMessage.find({entry: this._id});

    if (this.isNew) {
        await global.utils.Schemas.ArchiveLog.create({entry: this._id, created: true});
        setTimeout(async () => {
            const embed = await this.embed();
            const channel = await global.client.modbot.channels.fetch(config.discord.modbot.channels.archive_sort);
            const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("archive-sort")
                    .setPlaceholder("Sort Archive Entry")
                    .setOptions(config.discord.modbot.channels.archive_sort_targets);
            
            channel.send({embeds: [embed], components: [new ActionRowBuilder().setComponents(selectMenu)]}).then(async message => {
                await global.utils.Schemas.ArchiveMessage.create({
                    entry: this._id,
                    channel: channel.id,
                    message: message.id,
                });
            }, console.error);
        }, 5000);
    } else {
        const embed = await this.embed();
        for (let i = 0; i < messages.length; i++) {
            const channel = await global.client.modbot.channels.fetch(messages[i].channel);
            const message = await channel.messages.fetch(messages[i].message);
            message.edit({embeds: [embed]}).catch(console.error);
        }

        if (this.isModified("owner")) {
            await global.utils.Schemas.ArchiveLog.create({entry: this._id, updatedField: "owner"});
        }
        if (this.isModified("offense")) {
            await global.utils.Schemas.ArchiveLog.create({entry: this._id, updatedField: "offense"});
        }
        if (this.isModified("description")) {
            await global.utils.Schemas.ArchiveLog.create({entry: this._id, updatedField: "description"});
        }
    }
});

archiveSchema.methods.embed = async function() {
    const owner = await global.utils.Schemas.Identity.findById(this.owner);

    const discordUsers = await owner.getDiscordUsers();
    const twitchUsers = await owner.getTwitchUsers();

    const archiveFiles = await this.getFiles();
    const archiveUsers = await this.getUsers();

    const embed = new EmbedBuilder()
        .setTitle("Archive Entry")
        .setDescription(`**Submitted by ${twitchUsers.length > 0 ? twitchUsers[0].display_name : ""}${discordUsers.length > 0 ? ` <@${discordUsers[0]._id}>` : ""}**`)
        .setColor(0x772ce8)
        .addFields([
            {
                name: "Offense",
                value: codeBlock(cleanCodeBlockContent(this.offense)),
                inline: false,
            },
            {
                name: "Description",
                value: codeBlock(cleanCodeBlockContent(this.description)),
                inline: false,
            },
        ])
        .setFooter({text: `ID: ${this._id}`, iconURL: config.iconURI});

    if (archiveUsers.length > 0) {
        let twitchString = "";
        let discordString = "";
        let rawString = "";

        archiveUsers.forEach(user => {
            if (user.twitchUser) {
                twitchString += `\n**Twitch:** ${user.twitchUser.display_name} (${user.twitchUser._id})`;
            } else if (user.discordUser) {
                discordString += `\n**Discord:** ${user.discordUser.displayName} <@${user.discordUser._id}>`;
            } else if (user.raw) {
                discordString += `\n**Raw:** ${user.raw}`;
            }
        });

        const userString = twitchString + discordString + rawString;

        embed.addFields({
            name: "Users",
            value: userString,
            inline: false,
        });
    }

    if (archiveFiles.length > 0) {
        let fileString = "";

        archiveFiles.forEach(file => {
            if (file?.image?.data) {
                fileString += `\n[${file.label}](${config.express.domain.root}panel/archive/image/${file._id})`;
            } else if (file?.remote) {
                fileString += `\n[${file.label}](${file.remote})`;
            }
        });

        embed.addFields({
            name: "Files",
            value: fileString,
            inline: false,
        });
    }

    if (twitchUsers.length > 0) {
        embed.setAuthor({name: twitchUsers[0].display_name, iconURL: twitchUsers[0].profile_image_url})
    }

    return embed;
}

archiveSchema.methods.getUsers = async function() {
    return await global.utils.Schemas.ArchiveUser.find({entry: this._id})
            .populate("twitchUser")
            .populate("discordUser");
}

archiveSchema.methods.getFiles = async function() {
    return await global.utils.Schemas.ArchiveFile.find({entry: this._id})
            .sort({remote: -1});
}

archiveSchema.methods.getMessages = async function() {
    return await global.utils.Schemas.ArchiveMessage.find({entry: this._id});
}

module.exports = mongoose.model("Archive", archiveSchema);
