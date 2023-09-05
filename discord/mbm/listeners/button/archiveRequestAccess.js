const { ButtonInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const mongoose = require("mongoose");

const utils = require("../../../../utils/");

const {requests} = require("../selectMenu/archiveSelectMenu");

const listener = {
    name: 'archiveRequestAccess',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ButtonInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("entry-");
    },
    /**
     * Listener for a button press
     * @param {ButtonInteraction} interaction 
     */
    async listener (interaction) {
        const [,type,id] = interaction.component.customId.split("-");
        let mongoId;

        try {
            mongoId = new mongoose.Types.ObjectId(id);
        } catch(err) {
            return interaction.error("Unable to retrieve archive entry!");
        }

        const request = requests.find(x => String(x.entry._id) === id);
        if (type === "request") {
            if (!request) return interaction.error("Unable to retrieve archive entry!");
    
            const embed = new EmbedBuilder()
                .setColor(0x772ce8)
                .setTitle("Archive entry request")
                .setDescription(`<@${request.user.id}> has requested access to archive ID \`${id}\``);
    
            const approve = new ButtonBuilder()
                .setCustomId(`entry-approve-${id}`)
                .setLabel("Approve")
                .setStyle(ButtonStyle.Success);
            const deny = new ButtonBuilder()
                .setCustomId(`entry-deny-${id}`)
                .setLabel("Deny")
                .setStyle(ButtonStyle.Danger);
    
            const row = new ActionRowBuilder()
                .setComponents(approve, deny);
    
            utils.Discord.channels.archiveRequest.send({embeds: [embed, await request.entry.embed()], components: [row]}).then(message => {
                interaction.success("**Request sent!**\nYou will be informed once the request is approved or denied.");
            }, console.error);
        } else if (type === "approve" || type === "deny") {
            const entry = await utils.Schemas.Archive.findById(mongoId);

            if (type === "approve") {
                entry.tlmsAllowed = true;
                await entry.save();
            }

            setTimeout(() => {
                interaction.message.delete().catch(console.error);
            }, 10000);

            const sendSuccess = () => {
                interaction.success(`Request successfully ${type === "approve" ? "approved" : "denied"}!\n*The request message will be deleted in 10 seconds.*`);
            }

            const request = requests.find(x => String(x.entry._id) === id);
            if (request) {
                try {
                    if (type === "approve") {
                        await request.interaction.followUp({content: `The request to view archive \`${entry._id}\` was approved!`, embeds: [await entry.embed()], ephemeral: true});
                    } else {
                        await request.interaction.followUp({content: `The request to view archive \`${entry._id}\` for \`${entry.offense}\` was denied!`, ephemeral: true});
                    }
                    return sendSuccess();
                } catch(err) {}
    
                try {
                    if (type === "approve") {
                        await request.interaction.followUp({content: `The request to view archive \`${entry._id}\` was approved!`, embeds: [await entry.embed()]});
                    } else {
                        await request.user.send(`The request to view archive \`${entry._id}\` for \`${entry.offense}\` was denied!`);
                    }
                    return sendSuccess();
                } catch(err) {}
            }
            interaction.success(`The request was ${type === "approve" ? "approved" : "denied"}, however we were unable to notify the user. Please do so manually.\n*The request message will be deleted in 10 seconds.*`);
        } else {
            interaction.error("Unknown button type!");
        }
    }
};

module.exports = listener;
