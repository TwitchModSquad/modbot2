const { StringSelectMenuInteraction, EmbedBuilder, codeBlock, cleanCodeBlockContent } = require("discord.js");
const mongoose = require("mongoose");

const {groupInteraction} = require("../../commands/parseGroupContext");

const utils = require("../../../../utils/");

const listener = {
    name: 'groupSelect',
    /**
     * Verifies a select menu interaction should be sent to this listener
     * @param {StringSelectMenuInteraction} interaction 
     */
    verify(interaction) {
        return interaction.component.customId.startsWith("group-userdel-");
    },
    /**
     * Listener for a select menu interaction
     * @param {StringSelectMenuInteraction} interaction 
     */
    async listener (interaction) {
        const groupId = interaction.component.customId.split("-")[2];
        try {
            await utils.Schemas.GroupUser.deleteMany({
                group: new mongoose.Types.ObjectId(groupId),
                user: {
                    $in: interaction.values,
                },
            });

            const group = await utils.Schemas.Group.findById(new mongoose.Types.ObjectId(groupId))
                    .populate("posted_by")
                    .populate("game");
            if (group) {
                group.updateMessage().catch(console.error);

                if (groupInteraction.hasOwnProperty(groupId)) {
                    groupInteraction[groupId].editReply({
                        embeds: [await group.embed()],
                        components: await group.editComponents(),
                    }).catch(console.error);
                }

                interaction.success("Successfully removed " + interaction.values.length + " user(s)!");
            }
        } catch(err) {
            console.error(err);
        }
    }
};

module.exports = listener;
