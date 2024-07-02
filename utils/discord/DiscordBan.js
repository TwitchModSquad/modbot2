const { EmbedBuilder, codeBlock, cleanCodeBlockContent, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const mongoose = require("mongoose");

const banSchema = new mongoose.Schema({
    guild: {
        type: String,
        ref: "DiscordGuild",
        required: true,
        index: true,
    },
    user: {
        type: String,
        ref: "DiscordUser",
        required: true,
        index: true,
    },
    executor: {
        type: String,
        ref: "DiscordUser",
        default: null,
        index: true,
    },
    reason: {
        type: String,
        default: null,
    },
    time_start: {
        type: Date,
        default: Date.now,
    },
    time_end: {
        type: Date,
        default: null,
    }
});

banSchema.methods.message = async function(ephemeral = false) {
    const crossbanButton = new ButtonBuilder()
        .setCustomId("cb-d-" + this.user._id)
        .setStyle(ButtonStyle.Danger)
        .setLabel("Crossban");
    
    return {
        embeds: [await this.embed()],
        components: [
            new ActionRowBuilder()
                .setComponents(crossbanButton),
        ],
        ephemeral,
    };
}

banSchema.methods.embed = async function() {
    await this.populate(["guild","user","executor"]);

    const embed = new EmbedBuilder()
            .setTitle("Discord user has been banned!")
            .setDescription(`User <@${this.user._id}> (${this.user.globalName}) was banned from guild \`${this.guild.name}\``)
            .setThumbnail(this.user.avatarURL())
            .setAuthor({iconURL: this.guild.iconURL(), name: this.guild.name})
            .setColor(0xad2117);

    if (this.reason) {
        embed.addFields({
            name: "Reason",
            value: codeBlock(cleanCodeBlockContent(this.reason)),
            inline: true,
        })
    }

    if (this.executor?._id) {
        embed.addFields({
            name: "Executor",
            value: `<@${this.executor._id}>`,
            inline: true,
        })
    }

    return embed;
}

module.exports = mongoose.model("DiscordBan", banSchema);
