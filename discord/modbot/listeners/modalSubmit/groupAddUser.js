const { ModalSubmitInteraction } = require("discord.js");
const mongoose = require("mongoose");

const utils = require("../../../../utils/");

const {groupInteraction} = require("../../commands/parseGroupContext");

const listener = {
    name: 'groupAddUser',
    /**
     * Verifies a button press should be sent to this listener
     * @param {ModalSubmitInteraction} interaction 
     */
    verify(interaction) {
        return interaction.customId.startsWith("group-useradd-");
    },
    /**
     * Listener for a button press
     * @param {ModalSubmitInteraction} interaction 
     */
    async listener (interaction) {
        const groupId = interaction.customId.split("-")[2];
        try {
            const group = await utils.Schemas.Group.findById(new mongoose.Types.ObjectId(groupId))
                    .populate("posted_by")
                    .populate("game");
            if (group) {
                const split = interaction.fields.getTextInputValue("users").split("\n");

                let added = 0;

                for (let i = 0; i < split.length; i++) {
                    try {
                        await utils.Schemas.GroupUser.create({
                            group: group,
                            user: await utils.Twitch.getUserByName(split[i], true),
                        });
                        added++;
                    } catch(e) {
                        console.error(e);
                    }
                }

                group.updateMessage().catch(console.error);

                if (groupInteraction.hasOwnProperty(groupId)) {
                    groupInteraction[groupId].editReply({
                        embeds: [await group.embed()],
                        components: await group.editComponents(),
                    }).catch(console.error);
                }

                interaction.success(`Successfully added ${added} user${added === 1 ? "" : "s"}!`);
            }
        } catch(err) {
            console.error(err);
        }
    }
};

module.exports = listener;
