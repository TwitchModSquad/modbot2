const { EmbedBuilder, codeBlock, cleanCodeBlockContent, StringSelectMenuBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require("discord.js");
const mongoose = require("mongoose");

const config = require("../../config.json");

const schema = new mongoose.Schema({
    posted_by: {
        type: String,
        ref: "DiscordUser",
        required: true,
    },
    game: {
        type: String,
        ref: "TwitchGame",
    },
    start_time: Date,
    end_time: Date,
    message: String,
});

schema.pre("save", async function(next) {
    if (!this.isNew && this.message) {
        await this.updateMessage();
    }
    next();
});

schema.methods.getUsers = async function() {
    return await global.utils.Schemas.GroupUser.find({group: this._id})
            .populate("user")
}

schema.methods.embed = async function() {
    const users = await this.getUsers();

    const embed = new EmbedBuilder()
        .setTitle(this?.game?.name ? this.game.name : "Group Information")
        .setColor(0x772ce8)
        .setAuthor({name: this.posted_by.displayName, iconURL: this.posted_by.avatarURL()})
        .addFields([{
            name: "Posted By",
            value: `<@${this.posted_by._id}>`,
            inline: false,
        }, {
            name: "Participants",
            value: users.map((x,i) => `**${i+1}** - [${x.user.display_name}](https://twitch.tv/${x.login})`).join("\n"),
            inline: false,
        }])
        .setFooter({text: `TMS Group ${this._id}`, iconURL: config.iconURI});

    if (this.start_time) {
        embed.addFields({
            name: "Start Time",
            value: `<t:${Math.floor(this.start_time.getTime() / 1000)}:f>`,
            inline: true,
        });
    }
    if (this.end_time) {
        embed.addFields({
            name: "End Time",
            value: `<t:${Math.floor(this.end_time.getTime() / 1000)}:f>`,
            inline: true,
        });
    }

    if (this?.game?.boxArtUrl) {
        embed.setThumbnail(this.game.boxArtUrl.replace("{width}","256").replace("{height}","256"));
    }

    embed.addFields({
        name: "Command",
        value: codeBlock(cleanCodeBlockContent("Streamer is playing with " + users.map(x => x.user.display_name).join(", "))),
        inline: false,
    });

    return embed;
}

schema.methods.editComponents = async function() {
    const users = await this.getUsers();

    const removeUserSelect = new StringSelectMenuBuilder()
        .setCustomId(`group-userdel-${this._id}`)
        .setPlaceholder("Remove Users")
        .setMinValues(1)
        .setMaxValues(users.length)
        .setOptions(users.map(x => {return {value: x.user._id, label: x.user.display_name}}));

    const addUserButton = new ButtonBuilder()
        .setCustomId(`group-useradd-${this._id}`)
        .setLabel("Add User")
        .setStyle(ButtonStyle.Primary);

    const setGameButton = new ButtonBuilder()
        .setCustomId(`group-game-${this._id}`)
        .setLabel("Set Game")
        .setStyle(ButtonStyle.Secondary);

    const setDateButton = new ButtonBuilder()
        .setCustomId(`group-date-${this._id}`)
        .setLabel("Set Start Time")
        .setStyle(ButtonStyle.Secondary);

    return [
        new ActionRowBuilder().setComponents(removeUserSelect),
        new ActionRowBuilder().setComponents(addUserButton, setGameButton, setDateButton),
    ];
}

schema.methods.updateMessage = async function() {
    const channel = await global.client.modbot.channels.fetch(config.discord.modbot.channels.group);
    const message = await channel.messages.fetch(this.message);
    message.edit({embeds: [await this.embed()]}).catch(console.error);
}

module.exports = mongoose.model("Group", schema);
