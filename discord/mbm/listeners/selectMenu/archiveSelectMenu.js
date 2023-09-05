const { StringSelectMenuInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, User } = require("discord.js");

const utils = require("../../../../utils/");
const config = require("../../../../config.json");
const mongoose = require("mongoose");

const listener = {
    name: 'archiveSelectMenu',
    /**
     * Stores archive requests for later use
     * @type {{entry:any,interaction:StringSelectMenuInteraction,user:User}[]}
     */
    requests: [],
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId === "entry";
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const id = interaction.values[0];

        try {
            const entry = await utils.Schemas.Archive.findById(new mongoose.Types.ObjectId(id));
            if (entry) {
                if (interaction.guild.id !== config.discord.guilds.modsquad || entry.tlmsAllowed) {
                    const embed = await entry.embed();
                    interaction.reply({embeds: [embed], ephemeral: true});
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(0x772ce8)
                        .setTitle("Request archive entry access")
                        .setDescription("This entry currently isn't allowed to be accessed outside of the main TMS guild.\n" +
                                "To request access, please click the `Request Access` button below.");

                    const button = new ButtonBuilder()
                        .setCustomId(`entry-request-${entry._id}`)
                        .setLabel("Request Access")
                        .setStyle(ButtonStyle.Primary);
                    
                    interaction.reply({embeds: [embed], components: [new ActionRowBuilder().setComponents(button)], ephemeral: true});
                    listener.requests.push({entry: entry, interaction: interaction, user: interaction.user});
                }
            } else {
                interaction.error("Archive entry not found!");
            }
        } catch(err) {
            console.error(err);
            interaction.error("Archive entry not found!");
        }
    }
};

module.exports = listener;
